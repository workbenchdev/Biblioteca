import GObject from "gi://GObject";
import Gio from "gi://Gio";

class DocumentationPage extends GObject.Object {}

export default GObject.registerClass(
  {
    GTypeName: "DocumentationPage",
    Properties: {
      name: GObject.ParamSpec.string(
        "name",
        "name",
        "Display name in the sidebar",
        GObject.ParamFlags.READWRITE,
        "",
      ),
      tag: GObject.ParamSpec.string(
        "tag",
        "tag",
        "Tag of symbol",
        GObject.ParamFlags.READWRITE,
        "",
      ),
      search_name: GObject.ParamSpec.string(
        "search_name",
        "search_name",
        "Name used to search the item in sidebar",
        GObject.ParamFlags.READWRITE,
        "",
      ),
      score: GObject.ParamSpec.double(
        "score",
        "score",
        "Score assigned when searching an item in the sidebar",
        GObject.ParamFlags.READWRITE,
        Number.MIN_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
      ),
      uri: GObject.ParamSpec.string(
        "uri",
        "uri",
        "Uri to the documentation page",
        GObject.ParamFlags.READWRITE,
        "",
      ),
      children: GObject.ParamSpec.object(
        "children",
        "children",
        null,
        GObject.ParamFlags.READWRITE,
        Gio.ListStore,
      ),
    },
  },
  DocumentationPage,
);
