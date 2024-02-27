import Gdk from "gi://Gdk";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import Webkit from "gi://WebKit";
import DocumentationPage from "./DocumentationPage.js";

import Template from "./BrowseView.blp" with { type: "uri" };

const ITEM_HEIGHT = 38;

class BrowseView extends Gtk.ScrolledWindow {
  constructor(sidebar, ...params) {
    super(params);
    this._sidebar = sidebar;
    this.root_model = Gio.ListStore.new(DocumentationPage);
    this.#createBrowseSelectionModel();

    this._scrolled_to = false;
    this._adj = this._browse_list_view.get_vadjustment();
    this._adj.connect("value-changed", () => {
      this.#adjustScrolling();
    });

    const gesture_click = new Gtk.GestureClick({ button: 0 });
    this._browse_list_view.add_controller(gesture_click);
    gesture_click.connect("pressed", this.#onGestureClick);

    this._browse_list_view.connect("activate", (list_view, pos) => {
      const row = this._tree_model.get_row(pos);
      row.expanded = !row.expanded;
    });
  }

  get webview() {
    if (this._webview === undefined) this._webview = null;
    return this._webview;
  }

  set webview(value) {
    if (this._webview === value) return;
    if (this._handler) this._webview.disconnect(this._handler);
    this._webview = value;
    this._handler = this._webview.connect("notify::uri", this.#syncSelection);
    this.notify("webview");
  }

  selectItem(path) {
    const index = this.#getItemIndex(path);
    // If possible, overshoot scrolling by one row to ensure selected row is visible
    index + 1 === this.selection_model.n_items
      ? this._browse_list_view.scroll_to(index, Gtk.ListScrollFlags.NONE, null)
      : this._browse_list_view.scroll_to(
          index + 1,
          Gtk.ListScrollFlags.NONE,
          null,
        );
    this.selection_model.selected = index;
    this._scrolled_to = true;
  }

  unselectSelection() {
    this.selection_model.unselect_item(this.selection_model.selected);
  }

  collapseAllRows() {
    for (let i = 0; i < this._tree_model.n_items; i++) {
      const row = this._tree_model.get_row(i);
      row.expanded = false;
    }
  }

  #syncSelection = (webview) => {
    const selected_item = this.selection_model.selected_item;
    if (selected_item === null || webview.uri !== selected_item.item.uri) {
      const path = this._sidebar.uri_to_tree_path[webview.uri];
      if (!path) return;
      this.selectItem(path);
    }
  };

  #onGestureClick = (gesture, n_press, x, y) => {
    switch (gesture.get_current_button()) {
      case Gdk.BUTTON_MIDDLE: {
        const index = Math.floor((this._adj.value + y) / ITEM_HEIGHT);
        const uri = this._tree_model.get_row(index).item.uri;
        this.activate_action("app.new-tab", new GLib.Variant("s", uri));
        break;
      }
    }
  };

  #adjustScrolling() {
    if (this._scrolled_to) {
      const index = this.selection_model.selected;
      const bottom_edge = (index + 1) * ITEM_HEIGHT - this._adj.value;
      const top_edge = bottom_edge - ITEM_HEIGHT;
      // If row is not visible after scroll_to, adjust
      if (bottom_edge === 0) {
        this._adj.value -= ITEM_HEIGHT;
      } else if (top_edge === this._adj.page_size) {
        this._adj.value += ITEM_HEIGHT;
      }
      this._scrolled_to = false;
    }
  }

  #getItemIndex(path) {
    let relative_index = 0; // Relative index of the item under its parent
    let absolute_index = 0; // Index of the item in the entire model
    let skip = 0; // Number of items to skip due to expanded rows

    for (let i = 0; i < path.length; i++) {
      while (relative_index < path[i]) {
        const row = this._tree_model.get_row(absolute_index);
        if (row.expanded) {
          skip += row.children.get_n_items();
        }
        if (!skip) relative_index++; // Go to next sibling
        else skip--;
        absolute_index++;
      }
      // Check to ensure the last item is not expanded
      if (i < path.length - 1) {
        this._tree_model.get_row(absolute_index).expanded = true;
        absolute_index++;
        relative_index = 1;
      }
    }
    return absolute_index;
  }

  #createBrowseSelectionModel() {
    this._tree_model = Gtk.TreeListModel.new(
      this.root_model,
      false,
      false,
      (item) => item.children,
    );
    this.selection_model = Gtk.SingleSelection.new(this._tree_model);
    this.selection_model.can_unselect = true;
    this.selection_model.connect("selection-changed", () => {
      if (!this.selection_model.selected_item) return;

      // If selection changed to sync the sidebar, dont load_uri again
      const uri = this.selection_model.selected_item.item.uri;
      if (this.webview.uri === uri) {
        return;
      }
      this.webview.load_uri(uri);
    });
    this._browse_list_view.model = this.selection_model;
  }
}

export default GObject.registerClass(
  {
    GTypeName: "BrowseView",
    Template,
    Properties: {
      webview: GObject.ParamSpec.object(
        "webview",
        "webview",
        "Current active webview",
        GObject.ParamFlags.READWRITE,
        Webkit.WebView,
      ),
    },
    Signals: {
      "browse-view-loaded": {},
    },
    InternalChildren: ["browse_list_view"],
  },
  BrowseView,
);
