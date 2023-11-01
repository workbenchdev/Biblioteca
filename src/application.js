import Adw from "gi://Adw";

import Actions from "./actions.js";
import { settings } from "./util.js";
import DocumentationViewer from "./window.js";

const application = new Adw.Application({
  application_id: pkg.name,
  // Defaults to /app/drey/Biblioteca/Devel
  // if pkg.name is app.drey.Biblioteca.Devel
  resource_base_path: "/app/drey/Biblioteca",
});

let documentation_viewer;
application.connect("activate", () => {
  if (!documentation_viewer) {
    documentation_viewer = DocumentationViewer({ application });
  }
  documentation_viewer.present();
});

application.set_option_context_description(
  "<https://github.com/sonnyp/Biblioteca>",
);

Actions({ application });

const style_manager = Adw.StyleManager.get_default();
function setColorScheme() {
  const color_scheme = settings.get_int("color-scheme");
  style_manager.set_color_scheme(color_scheme);
}
setColorScheme();
settings.connect("changed::color-scheme", setColorScheme);

export default application;
