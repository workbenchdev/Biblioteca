import Gtk from "gi://Gtk";
import GObject from "gi://GObject";

import Template from "./ZoomButtons.blp" with { type: "uri" };

import "../icons/zoom-in-symbolic.svg";
import "../icons/zoom-out-symbolic.svg";

class ZoomButtons extends Gtk.Box {
  constructor(...params) {
    super(params);

    this.bind_property_full(
      "zoom-level",
      this._label_zoom,
      "label",
      GObject.BindingFlags.SYNC_CREATE,
      (binding, from_value) =>
        from_value ? [true, `${from_value * 100}%`] : [false, null],
      null,
    );
  }
}

export default GObject.registerClass(
  {
    GTypeName: "ZoomButtons",
    Template,
    Properties: {
      "zoom-level": GObject.ParamSpec.double(
        "zoom-level",
        "zoom-level",
        "Zoom level of the active webview",
        GObject.ParamFlags.READWRITE,
        0,
        Number.MAX_SAFE_INTEGER,
        1,
      ),
    },
    InternalChildren: ["button_zoom_out", "label_zoom", "button_zoom_in"],
  },
  ZoomButtons,
);
