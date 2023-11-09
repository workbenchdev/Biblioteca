import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import resource from "./Shortcuts.blp";

export default function Shortcuts(
  application,
  window,
  onGoForward,
  onGoBack,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFocusGlobalSearch,
) {
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

  function open() {
    if (!window_shortcuts) {
      const builder = Gtk.Builder.new_from_resource(resource);
      window_shortcuts = builder.get_object("window_shortcuts");
      window_shortcuts.set_transient_for(window);
      window_shortcuts.set_application(application);
    }
    window_shortcuts.present();
  }

  const shortcuts = [
    [["<Primary>question"], open],
    [["<Control>w"], () => window.close()],
    [["<Alt>Right"], onGoForward],
    [["<Alt>Left"], onGoBack],
    [["<Control>plus", "<Control>equal"], onZoomIn],
    [["<Control>minus", "<Control>underscore"], onZoomOut],
    [["<Control>0"], onResetZoom],
    [["<Control>K"], onFocusGlobalSearch],
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
