import Gio from "gi://Gio";
import Adw from "gi://Adw";
import GObject from "gi://GObject";

import ThemeSelector from "../../troll/src/widgets/ThemeSelector.js";
import ZoomButtons from "./ZoomButtons.js";

import BrowseView from "./BrowseView.js";
import SearchView from "./SearchView.js";
import DocumentationPage from "./DocumentationPage.js";
import { decode } from "../util.js";

import Template from "./Sidebar.blp" with { type: "uri" };

import "../icons/edit-find-symbolic.svg";

const GTK_INDEX = 19;

class Sidebar extends Adw.NavigationPage {
  constructor(...params) {
    super(params);
    this.uri_to_tree_path = {};
    this.#initializeSidebar();
    this.#connectSearchEntry();
  }

  resetSidebar() {
    this.browse_view.collapseAllRows();
    this.browse_view.selection_model.selected = GTK_INDEX;
    this._search_entry.text = "";
    this._stack.visible_child = this.browse_view;
  }

  focusSearch() {
    this._search_entry.grab_focus();
    this._search_entry.select_region(0, -1);
  }

  #initializeSidebar() {
    this.browse_view = new BrowseView(this);
    this.search_view = new SearchView();
    this.flattened_model = this.#newListStore();

    const index_file = Gio.File.new_for_path(pkg.pkgdatadir).get_child(
      "doc-index.json",
    );
    const content = index_file.load_contents(null);
    const doc_index = JSON.parse(decode(content[1]));

    let idx = 0;
    const promises = [];
    for (const item of doc_index) {
      promises.push(
        this.#buildPage(this.browse_view.root_model, item, [idx++]),
      );
    }

    Promise.all(promises).then(() => {
      this.browse_view.selection_model.selected = GTK_INDEX;
      this.search_view.initializeModel(this.flattened_model);
    });

    this.browse_view.connect("notify::webview", () => {
      const webview_uri = this.browse_view.webview.uri;
      const path = this.uri_to_tree_path[webview_uri];
      if (!path) return;
      this.browse_view.selectItem(path);
    });

    this.search_view.connect("search-view-selection-changed", (_, uri) => {
      const path = this.uri_to_tree_path[uri];
      if (!path) return;
      this.browse_view.selectItem(path);
    });

    this._stack.add_child(this.browse_view);
    this._stack.add_child(this.search_view);
    this._stack.visible_child = this.browse_view;

    // Popover menu theme switcher
    const popover = this._button_menu.get_popover();
    popover.add_child(new ThemeSelector(), "themeswitcher");
    this.zoom_buttons = new ZoomButtons();
    popover.add_child(this.zoom_buttons, "zoom_buttons");
  }

  async #buildPage(parent, item, path) {
    const page = new DocumentationPage({
      name: item.name ?? null,
      tag: item.tag ?? null,
      search_name: item.search_name ?? null,
      uri: item.uri ?? null,
      children: item.children ? this.#newListStore() : null,
    });
    this.uri_to_tree_path[item.uri] = path.slice();
    parent.append(page);
    if (item.search_name) this.flattened_model.append(page);
    if (item.children) {
      let idx = 1;
      for (const child of item.children) {
        await this.#buildPage(page.children, child, [...path, idx++]);
      }
    }
  }

  #newListStore() {
    return Gio.ListStore.new(DocumentationPage);
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
    InternalChildren: ["stack", "search_entry", "button_menu", "status_page"],
  },
  Sidebar,
);
