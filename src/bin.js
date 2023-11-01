#!@GJS@ -m

import { exit, programArgs } from "system";
import GLib from "gi://GLib";
import { setConsoleLogDomain } from "console";
import Xdp from "gi://Xdp";

// eslint-disable-next-line no-restricted-globals
imports.package.init({
  name: "@app_id@",
  version: "@version@",
  prefix: "@prefix@",
  libdir: "@libdir@",
  datadir: "@datadir@",
});
setConsoleLogDomain(pkg.name);
GLib.set_application_name("Biblioteca");

if (!Xdp.Portal.running_under_flatpak()) {
  console.error(
    "Flatpak required\nBiblioteca is only meant to be run sandboxed in a specific target environment.\nBypassing this will exposes users to arbitrary code breakage.",
  );
  exit(1);
}

globalThis.__DEV__ = pkg.name.endsWith(".Devel");
if (__DEV__) {
  pkg.sourcedir = "@sourcedir@";
}

const module = await import("resource:///app/drey/Biblioteca/main.js");
const exit_code = await module.main(programArgs);
exit(exit_code);
