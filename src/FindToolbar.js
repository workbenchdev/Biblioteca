import Adw from "gi://Adw";
import Webkit from "gi://WebKit";
import GObject from "gi://GObject";

import Template from "./FindToolbar.blp" with { type: "uri" };

class FindToolbar extends Adw.Bin {
  constructor({ window, ...params }) {
    super(params);
    this._search_started = false;

    this._search_bar.connect_entry(this._search_entry);
    this._search_bar.key_capture_widget = window;

    this._close_find_button.connect("clicked", () => {
      this._search_bar.search_mode_enabled = false;
    });

    this._search_entry.connect("search-changed", () => this.find());

    this._search_bar.connect("notify::search-mode-enabled", () => {
      if (!this._search_bar.search_mode_enabled) this.closeSearch();
    });
  }

  get webview() {
    if (this._webview === undefined) this._webview = null;
    return this._webview;
  }

  set webview(value) {
    if (this._webview === value) return;
    this._webview = value;
    this._find_controller = this._webview.get_find_controller();
  }

  showFind = () => {
    this._search_bar.search_mode_enabled = true;
  };

  find = () => {
    if (!this._search_entry.text) return;
    this._search_started = true;
    this._find_controller.search(
      this._search_entry.text,
      Webkit.FindOptions.CASE_INSENSITIVE | Webkit.FindOptions.WRAP_AROUND,
      1000,
    );
  };

  findNext = () => {
    if (this._search_started) this._find_controller.search_next();
  };

  findPrev = () => {
    if (this._search_started) this._find_controller.search_previous();
  };

  closeSearch = () => {
    this._search_bar.search_mode_enabled = false;
    this._search_started = false;
    this._find_controller.search_finish();
  };
}

export default GObject.registerClass(
  {
    GTypeName: "FindToolbar",
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
    InternalChildren: [
      "search_bar",
      "search_entry",
      "button_previous",
      "button_next",
      "close_find_button",
    ],
  },
  FindToolbar,
);
