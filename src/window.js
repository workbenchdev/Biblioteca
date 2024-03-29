import Adw from "gi://Adw";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import WebKit from "gi://WebKit";
import Shortcuts from "./Shortcuts.js";
import Sidebar from "./sidebar/Sidebar.js";
import WebView from "./WebView.js";

import Template from "./window.blp" with { type: "uri" };

import "./icons/sidebar-show-symbolic.svg";
import "./icons/tab-new-symbolic.svg";
import "./icons/view-grid-symbolic.svg";
import "./icons/loupe-large-symbolic.svg";

class Window extends Adw.ApplicationWindow {
  constructor(params = {}) {
    super(params);

    if (__DEV__) {
      this.add_css_class("devel");
    }
    this.#createSidebar();
    this.newTab();

    const win_group = new Gio.SimpleActionGroup();
    this.insert_action_group("win", win_group);

    const action_entries = [
      {
        name: "new-tab",
        activate: (action, parameter) => this.newTab(parameter.unpack()),
        parameter_type: "s",
      },
      {
        name: "close-tab",
        activate: () => this.closeTab(),
      },
      {
        name: "navigation-forward",
        activate: () => this.goForward(),
      },
      {
        name: "navigation-back",
        activate: () => this.goBack(),
      },
      {
        name: "zoom-in",
        activate: () => this.zoomIn(),
      },
      {
        name: "zoom-out",
        activate: () => this.zoomOut(),
      },
      {
        name: "reset-zoom",
        activate: () => this.resetZoom(),
      },
      {
        name: "global-search",
        activate: () => this.focusGlobalSearch(),
      },
      {
        name: "focus-urlbar",
        activate: () => this.focusURLBar(),
      },
      {
        name: "toggle-sidebar",
        activate: () => this.toggleSidebar(),
      },
      {
        name: "toggle-overview",
        activate: () => this.toggleOverview(),
      },
      {
        name: "update-buttons",
        activate: () => this.#updateButtons(),
      },
    ];

    win_group.add_action_entries(action_entries);

    this._tab_button.connect("clicked", () => {
      this._tab_overview.open = !this._tab_overview.open;
    });

    this._tab_overview.connect("create-tab", () => this.newTab());

    this._tab_view.connect("notify::selected-page", this.#updateWebView);
    this.#setupBreakpoint();

    this._button_back.connect("clicked", this.goBack);
    this._button_forward.connect("clicked", this.goForward);

    this._toolbar_breakpoint.connect("apply", this.#moveNavigationDown);
    this._toolbar_breakpoint.connect("unapply", this.#moveNavigationUp);

    this._search_bar.connect_entry(this._search_entry);
    this._search_bar.connect("notify::search-mode-enabled", () => {
      if (!this._search_bar.search_mode_enabled) this.#closeFind();
    });

    this._close_find_button.connect("clicked", () => {
      this.#closeFind();
    });
    this._url_bar.connect("activate", this.#onActivateURLBar);

    Shortcuts(this);
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
    this._tab_overview.open = false;
    this._split_view.show_sidebar = true;
    this._sidebar._search_entry.grab_focus();
    this._sidebar._search_entry.select_region(0, -1);
  };

  focusURLBar = () => {
    if (this._webview.is_online) this._url_bar.grab_focus();
  };

  newTab = (uri = "file:///app/share/doc/gtk4/index.html") => {
    this._webview = new WebView({
      uri: uri,
      sidebar: this._sidebar,
    });

    const tab_page = this._tab_view.append(this._webview);
    this._tab_view.selected_page = tab_page;
    this.#updateWebView();

    this._webview.connect("notify::is-online", this.#onWebViewOnline);

    this._webview.connect("notify::estimated-load-progress", () => {
      this._load_bar.fraction = this._webview.estimated_load_progress;
      if (this._load_bar.fraction === 1) {
        // Reset the load bar after a short delay
        setTimeout(() => {
          this._load_bar.fraction = 0;
        }, 500);
      }
    });

    this._webview.connect("load-changed", (self, load_event) => {
      switch (load_event) {
        case WebKit.LoadEvent.STARTED:
          tab_page.loading = true;
          break;
        case WebKit.LoadEvent.FINISHED:
          tab_page.loading = false;
          break;
      }
    });

    this._webview.bind_property(
      "title",
      tab_page,
      "title",
      GObject.BindingFlags.SYNC_CREATE,
    );

    this._webview.bind_property_full(
      "title",
      this._content_page,
      "title",
      GObject.BindingFlags.SYNC_CREATE,
      (binding, from_value) =>
        from_value ? [true, from_value] : [false, null],
      null,
    );

    this._webview.bind_property_full(
      "title",
      this,
      "title",
      GObject.BindingFlags.SYNC_CREATE,
      (binding, from_value) =>
        from_value ? [true, `${from_value} - Biblioteca`] : [false, null],
      null,
    );

    this._webview.bind_property(
      "zoom-level",
      this._sidebar.zoom_buttons,
      "zoom-level",
      GObject.BindingFlags.SYNC_CREATE,
    );
    return tab_page;
  };

  closeTab = () => {
    if (this._tab_view.n_pages === 1 && !this._tab_overview.open) {
      this.close();
      return;
    }
    this._tab_view.close_page(this._tab_view.selected_page);
  };

  toggleSidebar = () => {
    if (this._split_view.collapsed && !this._tab_overview.open) {
      this._split_view.show_sidebar = !this._split_view.show_sidebar;
    }
  };

  toggleOverview = () => {
    this._tab_overview.open = !this._tab_overview.open;
  };

  showFind = () => {
    this._search_bar.search_mode_enabled = true;
    this._search_bar.add_css_class("card");
  };

  #closeFind = () => {
    this._search_bar.search_mode_enabled = false;
    setTimeout(() => {
      this._search_bar.remove_css_class("card");
    }, 200);
    // this.#searchHandler.closeSearch();
  };

  #updateWebView = () => {
    if (!this._tab_view.selected_page) return;
    this._webview = this._tab_view.selected_page.child;
    this._sidebar.zoom_buttons.zoom_level = this._webview.zoom_level;
    this.#updateButtons();
    if (this._webview.title) {
      this.title = `${this._webview.title} - Biblioteca`;
      this._content_page.title = this._webview.title;
    }
    this.#onWebViewOnline();
    this._sidebar.browse_view.webview = this._webview;
  };

  #onWebViewOnline = () => {
    if (this._webview.is_online) {
      this._sidebar.browse_view.unselectSelection();

      this._binding_uri = this._webview.bind_property(
        "uri",
        this._url_bar.buffer,
        "text",
        GObject.BindingFlags.SYNC_CREATE,
      );
      this._header_bar_stack.set_visible_child_name("url_bar");
      return;
    }
    if (this._binding_uri) this._binding_uri.unbind();
    this._header_bar_stack.set_visible_child_name("title");
  };

  #moveNavigationDown = () => {
    this._content_header_bar.remove(this._box_navigation);
    this._bottom_toolbar.pack_start(this._box_navigation);
  };

  #moveNavigationUp = () => {
    this._bottom_toolbar.remove(this._box_navigation);
    this._content_header_bar.pack_start(this._box_navigation);
  };

  #onActivateURLBar = () => {
    let url = this._url_bar.buffer.text;
    const scheme = GLib.Uri.peek_scheme(url);
    if (!scheme) {
      url = `http://${url}`;
    }
    this._webview.load_uri(url);
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
      "header_bar_stack",
      "url_bar",
      "box_navigation",
      "button_back",
      "button_forward",
      "tab_button",
      "button_new_tab",
      "load_bar",
      "bottom_toolbar",
      "tab_overview",
      "tab_view",
      "search_bar",
      "search_entry",
      "close_find_button",
    ],
  },
  Window,
);
