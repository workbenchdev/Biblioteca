import GLib from "gi://GLib";
import Gio from "gi://Gio";

export const settings = new Gio.Settings({
  schema_id: pkg.name,
  path: "/app/drey/Biblioteca/",
});

export function decode(data) {
  if (data instanceof GLib.Bytes) {
    data = data.toArray();
  }
  return new TextDecoder().decode(data);
}
