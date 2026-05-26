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
 * 预加载开放域资源图
 */
function ensureImagesLoaded(callback) {
  if (imagesReady) {
    callback();
    return;
  }

  imageLoadQueue.push(callback);

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
      queue[i]();
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
    const item = list[i];
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
  if (loadingFriends || loadedFriends) {
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
      const elements = Layout.getElementsById("btn_" + index);
      const btn = elements && elements[0];

      if (!btn || !user) {
        return;
      }

      btn.on("click", function () {
        shareToFriend(user.openid);
      });
    })(i);
  }
}

/**
 * 当前布局使用的逻辑宽度（与 prefab 列表宽一致，默认 350）
 */
function getLayoutWidth() {
  const viewPortWidth = currentViewPort ? Number(currentViewPort.width) || 0 : 0;
  return viewPortWidth > 0 ? viewPortWidth : 350;
}

/**
 * 当前布局使用的逻辑高度
 */
function getLayoutHeight() {
  const scaleX = getViewPortScaleX();
  const viewPortHeight = currentViewPort ? Number(currentViewPort.height) || 0 : 0;

  if (viewPortHeight > 0 && scaleX > 0) {
    return viewPortHeight / scaleX;
  }

  return Number(sharedCanvas.height) || 601;
}

function getViewPortScaleX() {
  const viewPortWidth = currentViewPort ? Number(currentViewPort.width) || 0 : 0;
  return viewPortWidth > 0 ? viewPortWidth / getLayoutWidth() : 1;
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
 * 正式绘制
 */
function draw() {
  if (!visible) {
    return;
  }

  if (!hasValidViewPort()) {
    console.warn("[OpenData] draw skipped: invalid viewport", currentViewPort);
    return;
  }

  ensureImagesLoaded(function () {
    const template = tplFn({
      data: users,
      images: getLocalImages(),
      emptyText: "暂无可邀请的微信好友",
    });

    Layout.clear();
    Layout.init(template, style);
    Layout.layout(sharedContext);
    bindInviteEvents();
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
  loadFriends(draw);
}

/**
 * 隐藏邀请面板
 */
function hideInvite() {
  visible = false;
  Layout.clear();
}

/**
 * 主消息入口
 */
function init() {
  wx.onMessage(function (data) {
    if (!data || typeof data.type !== "string") {
      return;
    }

    console.error("[OpenData] init", JSON.stringify(data));

    switch (data.type) {
      case MSG.UpdateViewPort:
        if (data.box) {
          currentViewPort = {
            x: Number(data.box.x) || 0,
            y: Number(data.box.y) || 0,
            width: Number(data.box.width) || 0,
            height: Number(data.box.height) || 0,
          };

          Layout.updateViewPort(getLayoutViewPort());
        }

        if (visible) {
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
