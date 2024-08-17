import WebKit from "gi://WebKit";
import GObject from "gi://GObject";
import GLib from "gi://GLib";

import Template from "./WebView.blp" with { type: "uri" };

class WebView extends WebKit.WebView {
  constructor({ uri, sidebar, ...params }) {
    super(params);
    this._sidebar = sidebar;
    this._browse_view = this._sidebar.browse_view;
    this.connect("notify::uri", () => this.#updateIsOnline(this.uri));
    this.load_uri(uri);

    this.#disablePageSidebar();
    this.#injectOverlayScript();

    this.get_back_forward_list().connect("changed", () => {
      this.activate_action("win.update-buttons", null);
    });
    this.connect("decide-policy", this.#onDecidePolicy);
    this.connect("context-menu", this.#onContextMenu);
  }

  get is_online() {
    if (this._is_online === undefined) this._is_online = false;
    return this._is_online;
  }

  set is_online(value) {
    if (this._is_online === value) return;
    this._is_online = value;
    this.notify("is-online");
  }

  load_uri(uri) {
    this.#updateIsOnline(uri);
    super.load_uri(uri);
  }

  #disablePageSidebar() {
    const stylesheet = new WebKit.UserStyleSheet(
      ".devhelp-hidden { display: none; }", // source
      WebKit.UserContentInjectedFrames.ALL_FRAMES, // injected_frames
      WebKit.UserStyleLevel.USER, // level
      null,
      null,
    );
    this.user_content_manager.add_style_sheet(stylesheet);
  }

  #injectOverlayScript() {
    // https://gitlab.com/news-flash/news_flash_gtk/-/blob/6c080e2b0cf6def97fc877f3cb817ba1e277f2f5/data/resources/article_view/overshoot_overlay.js
    const source = `
    var body = document.body;
    var divTop = document.createElement('div');
    body.insertBefore(divTop, body.firstChild);
    var divBottom = document.createElement('div');
    body.insertAdjacentElement('beforeend', divBottom);

    window.addEventListener('scroll', on_scroll);

    function on_scroll() {
      if (window.scrollY > 0) {
          divTop.classList.add("overshoot-overlay-top");
      } else {
          divTop.classList.remove("overshoot-overlay-top");
      }

      var limit = Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight);
      var max_scroll = limit - window.innerHeight;

      if (window.scrollY >= max_scroll) {
          divBottom.classList.remove("overshoot-overlay-bottom");
      } else {
          divBottom.classList.add("overshoot-overlay-bottom");
      }
    }
    `;
    const script = new WebKit.UserScript(
      source,
      WebKit.UserContentInjectedFrames.ALL_FRAMES, // injected_frames
      WebKit.UserScriptInjectionTime.END, // level
      null,
      null,
    );
    this.user_content_manager.add_script(script);
    this.#injectOverlayStyles();
  }

  #injectOverlayStyles() {
    // https://gitlab.com/news-flash/news_flash_gtk/-/blob/6c080e2b0cf6def97fc877f3cb817ba1e277f2f5/data/resources/article_view/style.css#L22-33
    // https://gitlab.com/news-flash/news_flash_gtk/-/blob/6c080e2b0cf6def97fc877f3cb817ba1e277f2f5/data/resources/article_view/style.css#L424-428
    const styles = `
    .overshoot-overlay-top {
      height: 100%;
      width: 100%;
      position: fixed;
      z-index: 1;
      left: 0;
      top: 0;
      box-shadow: inset 0 1px rgba(0, 0, 0, 0.07);
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.07), transparent 4px);
      overflow-x: hidden;
      pointer-events: none;
    }
    .overshoot-overlay-bottom {
      height: 100%;
      width: 100%;
      position: fixed;
      z-index: 2;
      left: 0;
      bottom: 0;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.07), transparent 4px);
      overflow-x: hidden;
      pointer-events: none;
    }


    @media (prefers-color-scheme: dark) {
      .overshoot-overlay-top {
          box-shadow: inset 0 1px rgba(0, 0, 0, 0.36);
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.36), transparent 4px);
      }
      .overshoot-overlay-bottom {
        box-shadow: inset 0 -1px rgba(0, 0, 0, 0.36);
        background: linear-gradient(to top, rgba(0, 0, 0, 0.36), transparent 4px);
      }
    }
  `;
    const stylesheet = new WebKit.UserStyleSheet(
      styles, // source
      WebKit.UserContentInjectedFrames.ALL_FRAMES, // injected_frames
      WebKit.UserStyleLevel.USER, // level
      null,
      null,
    );
    this.user_content_manager.add_style_sheet(stylesheet);
  }

  #updateIsOnline(uri) {
    if (!uri) {
      this.is_online = false;
    } else {
      const scheme = GLib.Uri.peek_scheme(uri);
      this.is_online = ["http", "https"].includes(scheme);
    }
  }

  #onDecidePolicy = (_self, decision, decision_type) => {
    console.debug(
      "decide-policy",
      getEnum(WebKit.PolicyDecisionType, decision_type),
    );

    if (decision_type === WebKit.PolicyDecisionType.NAVIGATION_ACTION) {
      const navigation_action = decision.get_navigation_action();
      const mouse_button = navigation_action.get_mouse_button();
      const uri = navigation_action.get_request().get_uri();
      console.debug(
        "navigation",
        getEnum(WebKit.NavigationType, navigation_action.get_navigation_type()),
        uri,
      );

      if (mouse_button === 2) {
        decision.ignore();
        this.activate_action("win.new-tab", new GLib.Variant("s", uri));
        return true;
      }
    }
    return false;
  };

  #onContextMenu = (webView, contextMenu, event, hitTestResult) => {
    const itemsToRemove = [
      WebKit.ContextMenuAction.STOP,
      WebKit.ContextMenuAction.RELOAD,
    ];

    const items = contextMenu.get_items();
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (itemsToRemove.includes(item.get_stock_action())) {
        contextMenu.remove(item);
      }
    }

    return false;
  };
}

export function getEnum(enums, idx) {
  return Object.keys(enums).find((key) => {
    return enums[key] === idx;
  });
}

export default GObject.registerClass(
  {
    GTypeName: "WebView",
    Template,
    Properties: {
      "is-online": GObject.ParamSpec.boolean(
        "is-online",
        "is-online",
        "True if the webview is online",
        GObject.ParamFlags.READWRITE,
        false,
      ),
    },
  },
  WebView,
);
