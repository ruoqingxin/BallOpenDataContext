/**
 * 微信开放数据域入口 — Layout 标准方案
 * 设计源：assets/prefab/UIGameRoomView.lh
 * 文档：https://layaair.com/3.x/doc/IDE/uiEditor/uiComponent/OpenDataContextView/readme.html
 */
const style = require("./render/style.js");
const tplFn = require("./render/tplfn.js");

function loadLayout() {
  try {
    return require("./engine.js").default;
  } catch (e) {
    return require("../libs/engine.js").default;
  }
}

const Layout = loadLayout();
const sharedCanvas = wx.getSharedCanvas();
const sharedContext = sharedCanvas.getContext("2d");

const MSG = {
  ShowInviteFriend: "od:showInviteFriend",
  HideInviteFriend: "od:hideInviteFriend",
  UpdateViewPort: "updateViewPort",
  Close: "close",
};

const DEFAULT_AVATAR = "image/icon_800000.png";
const FRIEND_KEY = "invite_tag";

let visible = false;
let loadingFriends = false;
let loadedFriends = false;
let users = [];
let shareConfig = {
  roomId: 0,
  roomName: "",
  shareTxt: "",
  shareImageUrl: "",
  shareImageUrlId: "",
};

function mapFriends(list) {
  const result = [];
  const seen = new Set();
  for (const item of list) {
    const openid =
      typeof (item && item.openid) === "string" ? item.openid.trim() : "";
    if (!openid || seen.has(openid)) {
      continue;
    }
    seen.add(openid);
    const name = (item && (item.nickName || item.nickname)) || "";
    result.push({
      openid,
      nickname: typeof name === "string" && name.trim() ? name : "微信好友",
      avatarUrl:
        typeof (item && item.avatarUrl) === "string" && item.avatarUrl
          ? item.avatarUrl
          : DEFAULT_AVATAR,
    });
  }
  return result;
}

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
    query,
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

function bindInviteEvents() {
  const items = Layout.getElementsByClassName("item") || [];
  const buttons = Layout.getElementsByClassName("btn_invite") || [];
  buttons.forEach((btn, index) => {
    if (!btn || typeof btn.on !== "function") {
      return;
    }
    const item = items[index];
    const openid =
      (item && item.dataset && item.dataset.openid) ||
      (users[index] && users[index].openid) ||
      "";
    btn.on("click", () => {
      if (openid) {
        shareToFriend(openid);
      }
    });
  });
}

function draw() {
  if (!visible) {
    Layout.clear();
    Layout.layout(sharedContext);
    return;
  }

  const template = tplFn({
    data: users,
    emptyText: "暂无可邀请的微信好友",
  });
  Layout.clear();
  Layout.init(template, style);
  Layout.layout(sharedContext);
  bindInviteEvents();
}

function loadFriends(done) {
  if (loadingFriends) {
    return;
  }
  if (loadedFriends) {
    done && done();
    return;
  }
  loadingFriends = true;
  wx.getFriendCloudStorage({
    keyList: [FRIEND_KEY],
    success: (res) => {
      users = mapFriends(Array.isArray(res && res.data) ? res.data : []);
      loadedFriends = true;
      done && done();
    },
    fail: (err) => {
      console.log("[OpenData] getFriendCloudStorage fail:", err);
      users = [];
      done && done();
    },
    complete: () => {
      loadingFriends = false;
    },
  });
}

function showInvite(message) {
  shareConfig = {
    roomId: Number(message.room_id) || 0,
    roomName: String(message.room_name || ""),
    shareTxt: String(message.share_txt || ""),
    shareImageUrl: String(message.share_image_url || ""),
    shareImageUrlId: String(message.share_image_url_id || ""),
  };
  visible = true;
  loadFriends(draw);
}

function hideInvite() {
  visible = false;
  Layout.clear();
  Layout.layout(sharedContext);
}

function handleMessage(data) {
  if (!data || typeof data.type !== "string") {
    return;
  }
  switch (data.type) {
    case MSG.UpdateViewPort:
      if (data.box) {
        Layout.updateViewPort(data.box);
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
}

function init() {
  wx.onMessage(handleMessage);
}

init();
