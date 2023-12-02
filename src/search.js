import WebKit from "gi://WebKit";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import GLib from "gi://GLib";

export default class SearchHandler {
  var _searchEntry;
  var _previousResult;
  var _nextResult;
  var _webView;
  var _findController;
  var _currentMatch;
  var _numMatches;

  constructor({ searchEntry, previousResult, nextResult, webView }) {
    this._searchEntry = searchEntry;
    this._previousResult = previousResult;
    this._nextResult = nextResult;
    this._webView = webView;
    this._findController = this._webView.get_find_controller();

    this._searchEntry.connect("search-changed", () => {
      let search_term = this._searchEntry.text;
      this._findController.text = search_term;
      this._findController.search(
        search_term,
        WebKit.FindOptions.CASE_INSENSITIVE | WebKit.FindOptions.WRAP_AROUND,
        1000
      );
    });
  }

}
