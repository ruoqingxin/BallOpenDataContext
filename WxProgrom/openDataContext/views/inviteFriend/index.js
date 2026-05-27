const MSG = require("../../constants/msg.js");
const canvas = require("../../core/canvas.js");
const images = require("../../core/images.js");
const viewport = require("../../core/viewport.js");
const renderer = require("../../core/renderer.js");
const friends = require("./friends.js");
const share = require("./share.js");

const style = require("./render/style.js");
const tplFn = require("./render/tplfn.js");
const assets = require("./render/assets.js");

const friendState = friends.createState();

let visible = false;
let drawToken = 0;
let shareConfig = {
  roomId: 0,
  roomName: "",
  shareTxt: "",
  shareImageUrl: "",
  shareImageUrlId: "",
};

function draw() {
  if (!visible) {
    return;
  }

  if (!viewport.isValid()) {
    console.warn("[OpenData] draw skipped: invalid viewport");
    canvas.resetStage(renderer.Layout);
    return;
  }

  const token = ++drawToken;

  canvas.resetStage(renderer.Layout);

  images.ensureImagesLoaded(assets, function () {
    if (!visible || token !== drawToken) {
      return;
    }

    const template = tplFn({
      data: friendState.users,
      images: images.getLocalImages(assets),
      emptyText: "暂无可邀请的微信好友",
    });

    try {
      renderer.render({
        template: template,
        style: style,
        bindEvents: function (Layout) {
          share.bindInviteEvents(Layout, friendState.users, shareConfig);
        },
      });
    } catch (err) {
      console.error("[OpenData] inviteFriend draw failed:", err);
    }
  });
}

function show(message) {
  message = message || {};

  shareConfig = {
    roomId: Number(message.room_id) || 0,
    roomName: String(message.room_name || message.nick || ""),
    shareTxt: String(message.share_txt || ""),
    shareImageUrl: String(message.share_image_url || ""),
    shareImageUrlId: String(message.share_image_url_id || ""),
  };

  visible = true;
  drawToken++;

  canvas.resetStage(renderer.Layout);
  canvas.drawPlaceholder(viewport);

  if (friendState.loadedFriends) {
    draw();
    return;
  }

  friendState.users = [];
  draw();

  friends.loadFriends(friendState, function () {
    if (!visible) {
      return;
    }
    draw();
  });
}

function hide() {
  visible = false;
  drawToken++;
  canvas.resetStage(renderer.Layout);
}

function onViewportChange() {
  if (!visible) {
    return;
  }

  canvas.resetStage(renderer.Layout);
  draw();
}

function isVisible() {
  return visible;
}

module.exports = {
  id: "inviteFriend",
  msgTypes: [MSG.ShowInviteFriend],
  assets: assets,
  show: show,
  hide: hide,
  draw: draw,
  onViewportChange: onViewportChange,
  isVisible: isVisible,
};
