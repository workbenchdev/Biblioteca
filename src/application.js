import Adw from "gi://Adw";

import Actions from "./actions.js";
import { settings } from "./util.js";
import DocumentationViewer from "./window.js";

const application = new Adw.Application({
  application_id: pkg.name,
  // Defaults to /re/sonny/Workbench/Devel
  // if pkg.name is re.sonny.Workbench.Devel
  resource_base_path: "/re/sonny/Workbench",
});

let documentation_viewer;
application.connect("activate", () => {
  if (!documentation_viewer) {
    documentation_viewer = DocumentationViewer({ application });
  }
  documentation_viewer.present();
});

application.set_option_context_description("<https://workbench.sonny.re>");

Actions({ application });

const style_manager = Adw.StyleManager.get_default();
function setColorScheme() {
  const color_scheme = settings.get_int("color-scheme");
  style_manager.set_color_scheme(color_scheme);
}
setColorScheme();
settings.connect("changed::color-scheme", setColorScheme);

export default application;
