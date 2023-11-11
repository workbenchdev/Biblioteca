import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Shortcuts from "./Shortcuts.js";
import Sidebar from "./sidebar/Sidebar.js";
import "./WebView.js";

import Template from "./window.blp" with { type: "uri" };

import "./icons/dock-left-symbolic.svg";

class Window extends Adw.ApplicationWindow {
  constructor({ application, params = {} }) {
    super(params);
    this.application = application;

    if (__DEV__) {
      this.add_css_class("devel");
    }

    this.#createSidebar();
    this.#setupBreakpoint();
    this.#connectWebView();
    this.#connectButtons();

    this._toolbar_breakpoint.connect("apply", () => {
      this.#moveNavigationDown();
    });
    this._toolbar_breakpoint.connect("unapply", () => {
      this.#moveNavigationUp();
    });

    Shortcuts(
      this.application,
      this,
      this.onGoForward,
      this.onGoBack,
      this.onZoomIn,
      this.onZoomOut,
      this.onResetZoom,
      this.onFocusGlobalSearch,
    );
  }

  open() {
    // The window is already open
    const mapped = this.get_mapped();
    this.present();
    this.onFocusGlobalSearch();
    if (!mapped) {
      this._sidebar.resetSidebar();
    }
  }

  onGoForward = () => {
    this._webview.go_forward();
  };
  onGoBack = () => {
    this._webview.go_back();
  };

  onZoomIn = () => {
    if (this._webview.zoom_level < 2) this._webview.zoom_level += 0.25;
  };

  onZoomOut = () => {
    if (this._webview.zoom_level > 0.5) this._webview.zoom_level -= 0.25;
  };

  onResetZoom = () => {
    this._webview.zoom_level = 1;
  };

  onFocusGlobalSearch = () => {
    this._sidebar._search_entry.grab_focus();
    this._sidebar._search_entry.select_region(0, -1);
  };

  #moveNavigationDown() {
    this._content_header_bar.remove(this._box_navigation);
    this._bottom_toolbar.append(this._box_navigation);
  }

  #moveNavigationUp() {
    this._bottom_toolbar.remove(this._box_navigation);
    this._content_header_bar.pack_start(this._box_navigation);
  }

  #createSidebar() {
    this._sidebar = new Sidebar({ webview: this._webview });
    this._split_view.sidebar = this._sidebar;
  }

  #setupBreakpoint() {
    this._window_breakpoint.add_setters(
      [this._sidebar.browse_view, this._sidebar.search_view],
      ["width-request", "width-request"],
      [300, 300],
    );
  }

  #connectWebView() {
    this._webview.connect("load-changed", () => {
      this.#updateButtons();
    });

    this._webview.get_back_forward_list().connect("changed", () => {
      this.#updateButtons();
    });
  }

  #updateButtons() {
    this._button_back.sensitive = this._webview.can_go_back();
    this._button_forward.sensitive = this._webview.can_go_forward();
  }

  #connectButtons() {
    this._button_back.connect("clicked", () => {
      this._webview.go_back();
    });

    this._button_forward.connect("clicked", () => {
      this._webview.go_forward();
    });
  }
}

export default GObject.registerClass(
  {
    GTypeName: "Window",
    Template,
    InternalChildren: [
      "window_breakpoint",
      "split_view",
      "toolbar_breakpoint",
      "content_header_bar",
      "box_navigation",
      "button_back",
      "button_forward",
      "bottom_toolbar",
      "webview",
    ],
  },
  Window,
);
