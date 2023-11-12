import Gtk from "gi://Gtk";
import GObject from "gi://GObject";

import { hasMatch, score } from "./fzy.js";

import Template from "./SearchView.blp" with { type: "uri" };

const QUERY_TYPES = [
  "additional",
  "alias",
  "bitfield",
  "callback",
  "class",
  "constant",
  "constructor",
  "enum",
  "error",
  "function",
  "interface",
  "namespace",
  "macro",
  "method",
  "property",
  "signal",
  "struct",
  "union",
  "vfunc",
];

const QUERY_PATTERN = new RegExp(
  "^(" + QUERY_TYPES.join("|") + ")\\s*:\\s*",
  "i",
);

class SearchView extends Gtk.ScrolledWindow {
  constructor(params = {}) {
    super(params);
    this.connect("notify::search-term", this.#onNotifySearchTem);
  }

  get search_term() {
    if (this._search_term === undefined) this._search_term = "";
    return this._search_term;
  }

  set search_term(value) {
    if (this.search_term === value) return;
    this._search_term = value;
    this.notify("search-term");
  }

  initializeModel(flattened_model) {
    this._flattened_model = flattened_model;
    this.#createSearchSelectionModel();
  }

  #onNotifySearchTem = () => {
    this.selection_model.unselect_item(this.selection_model.selected);
    this._filter_model.filter = this.#createFilter();
    this._search_list_view.scroll_to(0, Gtk.ListScrollFlags.NONE, null);
  };

  #createFilter() {
    let search_term = this.search_term;
    const matches = search_term.match(QUERY_PATTERN);
    let tag = null;

    if (matches) {
      tag = matches[1].toLowerCase();
      search_term = search_term.substring(matches[0].length);
    }

    const needle = search_term.replace(/\s+/g, "");
    const isCaseSensitive = needle.toLowerCase() !== needle;
    const actualNeedle = isCaseSensitive ? needle : needle.toLowerCase();

    return Gtk.CustomFilter.new((item) => {
      const haystack = isCaseSensitive
        ? item.search_name
        : item.search_name.toLowerCase();
      const match = hasMatch(actualNeedle, haystack);
      const shouldKeep = match && (!tag || item.tag === tag);
      if (shouldKeep) item.score = score(actualNeedle, haystack);
      return shouldKeep;
    });
  }

  #createSearchSelectionModel() {
    this._filter_model = Gtk.FilterListModel.new(this._flattened_model, null);
    const sorter = Gtk.CustomSorter.new((item1, item2) => {
      return Math.sign(item2.score - item1.score);
    });
    const sort_model = new Gtk.SortListModel({
      model: this._filter_model,
      sorter: sorter,
    });

    this.selection_model = Gtk.SingleSelection.new(sort_model);
    this.selection_model.autoselect = false;
    this.selection_model.can_unselect = true;
    this.selection_model.connect("selection-changed", () => {
      if (!this.selection_model.selected_item) return;
      const uri = this.selection_model.selected_item.uri;
      this.emit("search-view-selection-changed", uri);
    });

    this._search_list_view.model = this.selection_model;
  }
}

export default GObject.registerClass(
  {
    GTypeName: "SearchView",
    Template,
    Properties: {
      "search-term": GObject.ParamSpec.string(
        "search-term",
        "search-term",
        "Current active search term",
        GObject.ParamFlags.READWRITE,
        "",
      ),
    },
    Signals: {
      "search-view-selection-changed": {
        param_types: [GObject.TYPE_STRING],
      },
    },
    InternalChildren: ["search_list_view"],
  },
  SearchView,
);
