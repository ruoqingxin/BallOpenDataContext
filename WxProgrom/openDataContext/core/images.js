const Layout = require("../engine.js").default;

let imagesReady = false;
let imagesLoading = false;
let imageLoadQueue = [];

function resolveLocalImage(storedPath) {
  if (!storedPath || /^https?:\/\//i.test(storedPath)) {
    return storedPath;
  }

  const normalized = storedPath.replace(/^\.\//, "");
  const gameRootPath =
    normalized.indexOf("openDataContext/") === 0
      ? normalized
      : "openDataContext/" + normalized;

  const shortPath =
    normalized.indexOf("openDataContext/") === 0
      ? normalized.slice("openDataContext/".length)
      : normalized;

  const candidates = [
    shortPath,
    "./" + shortPath,
    gameRootPath,
    "./" + gameRootPath,
  ];

  if (typeof wx !== "undefined" && wx.getFileSystemManager) {
    const fs = wx.getFileSystemManager();

    for (let i = 0; i < candidates.length; i++) {
      try {
        fs.accessSync(candidates[i]);
        return gameRootPath;
      } catch (err) {}
    }
  }

  return gameRootPath;
}

function getLocalImages(localImages) {
  const images = {};
  const list = Array.isArray(localImages) ? localImages : [];

  for (let i = 0; i < list.length; i++) {
    const path = list[i];
    const name = path.split("/").pop();
    images[name] = resolveLocalImage(path);
  }

  return images;
}

function ensureImagesLoaded(localImages, callback) {
  if (imagesReady) {
    callback && callback();
    return;
  }

  if (typeof callback === "function") {
    imageLoadQueue.push(callback);
  }

  if (imagesLoading) {
    return;
  }

  imagesLoading = true;

  const list = Array.isArray(localImages) ? localImages : [];
  const sources = list.map(resolveLocalImage);

  const finish = function () {
    imagesReady = true;
    imagesLoading = false;

    const queue = imageLoadQueue.slice();
    imageLoadQueue.length = 0;

    for (let i = 0; i < queue.length; i++) {
      try {
        queue[i] && queue[i]();
      } catch (err) {
        console.error("[OpenData] image load callback failed:", err);
      }
    }
  };

  if (typeof Layout.loadImgs === "function" && sources.length > 0) {
    Layout.loadImgs(sources)
      .then(finish)
      .catch(function (err) {
        console.error("[OpenData] Layout.loadImgs failed:", err);
        finish();
      });
    return;
  }

  finish();
}

module.exports = {
  resolveLocalImage: resolveLocalImage,
  getLocalImages: getLocalImages,
  ensureImagesLoaded: ensureImagesLoaded,
};
