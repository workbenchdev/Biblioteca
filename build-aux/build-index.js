#!/usr/bin/env -S gjs -m

import Gio from "gi://Gio";
import GLib from "gi://GLib";

Gio._promisify(
  Gio.File.prototype,
  "load_contents_async",
  "load_contents_finish",
);

Gio._promisify(
  Gio.FileEnumerator.prototype,
  "next_files_async",
  "next_files_finish",
);

Gio._promisify(
  Gio.File.prototype,
  "enumerate_children_async",
  "enumerate_children_finish",
);

Gio._promisify(
  Gio.File.prototype,
  "replace_contents_async",
  "replace_contents_finish",
);

// Biblioteca is GTK4 only; these are GTK 3 libraries
// we only support gi-docgen and gtk3 uses gtk-doc
const IGNORED_LIBRARIES = ["atk", "libhandy-1"];

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
const DOC_INDEX = [];

await loadDocs();

async function loadDocs() {
  await Promise.all([
    scanLibraries(Gio.File.new_for_path("/app/share/doc")),
    scanLibraries(Gio.File.new_for_path("/app/share/doc/glib-2.0")),
  ]);
  sort_index(DOC_INDEX);

  const [pkgdatadir] = ARGV;
  GLib.mkdir_with_parents(pkgdatadir, 0o755);

  await Gio.File.new_for_path(pkgdatadir)
    .get_child("doc-index.json")
    .replace_contents_async(
      new TextEncoder().encode(JSON.stringify(DOC_INDEX)),
      null,
      false,
      Gio.FileCreateFlags.NONE,
      null,
    );
}

async function scanLibraries(base_dir) {
  const libraries = [];

  const iter = await base_dir.enumerate_children_async(
    "standard::name,standard::type",
    Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
    GLib.PRIORITY_DEFAULT,
    null,
  );

  for (const info of iter) {
    if (info.get_file_type() !== Gio.FileType.DIRECTORY) continue;
    if (IGNORED_LIBRARIES.includes(info.get_name())) continue;
    const file = iter.get_child(info);
    libraries.push(loadLibrary(file).catch(console.error));
  }

  return Promise.allSettled(libraries).catch(console.error);
}

async function loadLibrary(directory) {
  try {
    const json_file = directory.get_child("index.json");
    const html_file = directory.get_child("index.html");

    const [data] = await json_file.load_contents_async(null);
    const index = JSON.parse(decode(data));

    const namespace = `${index.meta.ns}-${index.meta.version}`;
    DOC_INDEX.push({
      name: namespace,
      tag: "namespace",
      search_name: namespace,
      uri: html_file.get_uri(),
      children: getChildren(index, directory),
    });
  } catch (error) {
    if (!error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) throw error;
  }
}

function getChildren(index, dir) {
  const index_html = dir.get_child("index.html").get_uri();
  const symbols = index.symbols;

  const sections = {};
  const subsections = {};

  for (const section in SECTION_TYPES) sections[section] = [];

  for (const symbol of symbols) {
    let location;
    if (sections[symbol.type]) location = sections[symbol.type];
    else if (symbol.type_name) {
      if (!subsections[symbol.type_name]) {
        const new_subsection = {};
        for (const subsection in SUBSECTION_TYPES)
          new_subsection[subsection] = [];
        subsections[symbol.type_name] = new_subsection;
      }
      location = subsections[symbol.type_name][symbol.type];
    }
    if (location)
      location.push({
        name: symbol.name,
        tag: getTagForDocument(symbol),
        search_name: getSearchNameForDocument(symbol, index.meta),
        uri: `${dir.get_uri()}/${getLinkForDocument(symbol)}`,
      });
  }

  createSubsections(subsections, sections);

  const sections_model = [];
  for (const section in sections) {
    if (sections[section].length > 0)
      sections_model.push({
        name: SECTION_TYPES[section][0],
        uri: `${index_html}${SECTION_TYPES[section][1]}`,
        children: sections[section],
      });
  }
  return sections_model;
}

function createSubsections(subsections, sections) {
  for (const type of REQUIRED) {
    for (const item of sections[type]) {
      const model = [];
      const name = item.name;
      for (const subsection in subsections[name]) {
        if (subsections[name][subsection].length > 0) {
          model.push({
            name: SUBSECTION_TYPES[subsection][0],
            uri: `${item.uri}${SUBSECTION_TYPES[subsection][1]}`,
            children: subsections[name][subsection],
          });
        }
      }
      item.children = model;
    }
  }
}

function sort_index(index) {
  index.sort((a, b) => a.name.localeCompare(b.name));
  for (const item of index) {
    if (item.children) {
      sort_index(item.children);
    }
  }
}

function decode(data) {
  if (data instanceof GLib.Bytes) {
    data = data.toArray();
  }
  return new TextDecoder().decode(data);
}

function getSearchNameForDocument(doc, meta) {
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

function getLinkForDocument(doc) {
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

function getTagForDocument(doc) {
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
