// 预设生图风格。每个风格是一段固定的视觉提示词，套在用户内容提示词后面。
// 内容（主题、标题原文、步骤）只来自当次 prompt；风格只约束介质、配色、字体和版式。
// 调用参数优先于环境变量 IMAGE_STYLE。显式 none 只取消这一次。
// 内置风格在这个文件里。用户自建风格在 ~/.banana-image-mcp/styles.json，更新安装包不会清掉。
import {
  customStylesFile,
  readCustomStyleStore,
  writeCustomStyleStore,
} from "./custom-styles.js";

const NONE_STYLES = new Set(["none", "off", "raw", "plain", "no-style", "nostyle"]);

const STYLE_LIST = [
  {
    id: "dark-chalkboard",
    name: "深色粉笔黑板",
    nameEn: "Dark chalkboard",
    summary: "深色石板底，白粉笔手绘信息图，粉彩黄、绿、粉点缀。",
    bestFor: "教程、流程图、清单、知识卡片",
    aliases: ["chalkboard", "chalk", "dark-chalk", "黑板", "粉笔", "黑板报"],
    prompt: `Dark chalkboard background with a subtle slate texture, hand-drawn chalk doodle infographic style. Put the requested title at the top in large white hand-drawn chalk letters. Draw any requested steps, flowchart, icons, arrows, and short labels in sketchy chalk. Decorate with pastel yellow, soft green, and pink chalk lines, checkmarks, and stars. Clean layout, high detail, rough chalk texture. No photorealism, no glossy 3D, no neon city.`,
  },
  {
    id: "pornhub",
    name: "橙标大字",
    nameEn: "Orange wordmark",
    summary: "纯黑底。白字加一枚橙色圆角标，做成强识别的双色词标封面。",
    bestFor: "要一眼记住的标题封面、栏目统一视觉",
    aliases: ["ph", "orange-wordmark", "orange-badge", "橙标"],
    prompt: `Typographic poster on a pure black background, using a black-and-orange wordmark layout. Bold italic geometric sans-serif only. If the title has two or more words, set the accent word in black inside a bright orange #FF9900 rounded rectangle, vertically centered on the line; set the other words in solid white. If the title is one word, put that word in the orange badge and add no extra words. Huge scale, tight leading, large empty black margins. No photographs, no people, no gradients, no textures, no borders, no watermark, no extra icons unless the request asks for one simple flat icon.`,
  },
  {
    id: "xiaohongshu",
    name: "小红书笔记",
    nameEn: "Xiaohongshu note",
    summary: "奶油纸底、超大圆体标题、粉色贴纸和胶带，下半区一个简单插画主体。",
    bestFor: "小红书封面、生活方式、种草笔记",
    aliases: ["xhs", "rednote", "小红书"],
    prompt: `Xiaohongshu note cover. Soft cream paper background. A very large rounded bold black title, at most three short lines, filling the upper half and staying fully inside the frame. Small hand-drawn sticker doodles and washi-tape accents in blush pink, butter yellow, and mint around the title, never covering the letters. One simple illustrated subject matching the request sits in the lower half. Bright, clean, friendly, flat lighting. No clutter, no watermark, no tiny unreadable text.`,
  },
  {
    id: "big-type",
    name: "大字报",
    nameEn: "Big-type poster",
    summary: "纯色底，一两行超大粗体标题撑满画面，最多一个小图标。",
    bestFor: "信息流里必须一眼读完的公众号或笔记封面",
    aliases: ["dazibao", "poster-type", "大字报"],
    prompt: `Feed-first big-type poster. One flat background color with strong contrast against the lettering. Choose one bold field that fits the topic: black, warm red, cobalt, or cream. The requested title is one to three lines of enormous heavy sans-serif and fills most of the frame. At most one simple flat icon. No photographs, no textures, no extra sentences. Spell the title exactly and keep every character inside the frame.`,
  },
  {
    id: "wechat-editorial",
    name: "公众号头图",
    nameEn: "WeChat editorial",
    summary: "杂志感宽幅头图，纸纹底，大标题，一种点缀色，留白多。",
    bestFor: "公众号头条封面、专栏、长文",
    aliases: ["wechat", "weixin", "公众号", "gongzhonghao"],
    prompt: `WeChat official-account header, editorial magazine crop. Quiet paper or soft gray background with a fine print texture. One large high-contrast serif title, generous margins, left or center aligned. A single restrained accent color and an optional thin rule. At most one small simple illustration or object. Calm, literate, readable when the image is cropped to a wide feed card. No stickers, no neon, no collage.`,
  },
  {
    id: "premium-dark",
    name: "暗金课程",
    nameEn: "Premium dark",
    summary: "近黑底、细颗粒、暖白衬线标题和一条细金线。",
    bestFor: "课程、知识付费、专栏品牌封面",
    aliases: ["premium", "luxury-dark", "course-cover", "课程风"],
    prompt: `Premium dark course cover. Near-black background with fine film grain. A large elegant serif title in warm off-white, one thin gold line, and one small gold icon or monogram. Lots of dark empty space. Quiet luxury. No clipart, no bright stickers, no photographs unless the request asks for a single dimly lit object.`,
  },
  {
    id: "bold-thumbnail",
    name: "色块视频封面",
    nameEn: "Color-block thumbnail",
    summary: "两块高饱和纯色斜切，一侧主体，一侧超大描边标题。",
    bestFor: "视频封面、讲解类缩略图",
    aliases: ["thumbnail", "youtube-thumb", "color-block", "视频封面"],
    prompt: `High-contrast video thumbnail. Split the background into two flat saturated color blocks along a hard diagonal. One clear focal object or simple illustrated subject on one side, with a crisp cutout edge and a soft drop shadow. Leave the other side for a huge bold title with a thick dark outline so it reads at small size. Sharp, no blur, no tiny text, no watermark, no fake play button.`,
  },
  {
    id: "liquid-glass",
    name: "液态玻璃",
    nameEn: "Liquid glass",
    summary: "浅灰底上的磨砂玻璃卡片，圆角、细高光、大量留白。",
    bestFor: "科技产品、工具、发布会风格封面",
    aliases: ["glass", "apple-glass", "液态玻璃"],
    prompt: `Liquid-glass product aesthetic. Soft light-gray background. The subject sits inside frosted translucent glass panels with rounded corners, subtle refraction, a thin light edge, and soft specular highlights. Generous whitespace and one accent color. Calm studio lighting, precise and modern. No heavy texture, no grunge, no neon cyberpunk city.`,
  },
  {
    id: "clay-3d",
    name: "黏土三维",
    nameEn: "Clay 3D",
    summary: "哑光黏土圆润造型，柔光棚拍，奶油、桃、天蓝配色。",
    bestFor: "讲解、入门、轻松主题的系列封面",
    aliases: ["clay", "claymation", "黏土", "粘土"],
    prompt: `Cute 3D clay illustration. Soft matte clay materials, rounded forms, gentle fingerprints, studio softbox lighting. Palette of cream, peach, sky blue, and butter yellow on a seamless colored backdrop. If the request includes a title, build it from chunky clay letters and add no other text. Friendly, tactile, high detail.`,
  },
  {
    id: "ink-wash",
    name: "水墨留白",
    nameEn: "Ink wash",
    summary: "暖色宣纸，黑墨枯湿变化，大片留白，少量朱砂或花青。",
    bestFor: "文化、随笔、需要安静辨识度的账号",
    aliases: ["ink", "sumi", "水墨"],
    prompt: `Chinese ink-wash painting on warm rice paper. Black ink with wet and dry brush variation and large areas of untouched paper. A small touch of cinnabar or indigo is the only color. If a title is requested, render it in calligraphy and add no other text. Quiet, spacious, literati mood. Not a cartoon and not a photograph.`,
  },
  {
    id: "paper-cut",
    name: "层叠纸雕",
    nameEn: "Paper cut",
    summary: "彩色纸层层叠，纸边和柔和投影，主体全部由剪纸构成。",
    bestFor: "生活方式、节日、手工感系列",
    aliases: ["papercut", "剪纸", "纸雕"],
    prompt: `Layered paper-cut illustration. Stacked sheets of colored paper with soft drop shadows between layers, visible paper grain, and slightly irregular cut edges. A small harmonious palette. Build the subject only from cut paper shapes. If a title is requested, cut it from paper in large letters. No photorealism and no gloss.`,
  },
  {
    id: "brutalist",
    name: "瑞士粗野海报",
    nameEn: "Brutalist poster",
    summary: "黑白加一个原色，巨大无衬线标题，严格网格，不装饰。",
    bestFor: "设计、科技评论、观点类封面",
    aliases: ["brutalism", "swiss", "粗野主义"],
    prompt: `Swiss brutalist poster. Strict grid, black and white with one primary accent in red or blue. Enormous grotesk sans-serif title, tight crop, asymmetric alignment, and a single geometric shape or diagram. Flat ink, no shadows, no decoration, no photographs. The title text is exact and dominant.`,
  },
];

function normalizeStyleId(raw) {
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const STYLES_BY_ID = new Map(STYLE_LIST.map((style) => [style.id, style]));
const ALIAS_TO_ID = new Map();

for (const style of STYLE_LIST) {
  for (const key of [style.id, ...style.aliases]) {
    const norm = normalizeStyleId(key);
    if (ALIAS_TO_ID.has(norm)) {
      throw new Error(`Duplicate style key: ${norm}`);
    }
    ALIAS_TO_ID.set(norm, style.id);
  }
}

export function listStyles() {
  return STYLE_LIST.map((style) => ({ ...style }));
}

export function styleParamDescription() {
  const ids = STYLE_LIST.map((style) => style.id).join(", ");
  return (
    "Optional style id. A value on this call wins over IMAGE_STYLE. " +
    "Omit it to use IMAGE_STYLE when setup (or the environment) set one; otherwise the prompt is sent unchanged. " +
    "Pass \"none\" to skip the global style for this call. " +
    `Built-in: ${ids}. Custom styles saved on this machine with save_image_style are also accepted. ` +
    "Call list_image_styles to see both and the current global style."
  );
}

function customRecordId(item) {
  if (!item || typeof item !== "object") return "";
  return normalizeStyleId(item.id || item.name || "");
}

function loadCustomRecords() {
  return readCustomStyleStore().styles.filter((item) => {
    return item && typeof item.prompt === "string" && item.prompt.trim() && customRecordId(item);
  });
}

function toCustomStyle(record) {
  const prompt = record.prompt.trim();
  const name = String(record.name || record.id).trim();
  return {
    id: customRecordId(record),
    name,
    nameEn: name,
    summary: prompt.replace(/\s+/g, " ").slice(0, 80),
    bestFor: "自定义风格",
    aliases: [],
    prompt,
    source: "custom",
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  };
}

function selectableStyles() {
  const builtin = STYLE_LIST.map((style) => ({ ...style, source: "builtin" }));
  const custom = loadCustomRecords().map(toCustomStyle);
  return [...builtin, ...custom];
}

function availableStyleIds() {
  return selectableStyles().map((style) => style.id);
}

function assertCustomNameAllowed(id, displayName) {
  if (!id) {
    throw new Error(`Style name "${displayName}" is empty after normalization.`);
  }
  if (NONE_STYLES.has(id)) {
    throw new Error(`"${displayName}" is reserved. Pick another style name.`);
  }
  const builtin = ALIAS_TO_ID.get(id);
  if (builtin) {
    throw new Error(
      `"${displayName}" matches built-in style "${builtin}". Pick another name.`
    );
  }
}

// 同名再次保存会更新提示词，不会另建一条，也不会改动其他自定义风格。
export function saveCustomStyle(name, prompt) {
  const displayName = String(name ?? "").trim();
  const text = String(prompt ?? "").trim();
  if (!displayName) throw new Error("Style name is required.");
  if (displayName.length > 80) throw new Error("Style name must be 80 characters or fewer.");
  if (!text) throw new Error("Style prompt is required.");
  if (text.length > 8000) throw new Error("Style prompt must be 8000 characters or fewer.");

  const id = normalizeStyleId(displayName);
  assertCustomNameAllowed(id, displayName);

  const store = readCustomStyleStore();
  const now = new Date().toISOString();
  let created = true;
  let replaced = false;
  const next = [];
  for (const item of store.styles) {
    if (customRecordId(item) !== id) {
      next.push(item);
      continue;
    }
    if (replaced) continue;
    replaced = true;
    created = false;
    next.push({
      ...item,
      id,
      name: displayName,
      prompt: text,
      createdAt: item.createdAt || now,
      updatedAt: now,
    });
  }
  if (!replaced) {
    next.push({ id, name: displayName, prompt: text, createdAt: now, updatedAt: now });
  }
  store.version = store.version || 1;
  store.styles = next;
  writeCustomStyleStore(store);
  return {
    created,
    path: customStylesFile(),
    style: toCustomStyle(next.find((item) => customRecordId(item) === id)),
  };
}

export function deleteCustomStyle(name) {
  const displayName = String(name ?? "").trim();
  if (!displayName) throw new Error("Style name is required.");
  const id = normalizeStyleId(displayName);
  if (ALIAS_TO_ID.has(id)) {
    throw new Error(`Built-in style "${ALIAS_TO_ID.get(id)}" cannot be deleted.`);
  }
  const store = readCustomStyleStore();
  let removed = null;
  const next = [];
  for (const item of store.styles) {
    if (customRecordId(item) === id) {
      if (!removed) removed = item;
      continue;
    }
    next.push(item);
  }
  if (!removed) {
    throw new Error(`Custom style "${displayName}" was not found.`);
  }
  store.styles = next;
  writeCustomStyleStore(store);
  return { id: customRecordId(removed), name: removed.name || id, path: customStylesFile() };
}

// 写好的提示词优先。只有没写提示词时才用图片提取。提取函数由调用方传入，避免这里依赖模型。
export async function saveCustomStyleInput({ name, prompt, image, extract }) {
  const written = String(prompt ?? "").trim();
  if (written) return saveCustomStyle(name, written);
  const source = String(image ?? "").trim();
  if (!source) {
    throw new Error("Pass a style prompt, or an image path or URL to extract one.");
  }
  if (typeof extract !== "function") {
    throw new Error("Image style extraction is unavailable.");
  }
  const extracted = String((await extract(source)) ?? "").trim();
  if (!extracted) {
    throw new Error("The model did not return a usable style prompt. Try another image.");
  }
  const saved = saveCustomStyle(name, extracted);
  return { ...saved, extractedFrom: source };
}

// 调用参数优先于 IMAGE_STYLE。空参数回落到全局风格。
// 显式 none 只取消这一次，不使用全局风格。
export function resolveStyleSelection(explicit) {
  const hasExplicit = explicit != null && String(explicit).trim() !== "";
  const raw = hasExplicit ? String(explicit).trim() : String(process.env.IMAGE_STYLE || "").trim();
  const origin = hasExplicit ? "call" : raw ? "global" : null;
  if (!raw) return { style: null, id: null, origin: null };
  const key = normalizeStyleId(raw);
  if (NONE_STYLES.has(key)) return { style: null, id: null, origin };
  const builtinId = ALIAS_TO_ID.get(key);
  if (builtinId) {
    return { style: { ...STYLES_BY_ID.get(builtinId), source: "builtin" }, id: builtinId, origin };
  }
  const custom = loadCustomRecords()
    .map(toCustomStyle)
    .find((style) => style.id === key || normalizeStyleId(style.name) === key);
  if (custom) return { style: custom, id: custom.id, origin };
  throw new Error(
    `Unknown image style "${String(raw).trim()}". Available: ${availableStyleIds().join(", ")}. Use "none" to generate without a preset, or save_image_style to create one.`
  );
}

// 列出风格时用。非法的 IMAGE_STYLE 记在 error 里，不让目录整体失败。
export function currentGlobalStyle() {
  const raw = String(process.env.IMAGE_STYLE || "").trim();
  if (!raw || NONE_STYLES.has(normalizeStyleId(raw))) return { id: null };
  try {
    return { id: resolveStyleSelection(raw).id };
  } catch (error) {
    return { id: null, error: error.message };
  }
}

export function composeStyledPrompt(userPrompt, style) {
  const content = String(userPrompt ?? "").trim();
  if (!style) return content;
  return [
    content,
    "",
    "Fixed visual style for this image. Follow it exactly so a series of images looks like one account. Take the subject, scene, title wording, labels, and facts only from the request above. Do not replace them with a different topic.",
    style.prompt.trim(),
  ].join("\n");
}

function publicStyle(style, withPrompt) {
  const out = {
    id: style.id,
    name: style.name,
    nameEn: style.nameEn,
    summary: style.summary,
    bestFor: style.bestFor,
    aliases: style.aliases || [],
    source: style.source || "builtin",
  };
  if (withPrompt) out.prompt = style.prompt.trim();
  return out;
}

// id 为空时返回目录；传入 id 时附上完整风格提示词。
export function describeStyles(id) {
  if (id != null && String(id).trim() !== "") {
    const { style } = resolveStyleSelection(id);
    if (!style) {
      throw new Error(
        `Unknown image style "${String(id).trim()}". Available: ${availableStyleIds().join(", ")}.`
      );
    }
    return { style: publicStyle(style, true), globalStyle: currentGlobalStyle() };
  }
  return {
    globalStyle: currentGlobalStyle(),
    styles: selectableStyles().map((style) => publicStyle(style, style.source === "custom")),
  };
}
