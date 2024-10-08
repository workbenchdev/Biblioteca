import Gtk from "gi://Gtk";
import { gettext as _ } from "gettext";
import Adw from "gi://Adw";

export default function About({ application }) {
  const dialog = new Adw.AboutDialog({
    application_name: "Biblioteca",
    developer_name: "Akshay Warrier",
    copyright: "© 2024 Akshay Warrier",
    license_type: Gtk.License.GPL_3_0_ONLY,
    version: pkg.version,
    website: "https://github.com/workbenchdev/Biblioteca",
    application_icon: pkg.name,
    issue_url: "https://github.com/workbenchdev/Biblioteca/issues",
    developers: [
      "Akshay Warrier https://github.com/AkshayWarrier",
      "Sonny Piers https://sonny.re",
    ],
    designers: [],
    artists: ["Jakub Steiner https://jimmac.eu"],
  });

  dialog.add_credit_section(_("Contributors"), [
    // Add yourself as
    // "John Doe",
    // or
    // "John Doe <john@example.com>",
    // or
    // "John Doe https://john.com",
    "Sunniva Løvstad https://turtle.garden",
    "José Hunter https://github.com/halfmexican",
  ]);
  dialog.present(application.get_active_window());

  return { dialog };
}
