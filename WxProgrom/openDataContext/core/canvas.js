const sharedCanvas = wx.getSharedCanvas();
const sharedContext = sharedCanvas.getContext("2d");

function clearSharedCanvas() {
  try {
    sharedContext.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height);
  } catch (err) {
    console.error("[OpenData] clearSharedCanvas failed:", err);
  }
}

function resetStage(Layout) {
  try {
    Layout.clear();
  } catch (err) {
    console.error("[OpenData] Layout.clear failed:", err);
  }

  clearSharedCanvas();
}

function drawPlaceholder(viewport) {
  if (!viewport || !viewport.isValid()) {
    return;
  }

  try {
    sharedContext.fillStyle = "rgba(0, 0, 0, 0)";
    sharedContext.fillRect(0, 0, sharedCanvas.width, sharedCanvas.height);
  } catch (err) {
    console.error("[OpenData] drawPlaceholder failed:", err);
  }
}

module.exports = {
  sharedCanvas: sharedCanvas,
  sharedContext: sharedContext,
  clearSharedCanvas: clearSharedCanvas,
  resetStage: resetStage,
  drawPlaceholder: drawPlaceholder,
};
