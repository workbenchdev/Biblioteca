import Adw from "gi://Adw";
import Webkit from "gi://WebKit";
import GObject from "gi://GObject";

import Template from "./FindToolbar.blp" with { type: "uri" };

class FindToolbar extends Adw.Bin {
  constructor({ webview, ...params }) {
    super(params);
    this._find_controller = webview.get_find_controller();
    this._find_controller.connect("found-text", this.#onFoundMatch);
    this._find_controller.connect("failed-to-find-text", this.#onNotFoundMatch);
    this._current_match = 0;
    this._total_count = 0;
    this._search_bar.connect_entry(this._search_text);
    this._search_text.connect("notify::text", this.find);
  }

  showFind = () => {
    this._search_bar.search_mode_enabled = true;
    this._search_text.grab_focus();
  };

  find = () => {
    this._new_search = true;
    this._find_controller.search(
      this._search_text.text,
      Webkit.FindOptions.CASE_INSENSITIVE | Webkit.FindOptions.WRAP_AROUND,
      1000,
    );
  };

  findNext = () => {
    this._new_search = false;
    this._find_controller.search_next();
    this._current_match++;
    if (this._current_match > this._total_count) this._current_match = 0;
    this.#updateLabelInfo();
  };

  findPrev = () => {
    this._new_search = false;
    this._find_controller.search_previous();
    this._current_match--;
    if (this._current_match < 1) this._current_match = this._total_count;
    this.#updateLabelInfo();
  };

  closeSearch = () => {
    this._new_search = false;
    this._search_bar.search_mode_enabled = false;
    this._find_controller.search_finish();
    this._current_match = 0;
    this._total_count = 0;
    this.#updateLabelInfo();
  };

  #onFoundMatch = (controller, count) => {
    if (this._new_search) {
      this._current_match = 1;
      this._total_count = count;
      this.#updateLabelInfo();
    }
  };

  #onNotFoundMatch = (controller) => {
    this._current_match = 0;
    this._total_count = 0;
    this.#updateLabelInfo();
  };

  #updateLabelInfo = () => {
    if (this._total_count === 0) {
      this._label_info.label = "";
    } else {
      this._label_info.label = `${this._current_match} of ${this._total_count}`;
    }
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
      "search_text",
      "label_info",
      "button_previous",
      "button_next",
      "close_find_button",
    ],
  },
  FindToolbar,
);
