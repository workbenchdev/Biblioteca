import Gio from "gi://Gio";
import Adw from "gi://Adw";
import GObject from "gi://GObject";

import { BrowseView } from "./BrowseView.js";
import { SearchView } from "./SearchView.js";
import { DocumentationPage } from "./DocumentationPage.js";

import Template from "./Sidebar.blp" with { type: "uri" };

export const Sidebar = GObject.registerClass(
  {
    GTypeName: "Sidebar",
    Template,
    InternalChildren: ["stack", "search_entry", "status_page", "button_menu"],
  },
  class Sidebar extends Adw.NavigationPage {
    constructor({ webview, ...params }) {
      super(params);
      this._webview = webview;
      this.uri_to_tree_path = {};
      this.#initializeSidebar();
      this.#connectWebView();
      this.#connectSearchEntry();
    }

    #initializeSidebar() {
      this._browse_view = new BrowseView({
        webview: this._webview,
      });
      this._browse_view.connect("browse-view-loaded", () => {
        this.flattened_model = this.#flattenModel(this._browse_view.root_model);
        this._search_view = new SearchView({
          flattened_model: this.flattened_model,
        });
        this._search_view.connect("search-view-selection-changed", (_, uri) => {
          const path = this.uri_to_tree_path[uri];
          if (!path) return;
          this._browse_view.selectItem(path);
        });
        this._browse_view.selection_model.selected = 12;
        this._stack.add_child(this._search_view);
      });
      this._stack.add_child(this._browse_view);
      this._stack.visible_child = this._browse_view;
    }

    #connectWebView() {
      this._webview.connect("notify::uri", () => {
        // Hack
        this._webview.visible = false;
        this._webview.visible = true;

        const selected_item =
          this._browse_view.selection_model.selected_item.item;
        if (this._webview.uri !== selected_item.uri) {
          const path = this.uri_to_tree_path[this._webview.uri];
          if (!path) return;
          this._browse_view.selectItem(path);
        }
      });
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
          this._stack.visible_child = this._search_view;
          this._search_view.search_term = this._search_entry.text;
          if (!this._search_view.selection_model.n_items)
            this._stack.visible_child = this._status_page;
        } else {
          this._stack.visible_child = this._browse_view;
        }
      });
    }
  },
);
