import GObject from "gi://GObject";
import Gtk from "gi://Gtk";

import Template from "./URLBar.blp" with { type: "uri" };

class URLBar extends Gtk.Entry {
  constructor(...params) {
    super(params);
  }
}

export default GObject.registerClass(
  {
    GTypeName: "URLBar",
    Template,
  },
  URLBar,
);
