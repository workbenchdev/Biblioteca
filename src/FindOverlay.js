import Gtk from "gi://Gtk";
import GObject from "gi://GObject";

import FindToolbar from "./FindToolbar.js";

class FindOverlay extends Gtk.Overlay {
  constructor({ webview, ...params }) {
    super(params);
    this.child = webview;
    this.find_toolbar = new FindToolbar({ webview: webview });
    this.add_overlay(this.find_toolbar);
  }
}

export default GObject.registerClass(
  {
    GTypeName: "FindOverlay",
  },
  FindOverlay,
);
