// 预设生图风格。每个风格是一段固定的视觉提示词，套在用户内容提示词后面。
// 内容（主题、标题原文、步骤）只来自当次 prompt；风格只约束介质、配色、字体和版式。

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
    "Optional preset style id. Omit it, or pass \"none\", to send the prompt unchanged. " +
    "When set, a fixed style prompt is appended so a channel's covers stay consistent. " +
    `Available: ${ids}. Call list_image_styles for descriptions.`
  );
}

// 只有调用方传入 style 才套用。不传、空字符串、none 都返回 null，走原来的提示词。
export function resolveStyleSelection(explicit) {
  const raw = explicit == null ? "" : String(explicit).trim();
  if (!raw) {
    return { style: null, id: null };
  }
  const key = normalizeStyleId(raw);
  if (NONE_STYLES.has(key)) {
    return { style: null, id: null };
  }
  const id = ALIAS_TO_ID.get(key);
  if (!id) {
    throw new Error(
      `Unknown image style "${String(raw).trim()}". Available: ${STYLE_LIST.map((style) => style.id).join(", ")}. Use "none" to generate without a preset.`
    );
  }
  return { style: STYLES_BY_ID.get(id), id };
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
    aliases: style.aliases,
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
        `Unknown image style "${String(id).trim()}". Available: ${STYLE_LIST.map((item) => item.id).join(", ")}.`
      );
    }
    return { style: publicStyle(style, true) };
  }
  return {
    styles: STYLE_LIST.map((style) => publicStyle(style, false)),
  };
}
