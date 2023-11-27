import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import resource from "./Shortcuts.blp";

export default function Shortcuts(
  window,
  newTab,
  closeTab,
  goForward,
  goBack,
  zoomIn,
  zoomOut,
  resetZoom,
  focusGlobalSearch,
  toggleSidebar,
  toggleOverview,
  activateDefault
) {
  const { application } = window;

  let window_shortcuts;
  const action_shortcuts = new Gio.SimpleAction({
    name: "shortcuts",
    parameter_type: null,
  });
  action_shortcuts.connect("activate", () => {
    open();
  });
  application.add_action(action_shortcuts);
  application.set_accels_for_action("app.shortcuts", ["<Control>question"]);

  const action_new_tab = new Gio.SimpleAction({
    name: "new-tab",
    parameter_type: new GLib.VariantType("s"),
  });
  action_new_tab.connect("activate", (action, parameter) =>
    newTab(parameter.unpack()),
  );
  application.add_action(action_new_tab);
  application.set_accels_for_action(
    "app.new-tab('file:///app/share/doc/gtk4/index.html')",
    ["<Control>T"],
  );

  function open() {
    if (!window_shortcuts) {
      const builder = Gtk.Builder.new_from_resource(resource);
      window_shortcuts = builder.get_object("window_shortcuts");
      window_shortcuts.set_transient_for(window);
    }
    window_shortcuts.present();
  }

  const shortcuts = [
    [["<Control>W"], closeTab],
    [["<Alt>Right"], goForward],
    [["<Alt>Left"], goBack],
    [["<Control>plus", "<Control>equal"], zoomIn],
    [["<Control>minus", "<Control>underscore"], zoomOut],
    [["<Control>0"], resetZoom],
    [["<Control>K"], focusGlobalSearch],
    [["F9"], toggleSidebar],
    [["<Shift><Control>o"], toggleOverview],
    [["F10"], activateDefault]
  ];

  const shortcutController = new Gtk.ShortcutController();
  shortcuts.forEach(([accels, fn]) => {
    const shortcut = new Gtk.Shortcut({
      trigger: Gtk.ShortcutTrigger.parse_string(accels.join("|")),
      action: Gtk.CallbackAction.new(() => {
        fn();
        return true;
      }),
    });
    shortcutController.add_shortcut(shortcut);
  });

  window.add_controller(shortcutController);
}
