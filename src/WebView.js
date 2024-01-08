import WebKit from "gi://WebKit";
import GObject from "gi://GObject";
import GLib from "gi://GLib";

import Template from "./WebView.blp" with { type: "uri" };

class WebView extends WebKit.WebView {
  constructor({ uri, sidebar, ...params }) {
    super(params);
    this._sidebar = sidebar;
    this._browse_view = this._sidebar.browse_view;
    this.connect("notify::uri", this.#onNotifyUri);
    this.initial_load = true;
    this.load_uri(uri);

    this.#disablePageSidebar();
    this.#injectOverlayScript();

    this.get_back_forward_list().connect("changed", () => {
      this.activate_action("win.update-buttons", null);
    });
    this.connect("decide-policy", this.#onDecidePolicy);
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
    var div = document.createElement('div');
    body.insertBefore(div, body.firstChild);
    window.addEventListener('scroll', on_scroll);

    function on_scroll() {
        if (window.scrollY > 0) {
            div.classList.add("overshoot-overlay");
        } else {
            div.classList.remove("overshoot-overlay");
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
    .overshoot-overlay {
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

    @media (prefers-color-scheme: dark) {
      .overshoot-overlay {
          box-shadow: inset 0 1px rgba(0, 0, 0, 0.36);
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.36), transparent 4px);
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

  #onNotifyUri = () => {
    // Hack
    this.visible = false;
    this.visible = true;

    if (!this.uri) return;

    const scheme = GLib.Uri.peek_scheme(this.uri);
    this.is_online = ["http", "https"].includes(scheme);

    // When the WebView is created, BrowseView has not been updated with the new WebView yet
    // Therefore dont sync the sidebar
    if (this.initial_load) {
      this.initial_load = false;
      return;
    }

    const selected_item = this._browse_view.selection_model.selected_item;
    if (selected_item === null || this.uri !== selected_item.item.uri) {
      const path = this._sidebar.uri_to_tree_path[this.uri];
      if (!path) return;
      this._browse_view.selectItem(path);
    }
  };

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
        this.activate_action("app.new-tab", new GLib.Variant("s", uri));
        return true;
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
