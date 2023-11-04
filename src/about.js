import Gtk from "gi://Gtk";
import { gettext as _ } from "gettext";
import GLib from "gi://GLib";
import Adw from "gi://Adw";

import {
  getGIRepositoryVersion,
  getGjsVersion,
  getGLibVersion,
} from "../troll/src/util.js";
import { getFlatpakInfo } from "./util.js";

export default function About({ application }) {
  const flatpak_info = getFlatpakInfo();

  const debug_info = `
${pkg.name} ${pkg.version}
${GLib.get_os_info("ID")} ${GLib.get_os_info("VERSION_ID")}

GJS ${getGjsVersion()}
Adw ${getGIRepositoryVersion(Adw)}
GTK ${getGIRepositoryVersion(Gtk)}
GLib ${getGLibVersion()}
Flatpak ${flatpak_info.get_string("Instance", "flatpak-version")}
`.trim();

  const dialog = new Adw.AboutWindow({
    transient_for: application.get_active_window(),
    application_name: "Biblioteca",
    // developer_name: "Sonny Piers",
    // copyright: "© 2022 Sonny Piers",
    license_type: Gtk.License.GPL_3_0_ONLY,
    version: pkg.version,
    website: "https://github.com/sonnyp/Biblioteca",
    application_icon: pkg.name,
    issue_url: "https://github.com/sonnyp/Biblioteca/issues",
    // TRANSLATORS: eg. 'Translator Name <your.email@domain.com>' or 'Translator Name https://website.example'
    translator_credits: _("translator-credits"),
    debug_info,
    developers: [
      "Akshay Warrier https://github.com/AkshayWarrier",
      "Sonny Piers https://sonny.re"
    ],
    designers: [],
    artists: [],
  });

  dialog.add_credit_section(_("Contributors"), [
    // Add yourself as
    // "John Doe",
    // or
    // "John Doe <john@example.com>",
    // or
    // "John Doe https://john.com",
    "skøldis https://turtle.garden"
  ]);
  dialog.present();

  return { dialog };
}
