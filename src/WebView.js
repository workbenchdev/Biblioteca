import WebKit from "gi://WebKit";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";
import GLib from "gi://GLib";

import Template from "./WebView.blp" with { type: "uri" };

class WebView extends WebKit.WebView {
  constructor({ window, ...params } = {}) {
    super(params);

    this.#disablePageSidebar();

    this.connect("decide-policy", this.#decidePolicy);
  }

  #decidePolicy = (_self, decision, decision_type) => {
    console.debug(
      "decide-policy",
      getEnum(WebKit.PolicyDecisionType, decision_type),
    );

    if (decision_type === WebKit.PolicyDecisionType.NAVIGATION_ACTION) {
      const navigation_action = decision.get_navigation_action();
      const url = navigation_action.get_request().get_uri();
      console.debug(
        "navigation",
        getEnum(WebKit.NavigationType, navigation_action.get_navigation_type()),
        url,
      );

      const scheme = GLib.Uri.peek_scheme(url);
      if (scheme !== "file") {
        decision.ignore();
        Gtk.show_uri(this.get_root(), url, Gdk.CURRENT_TIME);
        return true;
      }
    }

    return false;
  };

  #disablePageSidebar() {
    const user_content_manager = this.get_user_content_manager();
    const stylesheet = new WebKit.UserStyleSheet(
      ".devhelp-hidden { display: none; }", // source
      WebKit.UserContentInjectedFrames.ALL_FRAMES, // injected_frames
      WebKit.UserStyleLevel.USER, // level
      null,
      null,
    );
    user_content_manager.add_style_sheet(stylesheet);
  }
}

export function getEnum(enums, idx) {
  return Object.keys(enums).find((key) => {
    return enums[key] === idx;
  });
}

export default GObject.registerClass(
  {
    GTypeName: "WebView",
    Template,
  },
  WebView,
);
