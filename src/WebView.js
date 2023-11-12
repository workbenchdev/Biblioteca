import WebKit from "gi://WebKit";
import GObject from "gi://GObject";

import Template from "./WebView.blp" with { type: "uri" };

class WebView extends WebKit.WebView {
  constructor({ sidebar, params = {} }) {
    super(params);
    this._sidebar = sidebar;
    this._browse_view = this._sidebar.browse_view;
    this.#disablePageSidebar();
    this.#connectWebView();
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

  #connectWebView() {
    this.connect("notify::uri", () => {
      // Hack
      this.visible = false;
      this.visible = true;

      const selected_item =
        this._browse_view.selection_model.selected_item.item;
      if (this.uri !== selected_item.uri) {
        const path = this._sidebar.uri_to_tree_path[this.uri];
        if (!path) return;
        this._browse_view.selectItem(path);
      }
    });
  }
}

export default GObject.registerClass(
  {
    GTypeName: "WebView",
    Template,
  },
  WebView,
);
