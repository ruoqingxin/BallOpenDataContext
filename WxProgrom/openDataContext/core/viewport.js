const Layout = require("../engine.js").default;

let currentViewPort = null;

function update(box) {
  if (!box) {
    return;
  }

  currentViewPort = {
    x: Number(box.x) || 0,
    y: Number(box.y) || 0,
    width: Number(box.width) || 0,
    height: Number(box.height) || 0,
  };

  try {
    Layout.updateViewPort(getLayoutViewPort());
  } catch (err) {
    console.error("[OpenData] updateViewPort failed:", err);
  }
}

function isValid() {
  return !!(
    currentViewPort &&
    Number(currentViewPort.width) > 0 &&
    Number(currentViewPort.height) > 0
  );
}

function getLayoutViewPort() {
  return {
    x: currentViewPort ? Number(currentViewPort.x) || 0 : 0,
    y: currentViewPort ? Number(currentViewPort.y) || 0 : 0,
    width: currentViewPort ? Number(currentViewPort.width) || 0 : 0,
    height: currentViewPort ? Number(currentViewPort.height) || 0 : 0,
  };
}

module.exports = {
  update: update,
  isValid: isValid,
  getLayoutViewPort: getLayoutViewPort,
};
