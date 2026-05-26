/**
 * 微信开放数据域入口 — Layout 标准方案
 * 设计源：assets/prefab/UIGameRoomView.lh
 * 文档：https://layaair.com/3.x/doc/IDE/uiEditor/uiComponent/OpenDataContextView/readme.html
 */
require("./weapp-adapter.js");

const style = require("./render/style.js");
const tplFn = require("./render/tplfn.js");
const localImages = require("./render/assets.js");
const Layout = require("./engine.js").default;

const sharedCanvas = wx.getSharedCanvas();
const sharedContext = sharedCanvas.getContext("2d");

const MSG = {
  ShowInviteFriend: "od:showInviteFriend",
  HideInviteFriend: "od:hideInviteFriend",
  UpdateViewPort: "updateViewPort",
  Close: "close",
};

let shareConfig = {
  roomId: 0,
  roomName: "",
  shareTxt: "",
  shareImageUrl: "",
  shareImageUrlId: "",
};

let users = [];
let visible = false;
let loadingFriends = false;
let loadedFriends = false;

let imagesReady = false;
let imagesLoading = false;
let imageLoadQueue = [];

let currentViewPort = null;
let drawToken = 0;

/**
 * sharedCanvas 在不同环境下的本地资源路径兼容
 */
function resolveLocalImage(storedPath) {
  if (!storedPath || /^https?:\/\//i.test(storedPath)) {
    return storedPath;
  }

  const normalized = storedPath.replace(/^\.\//, "");
  const shortPath =
    normalized.indexOf("openDataContext/") === 0
      ? normalized.slice("openDataContext/".length)
      : normalized;

  const gameRootPath =
    normalized.indexOf("openDataContext/") === 0
      ? normalized
      : "openDataContext/" + normalized;

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
      } catch (err) {
        // try next
      }
    }

    console.warn(
      "[OpenData] image not found:",
      gameRootPath,
      "tried:",
      candidates.join(", ")
    );
  }

  return gameRootPath;
}

function getLocalImages() {
  const images = {};
  for (let i = 0; i < localImages.length; i++) {
    const path = localImages[i];
    const name = path.split("/").pop();
    images[name] = resolveLocalImage(path);
  }
  return images;
}

/**
 * 清空 sharedCanvas，避免切换残留
 */
function clearSharedCanvas() {
  try {
    sharedContext.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height);
  } catch (err) {
    console.error("[OpenData] clearSharedCanvas failed:", err);
  }
}

/**
 * 清空 Layout + 画布
 */
function resetStage() {
  try {
    Layout.clear();
  } catch (err) {
    console.error("[OpenData] Layout.clear failed:", err);
  }

  clearSharedCanvas();
}

/**
 * 预加载开放域资源图
 */
function ensureImagesLoaded(callback) {
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

  const sources = localImages.map(resolveLocalImage);

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

  if (typeof Layout.loadImgs === "function") {
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

/**
 * 过滤和整理微信好友数据
 */
function mapFriends(list) {
  const result = [];
  const seen = new Set();

  for (let i = 0; i < list.length; i++) {
    const item = list[i] || {};
    const openid = typeof item.openid === "string" ? item.openid.trim() : "";

    if (!openid || seen.has(openid)) {
      continue;
    }

    seen.add(openid);

    const name = item.nickName || item.nickname;

    result.push({
      openid: openid,
      nickName: typeof name === "string" && name.trim() ? name : "微信好友",
      nickname: typeof name === "string" && name.trim() ? name : "微信好友",
      avatarUrl: typeof item.avatarUrl === "string" ? item.avatarUrl : "",
    });
  }

  return result;
}

function fillFriendsForTest(list, targetCount) {
  if (!list.length || list.length >= targetCount) {
    return list.slice(0, targetCount);
  }

  const result = list.slice();
  let index = 0;

  while (result.length < targetCount) {
    const source = list[index % list.length];
    const copyIndex = Math.floor(index / list.length) + 1;

    result.push(
      Object.assign({}, source, {
        openid: source.openid + "_test_" + copyIndex,
      })
    );

    index++;
  }

  return result;
}

/**
 * 拉取微信好友列表
 */
function loadFriends(done) {
  if (loadingFriends) {
    if (typeof done === "function") {
      done();
    }
    return;
  }

  if (loadedFriends) {
    if (typeof done === "function") {
      done();
    }
    return;
  }

  loadingFriends = true;

  let cloudFriends = [];
  let potentialFriends = [];
  let pending = 0;
  let settled = false;

  function finishSource() {
    pending--;

    if (pending > 0 || settled) {
      return;
    }

    settled = true;
    users = fillFriendsForTest(
      mapFriends(cloudFriends.concat(potentialFriends)),
      10
    );
    loadedFriends = true;
    loadingFriends = false;

    if (typeof done === "function") {
      done();
    }
  }

  function startSource() {
    pending++;
  }

  startSource();
  wx.getFriendCloudStorage({
    keyList: ["kv_data"],
    success: function (res) {
      cloudFriends = Array.isArray(res && res.data) ? res.data : [];
    },
    fail: function (err) {
      console.error("[OpenData] getFriendCloudStorage failed:", err);
    },
    complete: finishSource,
  });

  if (typeof wx.getPotentialFriendList === "function") {
    startSource();
    wx.getPotentialFriendList({
      success: function (res) {
        potentialFriends = Array.isArray(res && res.list) ? res.list : [];
      },
      fail: function (err) {
        console.error("[OpenData] getPotentialFriendList failed:", err);
      },
      complete: finishSource,
    });
  }
}

/**
 * 发起分享邀请
 */
function shareToFriend(openid) {
  const query =
    "room_id=" +
    encodeURIComponent(String(shareConfig.roomId)) +
    "&room_name=" +
    encodeURIComponent(shareConfig.roomName) +
    "&invite_openid=" +
    encodeURIComponent(openid);

  const payload = {
    title: shareConfig.shareTxt,
    imageUrl: shareConfig.shareImageUrl,
    query: query,
  };

  if (typeof wx.shareMessageToFriend === "function") {
    wx.shareMessageToFriend(Object.assign({}, payload, { openId: openid }));
  } else if (typeof wx.shareAppMessage === "function") {
    wx.shareAppMessage(
      Object.assign({}, payload, {
        imageUrlId: shareConfig.shareImageUrlId,
      })
    );
  }
}

/**
 * 绑定按钮点击
 */
function bindInviteEvents() {
  for (let i = 0; i < users.length; i++) {
    (function (index) {
      const user = users[index];
      const btnElements = Layout.getElementsById("btn_" + index);
      const btn = btnElements && btnElements[0];

      if (btn && user) {
        btn.on("click", function () {
          shareToFriend(user.openid);
        });
      }

      const txtElements = Layout.getElementsById("txt_" + index);
      const txt = txtElements && txtElements[0];

      if (txt && user) {
        txt.on("click", function () {
          shareToFriend(user.openid);
        });
      }
    })(i);
  }
}

function hasValidViewPort() {
  return !!(
    currentViewPort &&
    Number(currentViewPort.width) > 0 &&
    Number(currentViewPort.height) > 0
  );
}

/**
 * Layout 在开放域内收到的是 sharedCanvas 本地触摸坐标。
 * 主域窗口的 x/y 只用于主域摆放开放域画布，不能再叠加到子域命中坐标。
 */
function getLayoutViewPort() {
  return {
    x: currentViewPort ? Number(currentViewPort.x) || 0 : 0,
    y: currentViewPort ? Number(currentViewPort.y) || 0 : 0,
    width: currentViewPort ? Number(currentViewPort.width) || 0 : 0,
    height: currentViewPort ? Number(currentViewPort.height) || 0 : 0,
  };
}

/**
 * 先画一个空白底，避免首次显示黑一下
 */
function drawPlaceholder() {
  if (!hasValidViewPort()) {
    return;
  }

  resetStage();

  try {
    sharedContext.fillStyle = "#ffffff";
    sharedContext.fillRect(0, 0, sharedCanvas.width, sharedCanvas.height);
  } catch (err) {
    console.error("[OpenData] drawPlaceholder failed:", err);
  }
}

/**
 * 正式绘制
 */
function draw() {
  if (!visible) {
    return;
  }

  if (!hasValidViewPort()) {
    console.warn("[OpenData] draw skipped: invalid viewport", currentViewPort);
    resetStage();
    return;
  }

  const token = ++drawToken;

  resetStage();

  ensureImagesLoaded(function () {
    if (!visible || token !== drawToken) {
      return;
    }

    const template = tplFn({
      data: users,
      images: getLocalImages(),
      emptyText: "暂无可邀请的微信好友",
    });

    resetStage();

    try {
      Layout.init(template, style);
      Layout.layout(sharedContext);
      bindInviteEvents();
    } catch (err) {
      console.error("[OpenData] draw failed:", err);
    }
  });
}

/**
 * 展示邀请面板
 */
function showInvite(message) {
  shareConfig = {
    roomId: Number(message.room_id) || 0,
    roomName: String(message.room_name || message.nick || ""),
    shareTxt: String(message.share_txt || ""),
    shareImageUrl: String(message.share_image_url || ""),
    shareImageUrlId: String(message.share_image_url_id || ""),
  };

  visible = true;
  drawToken++;

  drawPlaceholder();

  if (loadedFriends) {
    draw();
    return;
  }

  users = [];
  draw();

  loadFriends(function () {
    if (!visible) {
      return;
    }
    draw();
  });
}

/**
 * 隐藏邀请面板
 */
function hideInvite() {
  visible = false;
  drawToken++;
  resetStage();
}

/**
 * 主消息入口
 */
function init() {
  ensureImagesLoaded(function () {
    console.log("[OpenData] images preloaded");
  });

  wx.onMessage(function (data) {
    if (!data || typeof data.type !== "string") {
      return;
    }

    console.error("[OpenData] onMessage", JSON.stringify(data));

    switch (data.type) {
      case MSG.UpdateViewPort:
        if (data.box) {
          currentViewPort = {
            x: Number(data.box.x) || 0,
            y: Number(data.box.y) || 0,
            width: Number(data.box.width) || 0,
            height: Number(data.box.height) || 0,
          };

          try {
            Layout.updateViewPort(getLayoutViewPort());
          } catch (err) {
            console.error("[OpenData] updateViewPort failed:", err);
          }
        }

        if (visible) {
          resetStage();
          draw();
        }
        break;

      case MSG.ShowInviteFriend:
        showInvite(data);
        break;

      case MSG.HideInviteFriend:
      case MSG.Close:
        hideInvite();
        break;

      default:
        break;
    }
  });
}

init();