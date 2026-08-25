import "./init.js";
import application from "./application.js";

pkg.initGettext();

import "./style.css";

export function main(argv) {
  return application.runAsync(argv);
}
