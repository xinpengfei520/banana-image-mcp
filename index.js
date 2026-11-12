#!/usr/bin/env node
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import qiniu from "qiniu";
import OSS from "ali-oss";
import { GoogleGenAI } from "@google/genai";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { appendHistory } from "./history-store.js";
import {
  assertUsableStylePrompt,
  classifyStyleImageSource,
  STYLE_EXTRACTION_INSTRUCTION,
} from "./style-extract.js";
import {
  composeStyledPrompt,
  deleteCustomStyle,
  describeStyles,
  resolveStyleSelection,
  saveCustomStyleInput,
  styleParamDescription,
} from "./styles.js";

// CLI 与 MCP 服务是两条独立入口：MCP 客户端配置里的 env 只注入 MCP 子进程，
// CLI 只读当前进程环境变量和**当前目录**的 .env。quiet 避免没有 .env 时也打印
// "injected env (0) from .env"，那行容易让人误以为配置已加载。
dotenv.config({ override: false, quiet: true });

// ====== 配置 ======
const TMP_DIR = path.join(os.tmpdir(), "banana-image-mcp");
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// 生图默认参数（可被环境变量或调用参数覆盖）
const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const DEFAULT_VISION_MODEL = "gemini-3.8-flash";
const DEFAULT_ASPECT_RATIO = "16:9";
const DEFAULT_IMAGE_SIZE = "1K";
const MAX_STYLE_IMAGE_BYTES = 20 * 1024 * 1024;

function getWebpQuality() {
  const q = parseInt(process.env.WEBP_QUALITY || "", 10);
  return Number.isFinite(q) && q >= 1 && q <= 100 ? q : 80;
}

// ====== 代理配置 ======
// 中国大陆等网络环境下可能无法直接访问 Google Gemini，通过代理转发请求。
// 支持 PROXY_URL 及常见的 HTTPS_PROXY / HTTP_PROXY / ALL_PROXY 环境变量。
function getProxyUrl() {
  return (
    process.env.PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    ""
  ).trim();
}

// 让 @google/genai 使用的全局 fetch 走代理（基于 undici 的全局 dispatcher）
let _fetchProxyReady = false;
async function ensureFetchProxy() {
  if (_fetchProxyReady) return;
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) return;
  const { ProxyAgent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  _fetchProxyReady = true;
}

// 为 axios（下载网络图片）构造代理配置
let _axiosProxyConfig;
async function getAxiosProxyConfig() {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) return {};
  if (_axiosProxyConfig) return _axiosProxyConfig;
  const { HttpsProxyAgent } = await import("https-proxy-agent");
  const agent = new HttpsProxyAgent(proxyUrl);
  _axiosProxyConfig = { httpAgent: agent, httpsAgent: agent, proxy: false };
  return _axiosProxyConfig;
}

// ====== 自建 API 网关（反向代理）配置 ======
// 有些自建代理不是「正向代理」，而是一个模拟 Gemini API 的反向代理网关：
// 通过覆盖 baseUrl 指向网关，并可携带自定义鉴权请求头（如 x-cf-proxy-key）。
// 与 PROXY_URL 是两种独立机制，可各自单独使用。
function parseExtraHeaders(raw) {
  const s = (raw || "").trim();
  if (!s) return null;
  try {
    const obj = JSON.parse(s);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      const out = {};
      for (const [k, v] of Object.entries(obj)) out[k] = String(v);
      return Object.keys(out).length ? out : null;
    }
  } catch {
    // 回退格式："Name: value" 多个用 ; 或换行分隔
    const out = {};
    for (const part of s.split(/[\n;]+/)) {
      const i = part.indexOf(":");
      if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
    }
    return Object.keys(out).length ? out : null;
  }
  return null;
}

function buildGeminiHttpOptions() {
  const opts = {};
  const baseUrl = (process.env.GEMINI_BASE_URL || "").trim();
  if (baseUrl) opts.baseUrl = baseUrl;
  const headers = parseExtraHeaders(process.env.GEMINI_EXTRA_HEADERS);
  if (headers) opts.headers = headers;
  return Object.keys(opts).length ? opts : undefined;
}

// ====== 工具函数 ======

function getFileName(slug) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${date}-${slug}`;
}

// ====== Step1: 调用 Google Gemini API 生图 ======

// 将调用参数、环境变量与默认值合并为最终的生图参数
function resolveGenParams(opts = {}) {
  return {
    model: opts.model || process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
    aspectRatio:
      opts.aspectRatio || process.env.GEMINI_ASPECT_RATIO || DEFAULT_ASPECT_RATIO,
    imageSize:
      opts.imageSize || process.env.GEMINI_IMAGE_SIZE || DEFAULT_IMAGE_SIZE,
  };
}

// 调用里的 style 优先。没传时用 IMAGE_STYLE。显式 none 这一次不套风格。
function applyStyle(prompt, styleArg) {
  const selected = resolveStyleSelection(styleArg);
  return {
    prompt: composeStyledPrompt(prompt, selected.style),
    style: selected.id,
    styleOrigin: selected.origin,
  };
}

export async function loadStyleReference(source) {
  const located = classifyStyleImageSource(source);
  if (located.kind === "empty") throw new Error("Image path or URL is required.");
  if (located.kind === "rejected") {
    throw new Error("Image must be a local file path or an http(s) URL.");
  }

  let buffer;
  if (located.kind === "url") {
    const { default: axios } = await import("axios");
    const proxyConfig = await getAxiosProxyConfig();
    const response = await axios.get(located.source, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: MAX_STYLE_IMAGE_BYTES,
      maxBodyLength: MAX_STYLE_IMAGE_BYTES,
      ...proxyConfig,
    });
    buffer = Buffer.from(response.data);
  } else {
    if (!fs.existsSync(located.source)) throw new Error(`File not found: ${located.source}`);
    const stat = fs.statSync(located.source);
    if (!stat.isFile()) throw new Error(`Not a file: ${located.source}`);
    if (stat.size > MAX_STYLE_IMAGE_BYTES) throw new Error("Image is larger than 20MB.");
    buffer = fs.readFileSync(located.source);
  }
  if (buffer.length > MAX_STYLE_IMAGE_BYTES) throw new Error("Image is larger than 20MB.");

  try {
    const jpeg = await sharp(buffer)
      .rotate()
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return { data: jpeg.toString("base64"), mimeType: "image/jpeg" };
  } catch (error) {
    throw new Error(`Could not read that image: ${error.message}`);
  }
}

async function extractStylePrompt(source) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is required to extract a style from an image. " +
        "Export it in your shell, or run this command in a directory whose .env has GEMINI_API_KEY. " +
        "The CLI does not read the env block of your MCP client config. " +
        "(styles add --prompt does not need a key.)"
    );
  }
  await ensureFetchProxy();
  const image = await loadStyleReference(source);
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: buildGeminiHttpOptions(),
  });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_VISION_MODEL || DEFAULT_VISION_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: STYLE_EXTRACTION_INSTRUCTION },
          { inlineData: { mimeType: image.mimeType, data: image.data } },
        ],
      },
    ],
  });
  return assertUsableStylePrompt(response.text || "");
}

export async function saveImageStyle({ name, prompt, image }) {
  return saveCustomStyleInput({ name, prompt, image, extract: extractStylePrompt });
}

async function generateImage(prompt, outputPath, params) {
  // 若配置了代理，先让全局 fetch 走代理再发起请求
  await ensureFetchProxy();

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: buildGeminiHttpOptions(),
  });

  const { model, aspectRatio, imageSize } = params;

  const config = {
    imageConfig: {
      aspectRatio,
      imageSize,
    },
    responseModalities: ["IMAGE"],
  };

  const contents = [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });

  for await (const chunk of response) {
    if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      const inlineData = chunk.candidates[0].content.parts[0].inlineData;
      const buffer = Buffer.from(inlineData.data || "", "base64");
      fs.writeFileSync(outputPath, buffer);
      return;
    }
  }

  throw new Error("No image generated");
}

// ====== Step2: 转 WebP + 压缩 ======
// 保留 Gemini 生成的原始尺寸（尊重所设置的生图比例/分辨率），仅做 WebP 压缩

async function convertToWebp(input, output) {
  await sharp(input)
    .webp({ quality: getWebpQuality() })
    .toFile(output);
}

// ====== Step3: 上传文件 ======

async function uploadToQiniu(filePath, fileName, uploadPath = "blog-cover") {
  const mac = new qiniu.auth.digest.Mac(
    process.env.QINIU_ACCESS_KEY,
    process.env.QINIU_SECRET_KEY
  );

  const options = {
    scope: process.env.QINIU_BUCKET,
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  const uploadToken = putPolicy.uploadToken(mac);

  const config = new qiniu.conf.Config();
  config.zone = qiniu.zone.Zone_z0;

  const formUploader = new qiniu.form_up.FormUploader(config);
  const putExtra = new qiniu.form_up.PutExtra();

  const key = `${uploadPath}/${fileName}.webp`;

  return new Promise((resolve, reject) => {
    formUploader.putFile(uploadToken, key, filePath, putExtra, (err, body, info) => {
      if (err) {
        reject(err);
      } else if (info.statusCode === 200) {
        resolve(`${process.env.QINIU_CDN_DOMAIN}/${key}`);
      } else {
        reject(new Error(`Upload failed: ${info.statusCode}`));
      }
    });
  });
}

async function uploadToAliyun(filePath, fileName, uploadPath = "blog-cover") {
  const client = new OSS({
    region: process.env.ALIYUN_OSS_REGION,
    accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
    bucket: process.env.ALIYUN_OSS_BUCKET,
  });

  const key = `${uploadPath}/${fileName}.webp`;
  const result = await client.put(key, filePath);

  if (process.env.ALIYUN_OSS_CDN_DOMAIN) {
    return `${process.env.ALIYUN_OSS_CDN_DOMAIN}/${key}`;
  }
  return result.url;
}

async function uploadFile(filePath, fileName, uploadPath) {
  const provider = (process.env.UPLOAD_PROVIDER || "qiniu").toLowerCase();
  if (provider === "aliyun") {
    return uploadToAliyun(filePath, fileName, uploadPath);
  }
  if (provider === "qiniu") {
    return uploadToQiniu(filePath, fileName, uploadPath);
  }
  throw new Error(`Unknown UPLOAD_PROVIDER: ${provider}. Supported: qiniu, aliyun`);
}

// ====== 上传图片（本地或网络） ======

async function upload_image({ source, slug, path: uploadPath = "images" }) {
  const fileName = getFileName(slug);
  const webpPath = path.join(TMP_DIR, `${fileName}.webp`);

  let inputPath;
  let needCleanInput = false;

  if (/^https?:\/\//.test(source)) {
    // 网络图片：下载到临时目录（若配置了代理则通过代理下载）
    const { default: axios } = await import("axios");
    const proxyConfig = await getAxiosProxyConfig();
    const response = await axios.get(source, {
      responseType: "arraybuffer",
      ...proxyConfig,
    });
    inputPath = path.join(TMP_DIR, `${fileName}-download`);
    fs.writeFileSync(inputPath, Buffer.from(response.data));
    needCleanInput = true;
  } else {
    // 本地图片
    if (!fs.existsSync(source)) {
      throw new Error(`File not found: ${source}`);
    }
    inputPath = source;
  }

  await sharp(inputPath).webp({ quality: getWebpQuality() }).toFile(webpPath);
  const size = fs.statSync(webpPath).size;
  const url = await uploadFile(webpPath, fileName, uploadPath);

  if (needCleanInput) fs.unlinkSync(inputPath);
  fs.unlinkSync(webpPath);

  return { url, size };
}

// ====== 单独生图 ======

async function generate_image({
  prompt,
  slug,
  path: uploadPath = "aigc/image",
  model,
  aspectRatio,
  imageSize,
  style,
}) {
  const fileName = getFileName(slug);
  const rawPath = path.join(TMP_DIR, `${fileName}.png`);
  const webpPath = path.join(TMP_DIR, `${fileName}.webp`);

  const gen = resolveGenParams({ model, aspectRatio, imageSize });
  const styled = applyStyle(prompt, style);
  await generateImage(styled.prompt, rawPath, gen);
  await sharp(rawPath).webp({ quality: getWebpQuality() }).toFile(webpPath);
  const size = fs.statSync(webpPath).size;
  const url = await uploadFile(webpPath, fileName, uploadPath);

  fs.unlinkSync(rawPath);
  fs.unlinkSync(webpPath);

  return { url, size, ...gen, style: styled.style, styleOrigin: styled.styleOrigin };
}

// ====== 生成博客封面 ======

async function generate_blog_cover({
  prompt,
  slug,
  path: uploadPath = "blog-cover",
  model,
  aspectRatio,
  imageSize,
  style,
}) {
  const fileName = getFileName(slug);

  const rawPath = path.join(TMP_DIR, `${fileName}.png`);
  const webpPath = path.join(TMP_DIR, `${fileName}.webp`);

  const gen = resolveGenParams({ model, aspectRatio, imageSize });
  const styled = applyStyle(prompt, style);
  await generateImage(styled.prompt, rawPath, gen);
  await convertToWebp(rawPath, webpPath);
  const size = fs.statSync(webpPath).size;
  const url = await uploadFile(webpPath, fileName, uploadPath);

  fs.unlinkSync(rawPath);
  fs.unlinkSync(webpPath);

  return { url, size, ...gen, style: styled.style, styleOrigin: styled.styleOrigin };
}

// 只生图并写成 WebP，不上传。供示例图脚本使用。
export async function renderStyledWebp({
  prompt,
  style,
  outputPath,
  model,
  aspectRatio,
  imageSize,
}) {
  const gen = resolveGenParams({ model, aspectRatio, imageSize });
  const styled = applyStyle(prompt, style);
  const rawPath = `${outputPath}.png`;
  await generateImage(styled.prompt, rawPath, gen);
  await sharp(rawPath)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(outputPath);
  fs.unlinkSync(rawPath);
  return { ...gen, style: styled.style, styleOrigin: styled.styleOrigin, bytes: fs.statSync(outputPath).size };
}

// ====== MCP 服务器 ======

const server = new Server(
  {
    name: "banana-image-mcp",
    version: "1.8.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const STYLE_PARAM = {
  type: "string",
  description: styleParamDescription(),
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_blog_cover",
        description: "Generate a blog cover image using Google Gemini AI, convert to WebP format, and upload to CDN",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "What to draw: subject, scene, and any exact title text. Visual treatment comes from style when set.",
            },
            slug: {
              type: "string",
              description: "The slug identifier for the filename (will be prefixed with date)",
            },
            path: {
              type: "string",
              description: "Upload directory path (default: 'blog-cover')",
              default: "blog-cover",
            },
            model: {
              type: "string",
              description:
                "Gemini image model override (default: env GEMINI_IMAGE_MODEL or 'gemini-3.1-flash-image-preview'). e.g. 'gemini-3.1-flash-lite-image'",
            },
            aspectRatio: {
              type: "string",
              description:
                "Aspect ratio override, e.g. '16:9', '1:1', '9:16', '4:3', '3:2', '21:9' (default: env GEMINI_ASPECT_RATIO or '16:9')",
            },
            imageSize: {
              type: "string",
              description:
                "Resolution override: '1K', '2K' or '4K' (default: env GEMINI_IMAGE_SIZE or '1K')",
            },
            style: STYLE_PARAM,
          },
          required: ["prompt", "slug"],
        },
      },
      {
        name: "upload_image",
        description: "Upload a local or remote image to CDN, convert to WebP format, and return the CDN URL",
        inputSchema: {
          type: "object",
          properties: {
            source: {
              type: "string",
              description: "Local file path or HTTP/HTTPS URL of the image to upload",
            },
            slug: {
              type: "string",
              description: "The slug identifier for the filename (will be prefixed with date)",
            },
            path: {
              type: "string",
              description: "Upload directory path on CDN (default: 'images')",
              default: "images",
            },
          },
          required: ["source", "slug"],
        },
      },
      {
        name: "generate_image",
        description: "Generate an image using Google Gemini AI, convert to WebP format, upload to CDN, and return the CDN URL",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "What to draw: subject, scene, and any exact title text. Visual treatment comes from style when set.",
            },
            slug: {
              type: "string",
              description: "The slug identifier for the filename (will be prefixed with date)",
            },
            path: {
              type: "string",
              description: "Upload directory path on CDN (default: 'aigc/image')",
              default: "aigc/image",
            },
            model: {
              type: "string",
              description:
                "Gemini image model override (default: env GEMINI_IMAGE_MODEL or 'gemini-3.1-flash-image-preview'). e.g. 'gemini-3.1-flash-lite-image'",
            },
            aspectRatio: {
              type: "string",
              description:
                "Aspect ratio override, e.g. '16:9', '1:1', '9:16', '4:3', '3:2', '21:9' (default: env GEMINI_ASPECT_RATIO or '16:9')",
            },
            imageSize: {
              type: "string",
              description:
                "Resolution override: '1K', '2K' or '4K' (default: env GEMINI_IMAGE_SIZE or '1K')",
            },
            style: STYLE_PARAM,
          },
          required: ["prompt", "slug"],
        },
      },
      {
        name: "list_image_styles",
        description:
          "List built-in and custom visual styles for generate_image and generate_blog_cover. The result includes globalStyle, the IMAGE_STYLE this process would use when a call omits style. Pass id to include that style's fixed prompt. Custom styles are stored in the user home directory and survive package updates.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description:
                "Optional style id, alias, or custom style name. Omit to list every style.",
            },
          },
        },
      },
      {
        name: "save_image_style",
        description:
          "Save a custom image style on this machine. Pass a name plus either a style prompt, or an image (local path or http(s) URL) whose look is extracted into a style prompt. If both prompt and image are set, the written prompt is saved and the image is not sent. Saving the same name again updates that style and keeps the others. Stored in ~/.banana-image-mcp/styles.json, which package updates do not delete.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Custom style name, e.g. '奶油笔记'. This is the value later passed as style.",
            },
            prompt: {
              type: "string",
              description:
                "Fixed visual style prompt: medium, palette, lettering, and layout. Do not include a specific title or topic. Optional when image is set. Wins over image when both are set.",
            },
            image: {
              type: "string",
              description:
                "Local image path or http(s) URL. Used only when prompt is empty. A vision model extracts a reusable style prompt from the picture.",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "delete_image_style",
        description:
          "Delete one custom image style saved on this machine. Built-in styles cannot be deleted. Other custom styles stay in ~/.banana-image-mcp/styles.json.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name or id of the custom style to delete.",
            },
          },
          required: ["name"],
        },
      },
    ],
  };
});

const toolHandlers = {
  generate_blog_cover,
  upload_image,
  generate_image,
};

// 失败时：调用传了 style 就记传入值；没传则记下 IMAGE_STYLE。成功后会被实际生效的 id 覆盖。
function requestedStyleForHistory(tool, args) {
  if (tool === "upload_image") return null;
  const explicit = args.style == null ? "" : String(args.style).trim();
  if (explicit) return explicit;
  const globalStyle = String(process.env.IMAGE_STYLE || "").trim();
  return globalStyle || null;
}

// 记录一次工具调用的历史（成功/失败、大小、耗时、链接、错误原因）
async function runWithHistory(tool, args = {}) {
  const start = Date.now();
  const base = {
    time: new Date().toISOString(),
    tool,
    slug: args.slug,
    source: args.source,
    style: requestedStyleForHistory(tool, args),
  };
  try {
    const result = await toolHandlers[tool](args);
    appendHistory({
      ...base,
      status: "success",
      url: result.url ?? null,
      size: result.size ?? null,
      duration: (Date.now() - start) / 1000,
      model: result.model ?? null,
      aspectRatio: result.aspectRatio ?? null,
      imageSize: result.imageSize ?? null,
      style: result.style ?? null,
    });
    const payload = { url: result.url };
    if (result.style) payload.style = result.style;
    if (result.styleOrigin) payload.styleOrigin = result.styleOrigin;
    return payload;
  } catch (error) {
    appendHistory({
      ...base,
      status: "error",
      url: null,
      size: null,
      duration: (Date.now() - start) / 1000,
      error: error.message,
    });
    throw error;
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments || {};
  const localStyleTools = {
    list_image_styles: () => describeStyles(args.id),
    save_image_style: () => saveImageStyle(args),
    delete_image_style: () => deleteCustomStyle(args.name),
  };
  if (!localStyleTools[name] && !toolHandlers[name]) {
    throw new Error(`Unknown tool: ${name}`);
  }
  try {
    if (localStyleTools[name]) {
      const data = await localStyleTools[name]();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
    const result = await runWithHistory(name, args);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const command = process.argv[2];

  // 配置向导：banana-image-mcp setup
  if (command === "setup") {
    const { runSetup } = await import("./cli-setup.js");
    await runSetup();
    return;
  }

  // 生图历史：banana-image-mcp history
  if (command === "history") {
    const { runHistory } = await import("./cli-history.js");
    await runHistory();
    return;
  }

  // 预设风格目录：banana-image-mcp styles [--style <id>]
  if (command === "styles" || command === "style") {
    const { runStylesCli } = await import("./cli-styles.js");
    await runStylesCli(process.argv.slice(3));
    return;
  }

  // 显示版本：banana-image-mcp --version / -v
  if (command === "--version" || command === "-v") {
    const pkg = JSON.parse(
      fs.readFileSync(new URL("./package.json", import.meta.url), "utf8")
    );
    console.log(pkg.version);
    return;
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function isInvokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fs.realpathSync(entry) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) {
  main().catch(console.error);
}
