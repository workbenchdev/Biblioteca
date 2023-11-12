import Gio from "gi://Gio";
import Adw from "gi://Adw";
import GObject from "gi://GObject";

import ThemeSelector from "../../troll/src/widgets/ThemeSelector.js";

import BrowseView from "./BrowseView.js";
import SearchView from "./SearchView.js";
import DocumentationPage from "./DocumentationPage.js";

import Template from "./Sidebar.blp" with { type: "uri" };

class Sidebar extends Adw.NavigationPage {
  constructor({ webview, ...params }) {
    super(params);
    this._webview = webview;
    this.uri_to_tree_path = {};
    this.#initializeSidebar();
    this.#connectSearchEntry();
  }

  resetSidebar() {
    this.browse_view.collapseAllRows();
    this.browse_view.selection_model.selected = 12;
    this._search_entry.text = "";
    this._stack.visible_child = this.browse_view;
  }

  focusSearch() {
    this._search_entry.grab_focus();
    this._search_entry.select_region(0, -1);
  }

  #initializeSidebar() {
    this.browse_view = new BrowseView();
    this.search_view = new SearchView();

    this.browse_view.connect("notify::webview", () => {
      const selected_item = this.browse_view.selection_model.selected_item.item;
      const webview_uri = this.browse_view.webview.uri;
      if (webview_uri !== selected_item.uri) {
        const path = this.uri_to_tree_path[webview_uri];
        if (!path) return;
        this.browse_view.selectItem(path);
      }
    });

    this.search_view.connect("search-view-selection-changed", (_, uri) => {
      const path = this.uri_to_tree_path[uri];
      if (!path) return;
      this.browse_view.selectItem(path);
    });

    this.browse_view.connect("browse-view-loaded", () => {
      this.flattened_model = this.#flattenModel(this.browse_view.root_model);
      this.browse_view.selection_model.selected = 12;
      this.search_view.initializeModel(this.flattened_model);
    });

    this._stack.add_child(this.browse_view);
    this._stack.add_child(this.search_view);
    this._stack.visible_child = this.browse_view;

    // Popover menu theme switcher
    const popover = this._button_menu.get_popover();
    popover.add_child(new ThemeSelector(), "themeswitcher");
  }

  #flattenModel(
    list_store,
    flattened_model = Gio.ListStore.new(DocumentationPage),
    path = [0],
  ) {
    for (const item of list_store) {
      if (item.search_name) flattened_model.append(item);
      if (item.children) {
        this.#flattenModel(item.children, flattened_model, [...path, 1]);
      }
      this.uri_to_tree_path[item.uri] = path.slice();
      path[path.length - 1]++;
    }
    return flattened_model;
  }

  #connectSearchEntry() {
    this._search_entry.connect("search-changed", () => {
      if (this._search_entry.text) {
        this._stack.visible_child = this.search_view;
        this.search_view.search_term = this._search_entry.text;
        if (!this.search_view.selection_model.n_items)
          this._stack.visible_child = this._status_page;
      } else {
        const index = this.browse_view.selection_model.selected;
        this._stack.visible_child = this.browse_view;
        // Make sure the selection doesnt change when switching views
        this.browse_view.selection_model.selected = index;
      }
    });
  }
}

export default GObject.registerClass(
  {
    GTypeName: "Sidebar",
    Template,
    InternalChildren: ["stack", "search_entry", "button_menu"],
  },
  Sidebar,
);
