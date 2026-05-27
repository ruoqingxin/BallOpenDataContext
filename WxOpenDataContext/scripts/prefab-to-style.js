#!/usr/bin/env node
"use strict";

/**
 * 将 Laya prefab (.lh) 转为开放域 Layout 的 style.js（静态对象格式）
 *
 * 用法：
 *   node WxOpenDataContext/scripts/prefab-to-style.js
 *   node WxOpenDataContext/scripts/prefab-to-style.js --prefab assets/prefab/UIGameRoomView.lh
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const args = process.argv.slice(2);

function getArg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? path.resolve(args[i + 1]) : fallback;
}

const prefabPath = getArg(
  "--prefab",
  path.join(projectRoot, "assets/prefab/UIGameRoomView.lh")
);
const stylePath = getArg(
  "--out",
  path.join(
    projectRoot,
    "scripts/openDataContext/views/inviteFriend/render/style.js"
  )
);

const MARK_START = "// @prefab-sync-start";
const MARK_END = "// @prefab-sync-end";

function num(v, fallback) {
  return v == null ? fallback : Number(v);
}

function findList(root) {
  function walk(node) {
    if (node._$type === "GList") {
      return node;
    }
    for (const child of node._$child || []) {
      const found = walk(child);
      if (found) {
        return found;
      }
    }
    return null;
  }
  return walk(root);
}

function findItemTemplate(listNode) {
  const ref = listNode._templateNode && listNode._templateNode._$ref;
  if (ref) {
    const item = (listNode._$child || []).find((c) => c._$id === ref);
    if (item) {
      return item;
    }
  }
  return (listNode._$child || []).find((c) => c.name === "item") || null;
}

function absBox(node) {
  const style = {
    position: "absolute",
    left: num(node.x, 0),
    top: num(node.y, 0),
    width: num(node.width),
    height: num(node.height),
  };
  return style;
}

function textBox(node) {
  const style = absBox(node);
  style.fontSize = num(node.fontSize, 26);
  style.color = node.color || "#ffffff";
  style.verticalAlign = node.valign === "top" ? "top" : "middle";
  if (node.align === "center") {
    style.textAlign = "center";
  }
  if (node.overflow === "ellipsis") {
    style.textOverflow = "ellipsis";
  }
  if (node.stroke != null) {
    style.textStrokeWidth = num(node.stroke);
  }
  if (node.strokeColor) {
    style.textStrokeColor = node.strokeColor;
    if (style.textStrokeWidth == null) {
      style.textStrokeWidth = 1;
    }
  }
  return style;
}

function flattenItemNodes(itemNode) {
  const result = [];
  const itemW = num(itemNode.width, 350);

  function addNode(node, offsetX, offsetY) {
    const name = node.name;
    if (!name) {
      return;
    }

    if (node._$type === "GTextField") {
      result.push({ name, style: textBox(node) });
      return;
    }

    if (node._$type === "GImage" || node.src) {
      const style = absBox(node);
      if (name === "img_line" && !node.x && itemW) {
        style.width = itemW;
      }
      result.push({ name, style });
      return;
    }

    for (const child of node._$child || []) {
      addNode(
        child,
        offsetX + num(node.x, 0),
        offsetY + num(node.y, 0)
      );
    }
  }

  for (const child of itemNode._$child || []) {
    addNode(child, 0, 0);
  }

  // btn 内文字：合并为相对 item 的绝对坐标
  const btn = (itemNode._$child || []).find((c) => c.name === "btn_invite");
  if (btn) {
    const txt = (btn._$child || []).find((c) => c.name === "txt_title");
    if (txt) {
      const merged = textBox(txt);
      merged.left = num(btn.x, 0) + num(txt.x, 0);
      merged.top = num(btn.y, 0) + num(txt.y, 0);
      const idx = result.findIndex((r) => r.name === "txt_title");
      if (idx >= 0) {
        result[idx].style = merged;
      } else {
        result.push({ name: "txt_title", style: merged });
      }
    }
  }

  return result;
}

function formatObject(obj, indent) {
  const pad = "  ".repeat(indent);
  const lines = ["{"];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (typeof value === "string") {
      lines.push(`${pad}  ${key}: ${JSON.stringify(value)},`);
    } else {
      lines.push(`${pad}  ${key}: ${value},`);
    }
  }
  lines.push(`${pad}}`);
  return lines.join("\n");
}

function convert(prefab) {
  const root = prefab;
  const list = findList(root);
  if (!list) {
    throw new Error("prefab 中未找到 GList");
  }

  const item = findItemTemplate(list);
  if (!item) {
    throw new Error("GList 未找到 item 模板");
  }

  const rootW = num(root.width, num(list.width, 350));
  const rootH = num(root.height, num(list.height, 601));
  const listW = num(list.width, rootW);
  const listH = num(list.height, rootH);
  const listX = num(list.x, 0);
  const listY = num(list.y, 0);

  const styles = {
    container: {
      width: rootW,
      height: rootH,
      position: "relative",
    },
    list_items: {
      position: "absolute",
      left: listX,
      top: listY,
      width: listW,
      height: listH,
      flexDirection: "column",
      scrollY: true,
    },
    item: {
      width: num(item.width, listW),
      height: num(item.height, 122),
      position: "relative",
      flexShrink: 0,
    },
    emptyText: {
      position: "absolute",
      left: listX,
      top: listY,
      width: listW,
      height: listH,
      fontSize: 24,
      color: "#999999",
      textAlign: "center",
      verticalAlign: "middle",
    },
  };

  for (const { name, style } of flattenItemNodes(item)) {
    styles[name] = style;
  }

  return styles;
}

function buildFileContent(styles, prefabRel) {
  const lines = [
    "/**",
    " * Layout 样式 — 由 assets/prefab/UIGameRoomView.lh 转换",
    " * 标记 @prefab-sync-start … @prefab-sync-end 区块供 prefab-to-style.js 覆盖，请勿手改。",
    " */",
    MARK_START,
  ];

  lines.push("module.exports = {");

  const order = [
    "container",
    "list_items",
    "item",
    "img_head",
    "txt_nick",
    "btn_invite",
    "txt_title",
    "img_line",
    "emptyText",
  ];

  const keys = [
    ...order.filter((k) => styles[k]),
    ...Object.keys(styles).filter((k) => order.indexOf(k) < 0),
  ];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    lines.push(`  ${key}: ${formatObject(styles[key], 1)}${i < keys.length - 1 ? "," : ""}`);
  }

  lines.push("};", MARK_END, "");
  return lines.join("\n");
}

function writeStyleFile(content) {
  const dir = path.dirname(stylePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(stylePath)) {
    const old = fs.readFileSync(stylePath, "utf8");
    const re = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`);
    if (re.test(old)) {
      fs.writeFileSync(
        stylePath,
        old.replace(
          re,
          content.slice(content.indexOf(MARK_START), content.indexOf(MARK_END) + MARK_END.length)
        ),
        "utf8"
      );
      return;
    }
  }

  fs.writeFileSync(stylePath, content, "utf8");
}

// --- main ---
if (!fs.existsSync(prefabPath)) {
  console.error("[prefab-to-style] 找不到 prefab:", prefabPath);
  process.exit(1);
}

const prefab = JSON.parse(fs.readFileSync(prefabPath, "utf8"));
const styles = convert(prefab);
const prefabRel = path.relative(projectRoot, prefabPath).replace(/\\/g, "/");
const content = buildFileContent(styles, prefabRel);

writeStyleFile(content);

console.log("[prefab-to-style] 已写入", stylePath);
console.log("  prefab:", prefabPath);
console.log("  节点:", Object.keys(styles).join(", "));
