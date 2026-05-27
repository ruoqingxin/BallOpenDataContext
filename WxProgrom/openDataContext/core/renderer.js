const Layout = require("../engine.js").default;
const canvas = require("./canvas.js");

function hideListScrollbar(listId) {
  try {
    const elements = Layout.getElementsById(listId || "list_items");
    const list = elements && elements[0];
    if (!list) {
      return;
    }

    if (Layout.ticker && typeof Layout.ticker.next === "function") {
      Layout.ticker.next(function () {
        try {
          if (list.vertivalScrollbar) {
            list.vertivalScrollbar.hide();
          }
        } catch (err) {
          console.error("[OpenData] hide scrollbar failed:", err);
        }
      });
      return;
    }

    if (list.vertivalScrollbar) {
      list.vertivalScrollbar.hide();
    }
  } catch (err) {
    console.error("[OpenData] hideListScrollbar failed:", err);
  }
}

function render(options) {
  options = options || {};

  canvas.resetStage(Layout);

  Layout.init(options.template, options.style);
  Layout.layout(canvas.sharedContext);

  if (options.hideScrollbar !== false) {
    hideListScrollbar(options.scrollListId);
  }

  if (typeof options.bindEvents === "function") {
    options.bindEvents(Layout);
  }
}

module.exports = {
  render: render,
  hideListScrollbar: hideListScrollbar,
  Layout: Layout,
};
