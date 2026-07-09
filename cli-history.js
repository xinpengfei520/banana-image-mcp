// banana-image-mcp 生图历史查看器 / generation history viewer
// 用法 / usage: banana-image-mcp history
import readline from "readline";
import { readHistory, HISTORY_FILE } from "./history-store.js";

const PAGE_SIZE = 10;

// ====== ANSI 颜色 ======
const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
};

// ====== 显示宽度处理（中文/emoji 记为 2） ======
function isWide(code) {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0x303e) ||
    (code >= 0x3041 && code <= 0x33ff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xa000 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1faff) ||
    (code >= 0x20000 && code <= 0x3fffd)
  );
}

function dispWidth(s) {
  let w = 0;
  for (const ch of s) w += isWide(ch.codePointAt(0)) ? 2 : 1;
  return w;
}

function padEndW(s, width) {
  const w = dispWidth(s);
  return w >= width ? s : s + " ".repeat(width - w);
}

function padStartW(s, width) {
  const w = dispWidth(s);
  return w >= width ? s : " ".repeat(width - w) + s;
}

function truncW(s, max) {
  if (dispWidth(s) <= max) return s;
  let out = "";
  let w = 0;
  for (const ch of s) {
    const cw = dispWidth(ch);
    if (w + cw > max - 1) break;
    out += ch;
    w += cw;
  }
  return out + "…";
}

// ====== 字段格式化 ======
function fmtTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso || "—";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fmtSize(bytes) {
  if (bytes == null || isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDur(sec) {
  if (sec == null || isNaN(sec)) return "—";
  return `${Number(sec).toFixed(1)}s`;
}

function toolLabel(tool) {
  return tool === "generate_blog_cover"
    ? "封面"
    : tool === "generate_image"
    ? "生图"
    : tool === "upload_image"
    ? "上传"
    : "其他";
}

// 精简模型名：去掉 "models/" 与冗余的 "gemini-" 前缀（如 gemini-3.1-flash-lite-image -> 3.1-flash-lite-image）
function shortModel(m) {
  if (!m) return "—";
  return String(m).replace(/^models\//, "").replace(/^gemini-/, "");
}

// ====== 表格渲染 ======
const COLS = { idx: 3, time: 19, result: 6, type: 4, model: 23, size: 9, dur: 7 };
const GAP_COUNT = 7; // 8 列之间共 7 个列间距

function linkWidth() {
  const term = process.stdout.columns || 100;
  const fixed =
    COLS.idx + COLS.time + COLS.result + COLS.type + COLS.model + COLS.size + COLS.dur;
  const gaps = 2 * GAP_COUNT;
  return Math.max(24, term - 1 - fixed - gaps);
}

function headerLine() {
  const lw = linkWidth();
  const parts = [
    padStartW("#", COLS.idx),
    padEndW("时间", COLS.time),
    padEndW("结果", COLS.result),
    padEndW("类型", COLS.type),
    padEndW("模型", COLS.model),
    padEndW("大小", COLS.size),
    padEndW("耗时", COLS.dur),
    padEndW("链接 / 失败原因", lw),
  ];
  return " " + C.bold + parts.join("  ") + C.reset;
}

function separatorLine() {
  const lw = linkWidth();
  const total =
    COLS.idx + COLS.time + COLS.result + COLS.type + COLS.model +
    COLS.size + COLS.dur + lw + 2 * GAP_COUNT;
  return " " + C.gray + "─".repeat(total) + C.reset;
}

function rowLine(rec, globalIndex) {
  const lw = linkWidth();
  const ok = rec.status === "success";

  const idx = padStartW(String(globalIndex), COLS.idx);
  const time = padEndW(fmtTime(rec.time), COLS.time);
  const resultPlain = ok ? "✓ 成功" : "✗ 失败";
  const result =
    (ok ? C.green : C.red) + padEndW(resultPlain, COLS.result) + C.reset;
  const type = C.dim + padEndW(toolLabel(rec.tool), COLS.type) + C.reset;
  const model = padEndW(truncW(shortModel(rec.model), COLS.model), COLS.model);
  const size = padEndW(fmtSize(rec.size), COLS.size);
  const dur = padEndW(fmtDur(rec.duration), COLS.dur);

  let last;
  if (ok) {
    last = C.cyan + truncW(rec.url || "—", lw) + C.reset;
  } else {
    last = C.red + truncW(rec.error || "未知错误", lw) + C.reset;
  }

  return " " + [idx, time, result, type, model, size, dur, last].join("  ");
}

function renderPage(records, page, pages) {
  const lines = [];
  lines.push("");
  lines.push(
    ` ${C.bold}🍌 生图历史 / Generation History${C.reset}  ${C.dim}(${records.length} 条 / entries)${C.reset}`
  );
  lines.push("");
  lines.push(headerLine());
  lines.push(separatorLine());

  const start = page * PAGE_SIZE;
  const slice = records.slice(start, start + PAGE_SIZE);
  slice.forEach((rec, i) => lines.push(rowLine(rec, start + i + 1)));

  lines.push(separatorLine());
  const nav =
    pages > 1
      ? `${C.dim}第 ${page + 1}/${pages} 页 · ↑/↓ 或 j/k 翻页 · q 退出 (Page ${
          page + 1
        }/${pages} · ↑/↓ navigate · q quit)${C.reset}`
      : `${C.dim}共 ${records.length} 条${C.reset}`;
  lines.push(" " + nav);
  lines.push("");
  return lines.join("\n");
}

// ====== 交互式分页 ======
function interactivePager(records, pages) {
  return new Promise((resolve) => {
    let page = 0;
    const draw = () => {
      process.stdout.write("\x1b[2J\x1b[H"); // 清屏并回到左上角
      process.stdout.write(renderPage(records, page, pages) + "\n");
    };

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    draw();

    const onKey = (str, key) => {
      const name = key ? key.name : "";
      if (
        name === "down" ||
        name === "j" ||
        name === "n" ||
        name === "pagedown" ||
        name === "right" ||
        str === " "
      ) {
        if (page < pages - 1) {
          page++;
          draw();
        }
      } else if (
        name === "up" ||
        name === "k" ||
        name === "p" ||
        name === "pageup" ||
        name === "left"
      ) {
        if (page > 0) {
          page--;
          draw();
        }
      } else if (name === "home") {
        page = 0;
        draw();
      } else if (name === "end") {
        page = pages - 1;
        draw();
      } else if (name === "q" || name === "escape" || (key && key.ctrl && name === "c")) {
        cleanup();
      }
    };

    const cleanup = () => {
      process.stdin.removeListener("keypress", onKey);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      resolve();
    };

    process.stdin.on("keypress", onKey);
  });
}

// ====== 入口 ======
export async function runHistory() {
  const records = readHistory().reverse(); // 时间倒序，最新在前
  if (!records.length) {
    console.log(
      `\n暂无生图历史 / No generation history yet.\n${C.dim}日志文件 / log: ${HISTORY_FILE}${C.reset}\n`
    );
    return;
  }

  const pages = Math.ceil(records.length / PAGE_SIZE);

  // 非交互终端：直接打印最近 10 条
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    console.log(renderPage(records, 0, pages));
    if (pages > 1) {
      console.log(
        ` ${C.dim}仅显示最近 ${PAGE_SIZE} 条；在交互式终端中运行可翻页查看更多。${C.reset}\n`
      );
    }
    return;
  }

  if (pages === 1) {
    console.log(renderPage(records, 0, pages));
    return;
  }

  await interactivePager(records, pages);
}
