import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  composeStyledPrompt,
  describeStyles,
  listStyles,
  resolveStyleSelection,
} from "./styles.js";

const ORIGINAL_IMAGE_STYLE = process.env.IMAGE_STYLE;

afterEach(() => {
  if (ORIGINAL_IMAGE_STYLE == null) delete process.env.IMAGE_STYLE;
  else process.env.IMAGE_STYLE = ORIGINAL_IMAGE_STYLE;
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

  it("leaves the prompt unchanged unless style is passed", () => {
    process.env.IMAGE_STYLE = "xiaohongshu";
    assert.equal(resolveStyleSelection(undefined).id, null);
    assert.equal(resolveStyleSelection("").id, null);
    assert.equal(resolveStyleSelection("  ").id, null);
    assert.equal(resolveStyleSelection("none").id, null);
    assert.equal(resolveStyleSelection("ink-wash").id, "ink-wash");
    const plain = composeStyledPrompt("a quiet essay cover", resolveStyleSelection(undefined).style);
    assert.equal(plain, "a quiet essay cover");
  });

  it("rejects unknown styles and lists every id", () => {
    delete process.env.IMAGE_STYLE;
    assert.throws(() => resolveStyleSelection("not-a-style"), /Unknown image style/);
    const catalog = describeStyles();
    assert.equal(catalog.defaultStyle, undefined);
    assert.equal(catalog.styles.length, listStyles().length);
    assert.ok(catalog.styles.some((style) => style.id === "liquid-glass"));
    assert.equal(describeStyles("视频封面").style.id, "bold-thumbnail");
    assert.match(describeStyles("clay").style.prompt, /clay/i);
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
