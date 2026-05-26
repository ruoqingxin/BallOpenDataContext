/**
 * Layout 模板函数 — 由 assets/prefab/UIGameRoomView.lh 转换
 * 标记 @prefab-sync-start … @prefab-sync-end 区块供 sync-prefab-layout.js 覆盖，请勿手改。
 */
// @prefab-sync-start
function escAttr(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/'/g, "&#39;");
}

module.exports = function tplFn(it) {
  it = it || {};
  var data = Array.isArray(it.data) ? it.data : [];
  var emptyText = it.emptyText || "暂无可邀请的微信好友";
  var out = '<view id="container" class="container">';

  if (data.length === 0) {
    out +=
      '<text class="emptyText" value="' + escAttr(emptyText) + '"></text>';
  } else {
    out += '<scrollview id="list_items" class="list_items">';
    for (var i = 0; i < data.length; i++) {
      var row = data[i] || {};
      var openid = escAttr(row.openid);
      var nickname = escAttr(row.nickname || "微信好友");
      var avatar = escAttr(row.avatarUrl || "image/icon_800000.png");
      out +=
        '<view class="item" id="item_' +
        i +
        '" data-openid="' +
        openid +
        '">';
      out += '<image class="img_head" src="' + avatar + '"></image>';
      out += '<text class="txt_nick" value="' + nickname + '"></text>';
      out +=
        '<image class="btn_invite" src="image/ui_btn_yellow.png"></image>';
      out += '<text class="txt_title" value="邀请"></text>';
      out +=
        '<image class="img_line" src="image/ui_lt_dgx.png"></image>';
      out += "</view>";
    }
    out += "</scrollview>";
  }

  out += "</view>";
  return out;
};
// @prefab-sync-end
