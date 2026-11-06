// 用户自建风格。写在用户主目录，不放进安装包，更新或重装 MCP 时保留。
import fs from "fs";
import os from "os";
import path from "path";

export function customStylesDir() {
  const override = (process.env.BANANA_IMAGE_MCP_HOME || "").trim();
  return override || path.join(os.homedir(), ".banana-image-mcp");
}

export function customStylesFile() {
  return path.join(customStylesDir(), "styles.json");
}

export class StylesStoreError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "StylesStoreError";
    this.code = code;
  }
}

// 文件不存在时返回空库。文件损坏时抛错，且不会改写原文件。
export function readCustomStyleStore() {
  const file = customStylesFile();
  if (!fs.existsSync(file)) {
    return { version: 1, styles: [] };
  }
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (error) {
    throw new StylesStoreError(
      `Could not read custom styles at ${file}: ${error.message}`,
      "READ_FAILED"
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StylesStoreError(
      `Custom styles file is not valid JSON, so it was left unchanged: ${file}`,
      "CORRUPT"
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.styles)) {
    throw new StylesStoreError(
      `Custom styles file has no styles array, so it was left unchanged: ${file}`,
      "CORRUPT"
    );
  }
  return parsed;
}

// 先写临时文件再改名，避免写到一半把已有风格清掉。
export function writeCustomStyleStore(store) {
  const file = customStylesFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  const json = JSON.stringify(store, null, 2) + "\n";
  fs.writeFileSync(tmp, json);
  fs.renameSync(tmp, file);
}
