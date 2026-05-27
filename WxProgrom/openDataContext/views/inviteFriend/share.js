function shareToFriend(shareConfig, openid) {
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

function bindInviteEvents(Layout, users, shareConfig) {
  for (let i = 0; i < users.length; i++) {
    (function (index) {
      const user = users[index];
      const btnElements = Layout.getElementsById("btn_" + index);
      const btn = btnElements && btnElements[0];

      if (btn && user) {
        btn.on("click", function () {
          shareToFriend(shareConfig, user.openid);
        });
      }

      const txtElements = Layout.getElementsById("txt_" + index);
      const txt = txtElements && txtElements[0];

      if (txt && user) {
        txt.on("click", function () {
          shareToFriend(shareConfig, user.openid);
        });
      }
    })(i);
  }
}

module.exports = {
  shareToFriend: shareToFriend,
  bindInviteEvents: bindInviteEvents,
};
