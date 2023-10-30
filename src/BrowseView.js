import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GObject from "gi://GObject";

import { DocumentationPage } from "./DocumentationPage.js";
import { decode } from "./util.js";

import Template from "./BrowseView.blp" with { type: "uri" };

const IGNORED_LIBRARIES = [
  "atk",
  "javascriptcoregtk-4.1",
  "libhandy-1",
  "libnotify-0",
  "webkit2gtk-4.1",
  "webkit2gtk-web-extension-4.1",
];

const SECTION_TYPES = {
  class: ["Classes", "#classes"],
  content: ["Addition Documentation", "#extra"],
  interface: ["Interfaces", "#interfaces"],
  record: ["Structs", "#structs"],
  alias: ["Aliases", "#aliases"],
  enum: ["Enumerations", "#enums"],
  bitfield: ["Bitfields", "#bitfields"],
  function: ["Functions", "#functions"],
  function_macro: ["Function Macros", "#function_macros"],
  domain: ["Error Domains", "#domains"],
  callback: ["Callbacks", "#callbacks"],
  constant: ["Constants", "#constants"],
};

const SUBSECTION_TYPES = {
  ctor: ["Constructors", "#constructors"],
  type_func: ["Functions", "#type-functions"],
  method: ["Instance Methods", "#methods"],
  property: ["Properties", "#properties"],
  signal: ["Signals", "#signals"],
  class_method: ["Class Methods", "#class-methods"],
  vfunc: ["Virtual Methods", "#virtual-methods"],
};

const REQUIRED = ["class", "interface", "record", "domain"];

export const BrowseView = GObject.registerClass(
  {
    GTypeName: "BrowseView",
    Template,
    Signals: {
      "browse-view-loaded": {},
    },
    InternalChildren: ["browse_list_view"],
  },
  class BrowseView extends Gtk.ScrolledWindow {
    constructor({ webview, ...params }) {
      super(params);
      this._webview = webview;
      this.root_model = Gio.ListStore.new(DocumentationPage);
      this._adj = this._browse_list_view.get_vadjustment();
      this._scrolled_to = false;
      this.#createBrowseSelectionModel();
      this.#loadDocs().catch(console.error);
      this.#adjustScrolling();
    }

    #adjustScrolling() {
      this._adj.connect("value-changed", () => {
        if (this._scrolled_to) {
          const index = this.selection_model.selected;
          const bottom_edge = (index + 1) * 38 - this._adj.value;
          const top_edge = bottom_edge - 38;
          // If row is not visible after scroll_to, adjust
          if (bottom_edge === 0) {
            this._adj.value -= 38;
          } else if (top_edge === this._adj.page_size) {
            this._adj.value += 38;
          }
          this._scrolled_to = false;
        }
      });
    }

    selectItem(path) {
      const index = this.#getItemIndex(path);
      // If possible, overshoot scrolling by one row to ensure selected row is visible
      index + 1 === this.selection_model.n_items
        ? this._browse_list_view.scroll_to(
            index,
            Gtk.ListScrollFlags.NONE,
            null,
          )
        : this._browse_list_view.scroll_to(
            index + 1,
            Gtk.ListScrollFlags.NONE,
            null,
          );
      this.selection_model.selected = index;
      this._scrolled_to = true;
    }

    #getItemIndex(path) {
      let relative_index = 0; // Relative index of the item under its parent
      let absolute_index = 0; // Index of the item in the entire model
      let skip = 0; // Number of items to skip due to expanded rows

      for (let i = 0; i < path.length; i++) {
        while (relative_index < path[i]) {
          const row = this._tree_model.get_row(absolute_index);
          if (row.expanded) {
            skip += row.children.get_n_items();
          }
          if (!skip) relative_index++; // Go to next sibling
          else skip--;
          absolute_index++;
        }
        // Check to ensure the last item is not expanded
        if (i < path.length - 1) {
          this._tree_model.get_row(absolute_index).expanded = true;
          absolute_index++;
          relative_index = 1;
        }
      }
      return absolute_index;
    }

    #createBrowseSelectionModel() {
      this._tree_model = Gtk.TreeListModel.new(
        this.root_model,
        false,
        false,
        (item) => item.children,
      );
      this.selection_model = Gtk.SingleSelection.new(this._tree_model);
      this.selection_model.connect("selection-changed", () => {
        // If selection changed to sync the sidebar, dont load_uri again
        const uri = this.selection_model.selected_item.item.uri;
        if (this._webview.uri === uri) {
          return;
        }
        this._webview.load_uri(uri);
      });
      this._browse_list_view.model = this.selection_model;
    }

    async #loadDocs() {
      return Promise.all([
        this.#scanLibraries(Gio.File.new_for_path("/usr/share/doc")),
        this.#scanLibraries(Gio.File.new_for_path("/usr/share/gtk-doc/html")),
        this.#scanLibraries(Gio.File.new_for_path("/app/share/doc")),
      ]).then(() => {
        this.emit("browse-view-loaded");
      });
    }

    async #scanLibraries(base_dir) {
      const libraries = [];

      const iter = await base_dir.enumerate_children_async(
        "standard::name,standard::type",
        Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
        GLib.PRIORITY_DEFAULT,
        null,
      );
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const infos = await iter.next_files_async(
          10,
          GLib.PRIORITY_DEFAULT,
          null,
        );
        if (infos.length === 0) break;

        for (const info of infos) {
          if (info.get_file_type() !== Gio.FileType.DIRECTORY) continue;

          if (IGNORED_LIBRARIES.includes(info.get_name())) continue;

          const directory = iter.get_child(info);
          libraries.push(this.#loadLibrary(directory).catch(console.error));
        }
      }

      return Promise.allSettled(libraries).catch(console.error);
    }

    async #loadLibrary(directory) {
      try {
        const json_file = directory.get_child("index.json");
        const html_file = directory.get_child("index.html");

        const [data] = await json_file.load_contents_async(null);
        const index = JSON.parse(decode(data));

        const namespace = `${index.meta.ns}-${index.meta.version}`;
        const page = new DocumentationPage({
          name: namespace,
          tag: "namespace",
          search_name: namespace,
          uri: html_file.get_uri(),
          children: this.#getChildren(index, directory),
        });

        this.root_model.insert_sorted(page, this.#sortFunc);
      } catch (error) {
        if (!error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND))
          throw error;
      }
    }

    #getChildren(index, dir) {
      const index_html = dir.get_child("index.html").get_uri();
      const symbols = index.symbols;

      const sections = {};
      const subsections = {};

      for (const section in SECTION_TYPES)
        sections[section] = this.#newListStore();

      for (const symbol of symbols) {
        let location;
        if (sections[symbol.type]) location = sections[symbol.type];
        else if (symbol.type_name) {
          if (!subsections[symbol.type_name]) {
            const new_subsection = {};
            for (const subsection in SUBSECTION_TYPES)
              new_subsection[subsection] = this.#newListStore();
            subsections[symbol.type_name] = new_subsection;
          }
          location = subsections[symbol.type_name][symbol.type];
        }
        if (location)
          location.insert_sorted(
            new DocumentationPage({
              name: symbol.name,
              tag: this.#getTagForDocument(symbol),
              search_name: this.#getSearchNameForDocument(symbol, index.meta),
              uri: `${dir.get_uri()}/${this.#getLinkForDocument(symbol)}`,
            }),
            this.#sortFunc,
          );
      }

      this.#createSubsections(subsections, sections);

      const sections_model = this.#newListStore();
      for (const section in sections) {
        if (sections[section].get_n_items() > 0)
          sections_model.insert_sorted(
            new DocumentationPage({
              name: SECTION_TYPES[section][0],
              uri: `${index_html}${SECTION_TYPES[section][1]}`,
              children: sections[section],
            }),
            this.#sortFunc,
          );
      }
      return sections_model;
    }

    #createSubsections(subsections, sections) {
      for (const type of REQUIRED) {
        for (const item of sections[type]) {
          const model = this.#newListStore();
          const name = item.name;
          for (const subsection in subsections[name]) {
            if (subsections[name][subsection].get_n_items() > 0) {
              model.insert_sorted(
                new DocumentationPage({
                  name: SUBSECTION_TYPES[subsection][0],
                  uri: `${item.uri}${SUBSECTION_TYPES[subsection][1]}`,
                  children: subsections[name][subsection],
                }),
                this.#sortFunc,
              );
            }
          }
          item.children = model;
        }
      }
    }

    #sortFunc(doc1, doc2) {
      return doc1.name.localeCompare(doc2.name);
    }

    #newListStore() {
      return Gio.ListStore.new(DocumentationPage);
    }
    #getSearchNameForDocument(doc, meta) {
      switch (doc.type) {
        case "alias":
        case "bitfield":
        case "callback":
        case "class":
        case "domain":
        case "enum":
        case "interface":
        case "record":
          return doc.ctype;

        case "class_method":
        case "constant":
        case "ctor":
        case "function":
        case "function_macro":
        case "method":
        case "type_func":
          return doc.ident;

        case "property":
          return `${meta.ns}${doc.type_name}:${doc.name}`;
        case "signal":
          return `${meta.ns}${doc.type_name}::${doc.name}`;
        case "vfunc":
          return `${meta.ns}${doc.type_name}.${doc.name}`;

        case "content":
          return doc.name;
      }
    }

    #getLinkForDocument(doc) {
      switch (doc.type) {
        case "alias":
          return `alias.${doc.name}.html`;
        case "bitfield":
          return `flags.${doc.name}.html`;
        case "callback":
          return `callback.${doc.name}.html`;
        case "class":
          return `class.${doc.name}.html`;
        case "class_method":
          return `class_method.${doc.struct_for}.${doc.name}.html`;
        case "constant":
          return `const.${doc.name}.html`;
        case "content":
          return doc.href;
        case "ctor":
          return `ctor.${doc.type_name}.${doc.name}.html`;
        case "domain":
          return `error.${doc.name}.html`;
        case "enum":
          return `enum.${doc.name}.html`;
        case "function":
          return `func.${doc.name}.html`;
        case "function_macro":
          return `func.${doc.name}.html`;
        case "interface":
          return `iface.${doc.name}.html`;
        case "method":
          return `method.${doc.type_name}.${doc.name}.html`;
        case "property":
          return `property.${doc.type_name}.${doc.name}.html`;
        case "record":
          return `struct.${doc.name}.html`;
        case "signal":
          return `signal.${doc.type_name}.${doc.name}.html`;
        case "type_func":
          return `type_func.${doc.type_name}.${doc.name}.html`;
        case "union":
          return `union.${doc.name}.html`;
        case "vfunc":
          return `vfunc.${doc.type_name}.${doc.name}.html`;
      }
    }

    #getTagForDocument(doc) {
      switch (doc.type) {
        case "method":
        case "class_method":
          return "method";
        case "content":
          return "additional";
        case "ctor":
          return "constructor";
        case "domain":
          return "error";
        case "function_macro":
          return "macro";
        case "record":
          return "struct";
        case "type_func":
          return "function";
        default:
          return doc.type;
      }
    }
  },
);
