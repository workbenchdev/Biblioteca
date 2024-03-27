import WebKit from "gi://WebKit";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import GLib from "gi://GLib";

export default class SearchHandler {
  var _searchEntry;
  var _searchLabel;
  var _previousResult;
  var _nextResult;
  var _webView;
  var _findController;
  var _currentMatch = 0;
  var _numMatches = 0;

  constructor({ searchEntry, searchLabel, previousResult, nextResult, webView }) {
    this._searchEntry = searchEntry;
    this._searchLabel = searchLabel;
    this._previousResult = previousResult;
    this._nextResult = nextResult;
    this._webView = webView;
    this._findController = this._webView.get_find_controller();

    this._searchEntry.connect("search-changed", () => {
      let search_term = this._searchEntry.text;
      this._findController.search(
        search_term,
        WebKit.FindOptions.CASE_INSENSITIVE | WebKit.FindOptions.WRAP_AROUND,
        1000
      );
    });

    this._findController.connect("found-text", count => {
      this._numMatches = count;
      this.#updateSearchLabel();
    });

    this._findController.connect("failed-to-find-text", count => {
      this._numMatches = 0;
      this.#updateSearchLabel();
    });
  }

  closeSearch = () => {
    this._findController.search_finish();
  }
}
