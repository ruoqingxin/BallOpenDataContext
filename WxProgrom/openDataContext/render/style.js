/**
 * Layout 样式 — 由 assets/prefab/UIGameRoomView.lh 转换
 * 标记 @prefab-sync-start … @prefab-sync-end 区块供 prefab-to-style.js 覆盖，请勿手改。
 */
// @prefab-sync-start
module.exports = {
  container: {
    width: 350,
    height: 601,
    position: "relative",
  },
  list_items: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 350,
    height: 601,
    flexDirection: "column",
    scrollY: true,
  },
  item: {
    width: 350,
    height: 122,
    position: "relative",
    flexShrink: 0,
  },
  img_head: {
    position: "absolute",
    left: 15,
    top: 13,
    width: 100,
    height: 100,
  },
  txt_nick: {
    position: "absolute",
    left: 130,
    top: 18,
    width: 194,
    height: 41,
    fontSize: 26,
    color: "#ffffff",
    verticalAlign: "middle",
    textOverflow: "ellipsis",
    textStrokeWidth: 1,
    textStrokeColor: "#3e5496",
  },
  btn_invite: {
    position: "absolute",
    left: 242,
    top: 73,
    width: 100,
    height: 36,
  },
  txt_title: {
    position: "absolute",
    left: 243,
    top: 72,
    width: 97,
    height: 37,
    fontSize: 18,
    color: "#9e5621",
    verticalAlign: "middle",
    textAlign: "center",
    textOverflow: "ellipsis",
    textStrokeColor: "#373899",
    textStrokeWidth: 1,
  },
  img_line: {
    position: "absolute",
    left: 0,
    top: 121,
    width: 350,
    height: 1,
  },
  emptyText: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 350,
    height: 601,
    fontSize: 24,
    color: "#999999",
    textAlign: "center",
    verticalAlign: "middle",
  }
};
// @prefab-sync-end
