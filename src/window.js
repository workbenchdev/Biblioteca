import Gtk from "gi://Gtk";
import WebKit from "gi://WebKit";
import resource from "./window.blp";
import Shortcuts from "./Shortcuts.js";
import Sidebar from "./sidebar/Sidebar.js";

import "./icons/dock-left-symbolic.svg";

export default function DocumentationViewer({ application }) {
  const builder = Gtk.Builder.new_from_resource(resource);

  const window = builder.get_object("documentation_viewer");
  const window_breakpoint = builder.get_object("window_breakpoint");
  const split_view = builder.get_object("split_view");
  const webview = builder.get_object("webview");
  const button_back = builder.get_object("button_back");
  const button_forward = builder.get_object("button_forward");
  const bottom_toolbar = builder.get_object("bottom_toolbar");
  const content_header_bar = builder.get_object("content_header_bar");
  const toolbar_breakpoint = builder.get_object("toolbar_breakpoint");
  const box_navigation = builder.get_object("box_navigation");

  const sidebar = new Sidebar({ webview });
  split_view.sidebar = sidebar;

  window_breakpoint.add_setters(
    [sidebar._browse_view, sidebar._search_view],
    ["width-request", "width-request"],
    [300, 300],
  );

  window.application = application;
  if (__DEV__) {
    window.add_css_class("devel");
  }

  const onGoForward = () => {
    webview.go_forward();
  };

  const onGoBack = () => {
    webview.go_back();
  };

  const onZoomIn = () => {
    if (webview.zoom_level < 2) webview.zoom_level += 0.25;
  };

  const onZoomOut = () => {
    if (webview.zoom_level > 0.5) webview.zoom_level -= 0.25;
  };

  const onResetZoom = () => {
    webview.zoom_level = 1;
  };

  const onFocusGlobalSearch = () => {
    sidebar.focusSearch();
  };

  Shortcuts({
    application,
    window,
    onGoForward,
    onGoBack,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onFocusGlobalSearch,
  });

  const user_content_manager = webview.get_user_content_manager();

  const stylesheet = new WebKit.UserStyleSheet(
    ".devhelp-hidden { display: none; }", // source
    WebKit.UserContentInjectedFrames.ALL_FRAMES, // injected_frames
    WebKit.UserStyleLevel.USER, // level
    null,
    null,
  );
  user_content_manager.add_style_sheet(stylesheet);

  webview.connect("load-changed", () => {
    updateButtons();
  });

  webview.get_back_forward_list().connect("changed", () => {
    updateButtons();
  });

  function updateButtons() {
    button_back.sensitive = webview.can_go_back();
    button_forward.sensitive = webview.can_go_forward();
  }

  button_back.connect("clicked", () => {
    webview.go_back();
  });
  button_forward.connect("clicked", () => {
    webview.go_forward();
  });

  toolbar_breakpoint.connect("apply", moveNavigationDown);
  toolbar_breakpoint.connect("unapply", moveNavigationUp);

  function moveNavigationDown() {
    content_header_bar.remove(box_navigation);
    bottom_toolbar.append(box_navigation);
  }

  function moveNavigationUp() {
    bottom_toolbar.remove(box_navigation);
    content_header_bar.pack_start(box_navigation);
  }

  function present() {
    // The window is already open
    const mapped = window.get_mapped();
    window.present();
    onFocusGlobalSearch();
    if (!mapped) {
      sidebar.resetSidebar();
    }
  }

  return { window, present };
}
