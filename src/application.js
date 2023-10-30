import Adw from "gi://Adw";

import Actions from "./actions.js";
import { settings } from "./util.js";
import { ManualsWindow } from "./window.js";

const application = new Adw.Application({
  application_id: pkg.name,
  // Defaults to /re/sonny/Workbench/Devel
  // if pkg.name is re.sonny.Workbench.Devel
  resource_base_path: "/re/sonny/Workbench",
});

application.connect("activate", () => {
  const manuals_window = new ManualsWindow({ application });
  manuals_window.present();
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
