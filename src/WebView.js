import WebKit from "gi://WebKit";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import GLib from "gi://GLib";

import Template from "./WebView.blp" with { type: "uri" };

class WebView extends WebKit.WebView {
  constructor(...args) {
    super(...args);

    this.#disablePageSidebar();
    this.connect("decide-policy", this.#onDecidePolicy);
  }

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

  #onDecidePolicy = (_self, decision, decision_type) => {
    console.debug(
      "decide-policy",
      getEnum(WebKit.PolicyDecisionType, decision_type),
    );

    if (decision_type === WebKit.PolicyDecisionType.NAVIGATION_ACTION) {
      const navigation_action = decision.get_navigation_action();
      const uri = navigation_action.get_request().get_uri();
      console.debug(
        "navigation",
        getEnum(WebKit.NavigationType, navigation_action.get_navigation_type()),
        uri,
      );

      const scheme = GLib.Uri.peek_scheme(uri);
      if (scheme !== "file") {
        decision.ignore();
        new Gtk.UriLauncher({ uri })
          .launch(this.get_root(), null)
          .catch(console.error);
        return true;
      }
    }

    return false;
  };
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
