import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Shortcuts from "./Shortcuts.js";
import Sidebar from "./sidebar/Sidebar.js";
import WebView from "./WebView.js";

import Template from "./window.blp" with { type: "uri" };

import "./icons/sidebar-show-symbolic.svg";

class Window extends Adw.ApplicationWindow {
  constructor({ application, params = {} }) {
    super(params);
    this.application = application;

    if (__DEV__) {
      this.add_css_class("devel");
    }
    this.#createSidebar();
    this.newTab();
    this.newTab();
    this._webview = this._tab_view.selected_page.child;
    this._sidebar.browse_view.webview = this._webview;
    this._tab_view.connect("notify::selected-page", () => {
      this._webview = this._tab_view.selected_page.child;
      this.title = this._webview.title;
      this._sidebar.browse_view.webview = this._webview;
    });
    this.#setupBreakpoint();
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

  newTab() {
    const webview = new WebView({ sidebar: this._sidebar });
    const tab_page = this._tab_view.append(webview);
    webview.bind_property(
      "title",
      tab_page,
      "title",
      GObject.BindingFlags.SYNC_CREATE,
    );
    webview.bind_property(
      "title",
      this,
      "title",
      GObject.BindingFlags.SYNC_CREATE,
    );
  }

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

  #connectWebView(webview) {
    webview.connect("load-changed", () => {
      this.#updateButtons();
    });

    webview.get_back_forward_list().connect("changed", () => {
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
      "tab_view",
    ],
  },
  Window,
);
