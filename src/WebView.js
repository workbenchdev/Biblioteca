import WebKit from "gi://WebKit";
import GObject from "gi://GObject";
import GLib from "gi://GLib";

import Template from "./WebView.blp" with { type: "uri" };

class WebView extends WebKit.WebView {
  constructor({ uri, url_bar, sidebar, ...params }) {
    super(params);
    this._url_bar = url_bar;
    this._sidebar = sidebar;
    this._browse_view = this._sidebar.browse_view;
    this.connect("notify::uri", this.#onNotifyUri);
    this.load_uri(uri);

    this.#disablePageSidebar();
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
    const user_content_manager = this.get_user_content_manager();
    const stylesheet = new WebKit.UserStyleSheet(
      ".devhelp-hidden { display: none; }", // source
      WebKit.UserContentInjectedFrames.ALL_FRAMES, // injected_frames
      WebKit.UserStyleLevel.USER, // level
      null,
      null,
    );
    user_content_manager.add_style_sheet(stylesheet);
  }

  #onNotifyUri = () => {
    // Hack
    this.visible = false;
    this.visible = true;

    if (!this.uri) return;

    const scheme = GLib.Uri.peek_scheme(this.uri);
    this.is_online = ["http", "https"].includes(scheme);

    this._url_bar.buffer.text = this.uri;

    const selected_item = this._browse_view.selection_model.selected_item;
    if (selected_item === null || this.uri !== selected_item.item.uri) {
      if (this.is_online) {
        this._browse_view.selection_model.unselect_item(
          this._browse_view.selection_model.selected,
        );
        return;
      }
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
