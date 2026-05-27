const MSG = require("./constants/msg.js");
const images = require("./core/images.js");
const viewport = require("./core/viewport.js");
const inviteFriend = require("./views/inviteFriend/index.js");

const views = [inviteFriend];

const viewByMsg = {};
for (let i = 0; i < views.length; i++) {
  const view = views[i];
  const types = view.msgTypes || [];

  for (let j = 0; j < types.length; j++) {
    viewByMsg[types[j]] = view;
  }
}

let activeView = null;

function collectAssets() {
  const all = [];

  for (let i = 0; i < views.length; i++) {
    const list = views[i].assets;
    if (Array.isArray(list)) {
      all.push.apply(all, list);
    }
  }

  return all;
}

function showView(view, message) {
  if (activeView && activeView !== view) {
    activeView.hide();
  }

  activeView = view;
  view.show(message);
}

function hideActiveView() {
  if (activeView) {
    activeView.hide();
    activeView = null;
  }
}

function init() {
  images.ensureImagesLoaded(collectAssets(), function () {
    console.log("[OpenData] images preloaded");
  });

  wx.onMessage(function (data) {
    if (!data || typeof data.type !== "string") {
      return;
    }

    switch (data.type) {
      case MSG.UpdateViewPort:
        viewport.update(data.box);

        if (activeView && activeView.isVisible && activeView.isVisible()) {
          activeView.onViewportChange();
        }
        break;

      case MSG.Close:
        hideActiveView();
        break;

      default: {
        const view = viewByMsg[data.type];
        if (view) {
          showView(view, data);
        }
        break;
      }
    }
  });
}

init();
