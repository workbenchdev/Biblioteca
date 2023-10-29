import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Gdk from "gi://Gdk";

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
    // This is not using the portal but we silence the GVFS warnings
    // in `log_handler.js`
    Gtk.show_uri(
      application.get_active_window(),
      target.unpack(),
      Gdk.CURRENT_TIME,
    );
    // an other option is to use libportal:
    // const parent = XdpGtk.parent_new_gtk(application.get_active_window());
    // portal
    //   .open_uri(
    //     parent,
    //     target.unpack(),
    //     Xdp.OpenUriFlags.NONE,
    //     null, // cancellable
    //   )
    //   .catch(console.error);
  });
  application.add_action(action_open_uri);

  const action_platform_tools = new Gio.SimpleAction({
    name: "platform_tools",
    parameter_type: new GLib.VariantType("s"),
  });
  action_platform_tools.connect("activate", (_self, target) => {
    const name = target.unpack();

    if (
      !["adwaita-1-demo", "gtk4-demo", "gtk4-widget-factory"].includes(name)
    ) {
      return;
    }

    try {
      GLib.spawn_command_line_async(`sh -c "/bin/${name} > /dev/null 2>&1"`);
    } catch (err) {
      console.error(err);
    }
  });
  application.add_action(action_platform_tools);

  application.add_action(settings.create_action("color-scheme"));
}
