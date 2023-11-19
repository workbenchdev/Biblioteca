import Gio from "gi://Gio";
import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Shortcuts from "./Shortcuts.js";
import Sidebar from "./sidebar/Sidebar.js";
import WebView from "./WebView.js";

import Template from "./window.blp" with { type: "uri" };

import "./icons/sidebar-show-symbolic.svg";
import "./icons/tab-new-symbolic.svg";

class Window extends Adw.ApplicationWindow {
  constructor(params = {}) {
    super(params);

    if (__DEV__) {
      this.add_css_class("devel");
    }
    this.#createSidebar();
    this.newTab();

    const update_buttons_action = new Gio.SimpleAction({
      name: "update-buttons",
    });
    update_buttons_action.connect("activate", () => this.#updateButtons());
    this.add_action(update_buttons_action);

    this._tab_button.connect("clicked", () => {
      this._tab_overview.open = !this._tab_overview.open;
    });

    this._tab_overview.connect("create-tab", () => this.newTab());

    this._tab_view.connect("notify::selected-page", this.#updateWebView);
    this.#setupBreakpoint();

    this._button_back.connect("clicked", this.goBack);
    this._button_forward.connect("clicked", this.goForward);

    this.bind_property_full(
      "title",
      this._content_page,
      "title",
      GObject.BindingFlags.SYNC_CREATE,
      (binding, from_value) =>
        from_value ? [true, from_value] : [false, null],
      null,
    );

    this._toolbar_breakpoint.connect("apply", this.#moveNavigationDown);
    this._toolbar_breakpoint.connect("unapply", this.#moveNavigationUp);

    Shortcuts(
      this,
      this.newTab,
      this.closeTab,
      this.goForward,
      this.goBack,
      this.zoomIn,
      this.zoomOut,
      this.resetZoom,
      this.focusGlobalSearch,
    );
  }

  open() {
    // The window is already open
    const mapped = this.get_mapped();
    this.present();
    this.focusGlobalSearch();
    if (!mapped) {
      this._sidebar.resetSidebar();
    }
  }

  goForward = () => {
    this._webview.go_forward();
  };

  goBack = () => {
    this._webview.go_back();
  };

  zoomIn = () => {
    if (this._webview.zoom_level < 2) this._webview.zoom_level += 0.25;
  };

  zoomOut = () => {
    if (this._webview.zoom_level > 0.5) this._webview.zoom_level -= 0.25;
  };

  resetZoom = () => {
    this._webview.zoom_level = 1;
  };

  focusGlobalSearch = () => {
    this._sidebar._search_entry.grab_focus();
    this._sidebar._search_entry.select_region(0, -1);
  };

  newTab = (uri = "file:///app/share/doc/gtk4/index.html") => {
    this._webview = new WebView({
      uri: uri,
      sidebar: this._sidebar,
    });

    const tab_page = this._tab_view.append(this._webview);
    this._tab_view.selected_page = tab_page;
    this.#updateWebView();

    this._webview.bind_property(
      "title",
      tab_page,
      "title",
      GObject.BindingFlags.SYNC_CREATE,
    );

    this._webview.bind_property(
      "title",
      this,
      "title",
      GObject.BindingFlags.SYNC_CREATE,
    );
    return tab_page;
  };

  closeTab = () => {
    if (this._tab_view.n_pages === 1) {
      this.close();
      return;
    }
    this._tab_view.close_page(this._tab_view.selected_page);
  };

  #updateWebView = () => {
    this._webview = this._tab_view.selected_page.child;
    this.#updateButtons();
    this.title = this._webview.title;
    this._sidebar.browse_view.webview = this._webview;
  };

  #moveNavigationDown = () => {
    this._content_header_bar.remove(this._box_navigation);
    this._bottom_toolbar.pack_start(this._box_navigation);
  };

  #moveNavigationUp = () => {
    this._bottom_toolbar.remove(this._box_navigation);
    this._content_header_bar.pack_start(this._box_navigation);
  };

  #createSidebar() {
    this._sidebar = new Sidebar();
    this._split_view.sidebar = this._sidebar;
  }

  #setupBreakpoint() {
    this._window_breakpoint.add_setters(
      [this._sidebar.browse_view, this._sidebar.search_view],
      ["width-request", "width-request"],
      [300, 300],
    );
  }

  #updateButtons = () => {
    this._button_back.sensitive = this._webview.can_go_back();
    this._button_forward.sensitive = this._webview.can_go_forward();
  };
}

export default GObject.registerClass(
  {
    GTypeName: "Window",
    Template,
    InternalChildren: [
      "window_breakpoint",
      "split_view",
      "content_page",
      "toolbar_breakpoint",
      "content_header_bar",
      "box_navigation",
      "button_back",
      "button_forward",
      "tab_button",
      "button_new_tab",
      "bottom_toolbar",
      "tab_overview",
      "tab_view",
    ],
  },
  Window,
);
