import GObject from "gi://GObject";
import Adw from "gi://Adw";
import ThemeSelector from "../troll/src/widgets/ThemeSelector.js";

import Shortcuts from "./Shortcuts.js";
// eslint-disable-next-line no-unused-vars
import { WebView } from "./WebView.js";
import { Sidebar } from "./Sidebar.js";

import Template from "./window.blp" with { type: "uri" };

export const ManualsWindow = GObject.registerClass(
  {
    GTypeName: "ManualsWindow",
    Template,
    InternalChildren: [
      "webview",
      "button_back",
      "button_forward",
      "split_view",
    ],
  },
  class ManualsWindow extends Adw.Window {
    constructor({ application, params = {} }) {
      super(params);
      this.application = application;
      this.#createSidebar();
      this.#addThemeSelector();
      this.#connectWebView();
      this.#connectButtons();
      Shortcuts({
        application: this.application,
        window: this,
        onGoForward: this.onGoForward,
        onGoBack: this.onGoBack,
        onZoomIn: this.onZoomIn,
        onZoomOut: this.onZoomOut,
        onResetZoom: this.onResetZoom,
        onFocusGlobalSearch: this.onFocusGlobalSearch,
      });
    }

    #createSidebar() {
      this._sidebar = new Sidebar({ webview: this._webview });
      this._split_view.sidebar = this._sidebar;
    }

    #addThemeSelector() {
      const button_menu = this._sidebar._button_menu;
      const popover = button_menu.get_popover();
      popover.add_child(new ThemeSelector(), "themeswitcher");
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
  },
);
