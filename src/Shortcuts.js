import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import resource from "./Shortcuts.blp";

export default function Shortcuts(window) {
  const { application } = window;

  const action_shortcuts = new Gio.SimpleAction({ name: "shortcuts" });
  action_shortcuts.connect("activate", () => open());
  application.add_action(action_shortcuts);
  application.set_accels_for_action("app.shortcuts", ["<Control>question"]);

  const accels = [
    ["win.new-tab('file:///app/share/doc/gtk4/index.html')", ["<Control>T"]],
    ["win.close-tab", ["<Control>W"]],
    ["win.navigation-forward", ["<Alt>Right"]],
    ["win.navigation-back", ["<Alt>Left"]],
    ["win.zoom-in", ["<Control>plus", "<Control>equal"]],
    ["win.zoom-out", ["<Control>minus", "<Control>underscore"]],
    ["win.reset-zoom", ["<Control>0"]],
    ["win.global-search", ["<Control>K"]],
    ["win.focus-urlbar", ["<Control>L"]],
    ["win.toggle-sidebar", ["F9"]],
    ["win.toggle-overview", ["<Shift><Control>O"]],
    ["win.find", ["<Control>F"]],
    ["win.find-prev", ["<Shift><Control>G"]],
    ["win.find-next", ["<Control>G"]],
  ];

  for (const accel of accels) {
    application.set_accels_for_action(accel[0], accel[1]);
  }

  let window_shortcuts;
  function open() {
    if (!window_shortcuts) {
      const builder = Gtk.Builder.new_from_resource(resource);
      window_shortcuts = builder.get_object("window_shortcuts");
      window_shortcuts.set_transient_for(window);
    }
    window_shortcuts.present();
  }
}
