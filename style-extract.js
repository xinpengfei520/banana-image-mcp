// 从参考图里整理出可复用的风格提示词。这里只处理文本和路径判断，不调用模型。
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

export const MIN_EXTRACTED_STYLE_CHARS = 40;
export const MAX_STYLE_PROMPT_CHARS = 8000;

export const STYLE_EXTRACTION_INSTRUCTION = [
  "Look at the reference image and write a reusable image-generation style prompt.",
  "Describe only the visual system: medium, background, palette, lighting, texture, line quality, typography, layout, and decoration.",
  "Do not describe the subject, people, brand names, title text, topic, or any words printed in the image.",
  "Write one to three English sentences. No markdown, no bullets, no heading.",
].join(" ");

function expandHome(value) {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

// url：交给下载。file：本地路径（含 Windows 盘符和 file://）。rejected：其它协议。
export function classifyStyleImageSource(source) {
  const raw = String(source ?? "").trim();
  if (!raw) return { kind: "empty", source: "" };
  if (/^https?:\/\//i.test(raw)) return { kind: "url", source: raw };
  if (/^[a-zA-Z]:[\\/]/.test(raw)) return { kind: "file", source: raw };
  if (/^file:\/\//i.test(raw)) return { kind: "file", source: fileURLToPath(raw) };
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return { kind: "rejected", source: raw };
  return { kind: "file", source: expandHome(raw) };
}

export function cleanExtractedStylePrompt(raw) {
  let text = String(raw ?? "").replace(/\r\n/g, "\n").trim();
  text = text.replace(/^```[a-zA-Z0-9]*\n?/, "").replace(/\n?```$/, "").trim();
  text = text.replace(/^(?:style prompt|风格提示词)\s*[:：]\s*/i, "").trim();
  const wrapped =
    (text.startsWith('"') && text.endsWith('"') && text.length >= 2) ||
    (text.startsWith("'") && text.endsWith("'") && text.length >= 2) ||
    (text.startsWith("“") && text.endsWith("”") && text.length >= 2) ||
    (text.startsWith("「") && text.endsWith("」") && text.length >= 2);
  if (wrapped) text = text.slice(1, -1).trim();
  const lines = text
    .split("\n")
    .map((line) => line.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
  const joined = lines.join(" ").replace(/\s+/g, " ").trim();
  return joined.length > MAX_STYLE_PROMPT_CHARS
    ? joined.slice(0, MAX_STYLE_PROMPT_CHARS)
    : joined;
}

export function assertUsableStylePrompt(raw) {
  const text = cleanExtractedStylePrompt(raw);
  if (text.length < MIN_EXTRACTED_STYLE_CHARS) {
    throw new Error("The model did not return a usable style prompt. Try another image.");
  }
  return text;
}
