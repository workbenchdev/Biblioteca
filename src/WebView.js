import WebKit from "gi://WebKit";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import GLib from "gi://GLib";

import Template from "./WebView.blp" with { type: "uri" };

class WebView extends WebKit.WebView {
  constructor({ uri, sidebar, ...params }) {
    super(params);
    this.load_uri(uri);
    this._sidebar = sidebar;
    this._browse_view = this._sidebar.browse_view;
    this.#disablePageSidebar();
    this.connect("notify::uri", this.#onNotifyUri);
    this.get_back_forward_list().connect("changed", () => {
      this.activate_action("win.update-buttons", null);
    });
    this.connect("decide-policy", this.#onDecidePolicy);
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

    const selected_item = this._browse_view.selection_model.selected_item.item;
    if (this.uri !== selected_item.uri) {
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

      const scheme = GLib.Uri.peek_scheme(uri);
      if (scheme !== "file") {
        decision.ignore();
        new Gtk.UriLauncher({ uri })
          .launch(this.get_root(), null)
          .catch(console.error);
        return true;
      } else if (scheme === "file" && mouse_button === 2) {
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
  },
  WebView,
);
