import "gi://Gtk?version=4.0";
import "gi://Adw?version=1";
import "gi://WebKit?version=6.0";

import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

Gio._promisify(Gtk.UriLauncher.prototype, "launch", "launch_finish");
