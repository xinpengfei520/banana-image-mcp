import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, it } from "node:test";
import sharp from "sharp";
import { assembleEntry } from "./cli-setup.js";
import { loadStyleReference } from "./index.js";
import { customStylesFile } from "./custom-styles.js";
import {
  assertUsableStylePrompt,
  classifyStyleImageSource,
  cleanExtractedStylePrompt,
} from "./style-extract.js";
import {
  composeStyledPrompt,
  currentGlobalStyle,
  deleteCustomStyle,
  describeStyles,
  listStyles,
  resolveStyleSelection,
  saveCustomStyle,
  saveCustomStyleInput,
} from "./styles.js";

const ORIGINAL_IMAGE_STYLE = process.env.IMAGE_STYLE;
const ORIGINAL_HOME = process.env.BANANA_IMAGE_MCP_HOME;
let tempHome;

beforeEach(() => {
  tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "banana-styles-"));
  process.env.BANANA_IMAGE_MCP_HOME = tempHome;
});

afterEach(() => {
  if (ORIGINAL_IMAGE_STYLE == null) delete process.env.IMAGE_STYLE;
  else process.env.IMAGE_STYLE = ORIGINAL_IMAGE_STYLE;
  fs.rmSync(tempHome, { recursive: true, force: true });
  if (ORIGINAL_HOME == null) delete process.env.BANANA_IMAGE_MCP_HOME;
  else process.env.BANANA_IMAGE_MCP_HOME = ORIGINAL_HOME;
});

describe("preset image styles", () => {
  it("keeps the user subject and appends only the style system", () => {
    delete process.env.IMAGE_STYLE;
    const { style, id } = resolveStyleSelection("dark chalkboard");
    assert.equal(id, "dark-chalkboard");
    const prompt = composeStyledPrompt(
      'Title: "AI PROMPT GUIDE". A 3-step flowchart: INPUT, PROCESS, RESULT.',
      style
    );
    assert.match(prompt, /AI PROMPT GUIDE/);
    assert.match(prompt, /INPUT, PROCESS, RESULT/);
    assert.match(prompt, /dark chalkboard background with a subtle slate texture/i);
    assert.match(prompt, /pastel yellow, soft green, and pink chalk/i);
    assert.ok(prompt.indexOf("AI PROMPT GUIDE") < prompt.indexOf("Fixed visual style"));
    assert.doesNotMatch(style.prompt, /AI PROMPT GUIDE/);
    assert.doesNotMatch(style.prompt, /keyboard icon/);
  });

  it("resolves pornhub as the orange wordmark, including aliases", () => {
    delete process.env.IMAGE_STYLE;
    for (const name of ["pornhub", "PornHub", "orange_wordmark", "橙标"]) {
      const selected = resolveStyleSelection(name);
      assert.equal(selected.id, "pornhub");
      assert.match(selected.style.prompt, /#FF9900/);
      assert.match(selected.style.prompt, /pure black background/i);
      assert.match(selected.style.prompt, /No photographs, no people/);
    }
  });

  it("uses IMAGE_STYLE unless the call passes its own style", () => {
    delete process.env.IMAGE_STYLE;
    assert.equal(resolveStyleSelection(undefined).id, null);
    assert.equal(resolveStyleSelection(undefined).origin, null);
    assert.equal(composeStyledPrompt("a quiet essay cover", null), "a quiet essay cover");

    process.env.IMAGE_STYLE = "xiaohongshu";
    assert.equal(resolveStyleSelection(undefined).id, "xiaohongshu");
    assert.equal(resolveStyleSelection(undefined).origin, "global");
    assert.equal(resolveStyleSelection("").origin, "global");
    assert.equal(resolveStyleSelection("   ").id, "xiaohongshu");
    const fromGlobal = composeStyledPrompt("a quiet essay cover", resolveStyleSelection(undefined).style);
    assert.match(fromGlobal, /a quiet essay cover/);
    assert.match(fromGlobal, /Xiaohongshu note cover/);

    const override = resolveStyleSelection("ink-wash");
    assert.equal(override.id, "ink-wash");
    assert.equal(override.origin, "call");
    const skipped = resolveStyleSelection("none");
    assert.equal(skipped.id, null);
    assert.equal(skipped.origin, "call");
    assert.equal(resolveStyleSelection("off").id, null);
    assert.equal(composeStyledPrompt("a quiet essay cover", skipped.style), "a quiet essay cover");

    process.env.IMAGE_STYLE = "粉笔";
    assert.equal(resolveStyleSelection(undefined).id, "dark-chalkboard");
    assert.equal(currentGlobalStyle().id, "dark-chalkboard");
    process.env.IMAGE_STYLE = "none";
    assert.equal(resolveStyleSelection(undefined).id, null);
    assert.equal(resolveStyleSelection(undefined).origin, "global");
    assert.deepEqual(currentGlobalStyle(), { id: null });
  });

  it("rejects unknown styles and lists every id", () => {
    delete process.env.IMAGE_STYLE;
    assert.throws(() => resolveStyleSelection("not-a-style"), /Unknown image style/);
    const catalog = describeStyles();
    assert.equal(catalog.defaultStyle, undefined);
    assert.deepEqual(catalog.globalStyle, { id: null });
    assert.equal(catalog.styles.length, listStyles().length);
    assert.ok(catalog.styles.some((style) => style.id === "liquid-glass"));
    assert.equal(describeStyles("视频封面").style.id, "bold-thumbnail");
    assert.match(describeStyles("clay").style.prompt, /clay/i);

    process.env.IMAGE_STYLE = "not-a-style";
    const broken = describeStyles();
    assert.equal(broken.globalStyle.id, null);
    assert.match(broken.globalStyle.error, /Unknown image style/);
    assert.equal(broken.styles.length, listStyles().length);
  });

  it("resolves every published alias exactly once", () => {
    delete process.env.IMAGE_STYLE;
    const seen = new Set();
    for (const style of listStyles()) {
      assert.equal(resolveStyleSelection(style.id).id, style.id);
      assert.ok(style.prompt.trim().length > 40);
      for (const alias of style.aliases) {
        assert.equal(resolveStyleSelection(alias).id, style.id);
        assert.ok(!seen.has(alias));
        seen.add(alias);
      }
    }
    assert.ok(seen.size >= 12);
  });
});

describe("custom image styles", () => {
  it("saves several styles and selects one without changing the others", () => {
    const first = saveCustomStyle("奶油笔记", "Soft cream paper, rounded black title, blush pink tape.");
    saveCustomStyle("夜航", "Near-black field, thin gold line, warm serif title.");
    assert.equal(first.created, true);
    assert.equal(first.style.id, "奶油笔记");

    const updated = saveCustomStyle("奶油笔记", "Soft cream paper, huge rounded title, mint stickers.");
    assert.equal(updated.created, false);
    const selected = resolveStyleSelection("奶油笔记");
    assert.equal(selected.id, "奶油笔记");
    assert.match(selected.style.prompt, /mint stickers/);
    assert.equal(resolveStyleSelection("夜航").style.source, "custom");

    const catalog = describeStyles();
    const custom = catalog.styles.filter((style) => style.source === "custom");
    assert.deepEqual(custom.map((style) => style.id), ["奶油笔记", "夜航"]);
    assert.match(catalog.styles.find((style) => style.id === "奶油笔记").prompt, /mint stickers/);

    const prompt = composeStyledPrompt("Title: 周末咖啡", selected.style);
    assert.match(prompt, /周末咖啡/);
    assert.match(prompt, /mint stickers/);

    deleteCustomStyle("奶油笔记");
    assert.equal(resolveStyleSelection("夜航").id, "夜航");
    assert.throws(() => resolveStyleSelection("奶油笔记"), /Unknown image style/);
  });

  it("refuses built-in names and leaves a damaged file untouched", () => {
    assert.throws(() => saveCustomStyle("pornhub", "A different orange poster."), /built-in style/);
    assert.throws(() => saveCustomStyle("粉笔", "Another chalk style."), /built-in style/);
    assert.throws(() => deleteCustomStyle("dark-chalkboard"), /cannot be deleted/);

    const file = customStylesFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "{not json");
    assert.throws(() => saveCustomStyle("夜航", "Near-black field and a gold line."), /left unchanged/);
    assert.equal(fs.readFileSync(file, "utf8"), "{not json");
  });

  it("keeps extra file data when a style is added", () => {
    const file = customStylesFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        note: "keep me",
        styles: [{ id: "夜航", name: "夜航", prompt: "Gold line on black.", extra: true }],
      })
    );
    saveCustomStyle("奶油笔记", "Cream paper and pink tape.");
    const stored = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal(stored.note, "keep me");
    assert.equal(stored.styles.length, 2);
    assert.equal(stored.styles[0].extra, true);
    assert.equal(stored.styles[1].id, "奶油笔记");
  });

  it("lets a call override a custom global style", () => {
    saveCustomStyle("奶油笔记", "Soft cream paper, rounded black title, blush pink tape.");
    process.env.IMAGE_STYLE = "奶油笔记";
    assert.equal(resolveStyleSelection(undefined).id, "奶油笔记");
    assert.equal(resolveStyleSelection(undefined).origin, "global");
    assert.equal(resolveStyleSelection("none").id, null);
    assert.equal(resolveStyleSelection("ink-wash").origin, "call");
    assert.equal(currentGlobalStyle().id, "奶油笔记");
    assert.equal(describeStyles().globalStyle.id, "奶油笔记");
  });

  it("saves a written prompt and does not extract when an image is also given", async () => {
    let extracted = false;
    const saved = await saveCustomStyleInput({
      name: "奶油笔记",
      prompt: "Soft cream paper, rounded black title, blush tape.",
      image: "/this/file/does/not/exist.png",
      extract: async () => {
        extracted = true;
        return "This extractor must not run for a written style prompt.";
      },
    });
    assert.equal(extracted, false);
    assert.equal(saved.extractedFrom, undefined);
    assert.match(saved.style.prompt, /blush tape/);
  });

  it("saves the prompt extracted from an image", async () => {
    const saved = await saveCustomStyleInput({
      name: "参考海报",
      image: "./ref.png",
      extract: async (source) => {
        assert.equal(source, "./ref.png");
        return "Flat cream field, huge black grotesk title, one coral circle.";
      },
    });
    assert.equal(saved.extractedFrom, "./ref.png");
    assert.equal(saved.created, true);
    assert.match(resolveStyleSelection("参考海报").style.prompt, /coral circle/);
    await assert.rejects(
      () => saveCustomStyleInput({ name: "参考海报", extract: async () => "unused" }),
      /style prompt|image path/i
    );
  });
});

describe("style extraction text", () => {
  it("cleans fences, labels, quotes, and bullets", () => {
    const cleaned = cleanExtractedStylePrompt(
      "```text\n风格提示词：\n- cream paper background\n- rounded black title\n- blush tape accents\n```"
    );
    assert.equal(cleaned, "cream paper background rounded black title blush tape accents");
    assert.equal(
      cleanExtractedStylePrompt('"Flat ink, huge grotesk title, one red bar."'),
      "Flat ink, huge grotesk title, one red bar."
    );
    assert.equal(cleanExtractedStylePrompt("a".repeat(8001)).length, 8000);
  });

  it("rejects a style prompt that is too short to reuse", () => {
    assert.throws(() => assertUsableStylePrompt("Style prompt: cream paper"), /usable style prompt/);
    const usable = "Flat cream field, huge black grotesk title, one coral circle, no photographs.";
    assert.equal(assertUsableStylePrompt(`\`\`\`\n${usable}\n\`\`\``), usable);
  });

  it("accepts a local path or http URL and rejects other schemes", () => {
    assert.equal(classifyStyleImageSource("https://cdn.example.com/a.png").kind, "url");
    assert.equal(classifyStyleImageSource("HTTP://cdn.example.com/a.png").kind, "url");
    assert.equal(classifyStyleImageSource("./ref.png").kind, "file");
    assert.equal(classifyStyleImageSource("./ref.png").source, "./ref.png");
    assert.equal(classifyStyleImageSource("~/ref.png").source, path.join(os.homedir(), "ref.png"));
    assert.equal(classifyStyleImageSource("C:\\images\\ref.png").kind, "file");
    assert.equal(classifyStyleImageSource("C:\\images\\ref.png").source, "C:\\images\\ref.png");
    assert.equal(classifyStyleImageSource("file:///tmp/ref.png").source, "/tmp/ref.png");
    assert.equal(classifyStyleImageSource("ftp://example.com/a.png").kind, "rejected");
    assert.equal(classifyStyleImageSource("data:image/png;base64,aaaa").kind, "rejected");
  });

  it("turns a local image into jpeg bytes and does not call the model", async () => {
    const file = path.join(tempHome, "ref.png");
    await sharp({
      create: { width: 64, height: 32, channels: 3, background: { r: 240, g: 230, b: 210 } },
    })
      .png()
      .toFile(file);
    const image = await loadStyleReference(file);
    assert.equal(image.mimeType, "image/jpeg");
    const decoded = Buffer.from(image.data, "base64");
    assert.ok(decoded.length > 50);
    const meta = await sharp(decoded).metadata();
    assert.equal(meta.format, "jpeg");
    assert.ok(meta.width <= 1280 && meta.height <= 1280);
    await assert.rejects(() => loadStyleReference(path.join(tempHome, "missing.png")), /File not found/);
    await assert.rejects(() => loadStyleReference("ftp://example.com/a.png"), /local file path or an http/);
  });
});

describe("setup global style", () => {
  it("writes IMAGE_STYLE only when a style is chosen", () => {
    const chosen = assembleEntry({ imageStyle: "ink-wash", provider: "qiniu", runChoice: "1" });
    assert.equal(chosen.env.IMAGE_STYLE, "ink-wash");
    assert.equal(chosen.command, "npx");
    const cleared = assembleEntry({ imageStyle: "", provider: "qiniu", runChoice: "1" });
    assert.equal(Object.hasOwn(cleared.env, "IMAGE_STYLE"), false);
  });
});
