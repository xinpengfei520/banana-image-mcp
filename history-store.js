// 生图历史存储：以 JSONL 追加写入用户主目录，供 `banana-image-mcp history` 查看
import fs from "fs";
import os from "os";
import path from "path";

export const HISTORY_DIR = path.join(os.homedir(), ".banana-image-mcp");
export const HISTORY_FILE = path.join(HISTORY_DIR, "history.jsonl");

// 追加一条历史记录，永不因日志失败影响主流程
export function appendHistory(record) {
  try {
    if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
    fs.appendFileSync(HISTORY_FILE, JSON.stringify(record) + "\n");
  } catch {
    // 忽略日志写入错误
  }
}

// 读取全部历史记录（按文件顺序，即时间正序）
export function readHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    const raw = fs.readFileSync(HISTORY_FILE, "utf8");
    const records = [];
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        records.push(JSON.parse(t));
      } catch {
        // 跳过损坏的行
      }
    }
    return records;
  } catch {
    return [];
  }
}
