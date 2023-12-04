import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import GLib from "gi://GLib";

import Template from "./URLBar.blp" with { type: "uri" };

class URLBar extends Gtk.Entry {
  constructor({ webview, ...params }) {
    super(params);
    this._webview = webview;

    this._webview.bind_property(
      "uri",
      this.buffer,
      "text",
      GObject.BindingFlags.DEFAULT,
    );

    this.connect("activate", () => {
      let url = this.buffer.text;
      const scheme = GLib.Uri.peek_scheme(url);
      if (!scheme) {
        url = `http://${url}`;
      }
      this._webview.load_uri(url);
    });
  }
}

export default GObject.registerClass(
  {
    GTypeName: "URLBar",
    Template,
  },
  URLBar,
);
