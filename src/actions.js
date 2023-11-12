import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";

import About from "./about.js";
import { settings } from "./util.js";

export default function Actions({ application }) {
  const quit = new Gio.SimpleAction({
    name: "quit",
    parameter_type: null,
  });
  quit.connect("activate", () => {
    application.quit();
  });
  application.add_action(quit);
  application.set_accels_for_action("app.quit", ["<Control>Q"]);

  const showAboutDialog = new Gio.SimpleAction({
    name: "about",
    parameter_type: null,
  });
  showAboutDialog.connect("activate", () => {
    About({ application });
  });
  application.add_action(showAboutDialog);

  const action_open_uri = new Gio.SimpleAction({
    name: "open_uri",
    parameter_type: new GLib.VariantType("s"),
  });
  action_open_uri.connect("activate", (_self, target) => {
    new Gtk.UriLauncher({ uri: target.unpack() })
      .launch(application.get_active_window(), null)
      .catch(console.error);
  });
  application.add_action(action_open_uri);

  application.add_action(settings.create_action("color-scheme"));
}
