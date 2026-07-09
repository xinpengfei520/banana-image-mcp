// banana-image-mcp 交互式配置向导 / interactive setup wizard
// 用法 / usage: banana-image-mcp setup
import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { parse as parseToml } from "smol-toml";

// ====== 目标客户端定义 ======
// type: json -> mcpServers  |  toml -> [mcp_servers.<name>] (Codex)

function claudeDesktopPath() {
  if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json"
    );
  }
  if (process.platform === "win32") {
    const appData =
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "Claude", "claude_desktop_config.json");
  }
  return path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json");
}

const CLIENTS = [
  {
    key: "claude-code",
    label: "Claude Code",
    type: "json",
    path: () => path.join(os.homedir(), ".claude.json"),
  },
  {
    key: "claude-desktop",
    label: "Claude Desktop",
    type: "json",
    path: claudeDesktopPath,
  },
  {
    key: "cursor",
    label: "Cursor",
    type: "json",
    path: () => path.join(os.homedir(), ".cursor", "mcp.json"),
  },
  {
    key: "codex",
    label: "Codex",
    type: "toml",
    path: () => path.join(os.homedir(), ".codex", "config.toml"),
  },
];

const SERVER_NAME = "banana-image";

// ====== 辅助函数 ======

function expandHome(p) {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

// 由向导收集到的 state 组装出 mcpServers 条目（纯函数，便于随时预览/回退后重算）
function assembleEntry(state) {
  const env = {};
  if (state.apiKey) env.GEMINI_API_KEY = state.apiKey;
  if (state.proxyUrl) env.PROXY_URL = state.proxyUrl;
  if (state.baseUrl) {
    env.GEMINI_BASE_URL = state.baseUrl;
    if (state.extraHeaders) env.GEMINI_EXTRA_HEADERS = state.extraHeaders;
  }
  if (state.model) env.GEMINI_IMAGE_MODEL = state.model;
  if (state.aspect && state.aspect !== "16:9") env.GEMINI_ASPECT_RATIO = state.aspect;
  if (state.size && state.size !== "1K") env.GEMINI_IMAGE_SIZE = state.size;
  env.UPLOAD_PROVIDER = state.provider;
  if (state.provider === "aliyun") {
    const a = state.aliyun || {};
    if (a.id) env.ALIYUN_OSS_ACCESS_KEY_ID = a.id;
    if (a.secret) env.ALIYUN_OSS_ACCESS_KEY_SECRET = a.secret;
    if (a.bucket) env.ALIYUN_OSS_BUCKET = a.bucket;
    if (a.region) env.ALIYUN_OSS_REGION = a.region;
    if (a.cdn) env.ALIYUN_OSS_CDN_DOMAIN = a.cdn;
  } else {
    const q = state.qiniu || {};
    if (q.ak) env.QINIU_ACCESS_KEY = q.ak;
    if (q.sk) env.QINIU_SECRET_KEY = q.sk;
    if (q.bucket) env.QINIU_BUCKET = q.bucket;
    if (q.cdn) env.QINIU_CDN_DOMAIN = q.cdn;
  }
  return state.runChoice === "2"
    ? { command: "banana-image-mcp", env }
    : { command: "npx", args: ["-y", "banana-image-mcp"], env };
}

// 摘要展示时对敏感值掩码（密钥类只显示头尾）
const SECRET_KEYS = new Set([
  "GEMINI_API_KEY",
  "QINIU_ACCESS_KEY",
  "QINIU_SECRET_KEY",
  "ALIYUN_OSS_ACCESS_KEY_ID",
  "ALIYUN_OSS_ACCESS_KEY_SECRET",
]);
function maskValue(key, v) {
  if (!SECRET_KEYS.has(key)) return v;
  const s = String(v);
  return s.length > 6 ? `${s.slice(0, 3)}…${s.slice(-2)}` : "***";
}

function backup(configFile, rawText) {
  const b = `${configFile}.backup-${timestamp()}`;
  fs.writeFileSync(b, rawText);
  return b;
}

// 将 "Name: value; Name2: value2" 或 JSON 归一化为 JSON 字符串（用于 GEMINI_EXTRA_HEADERS）
function headersToJson(input) {
  const s = (input || "").trim();
  if (!s) return "";
  try {
    const o = JSON.parse(s);
    if (o && typeof o === "object" && !Array.isArray(o)) return JSON.stringify(o);
  } catch {
    // 继续按 "Name: value" 解析
  }
  const out = {};
  for (const part of s.split(/[\n;]+/)) {
    const i = part.indexOf(":");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return Object.keys(out).length ? JSON.stringify(out) : "";
}

// ====== JSON 客户端写入（Claude Code / Desktop / Cursor / 自定义） ======

function jsonHasEntry(configFile) {
  if (!fs.existsSync(configFile)) return false;
  try {
    const cfg = JSON.parse(fs.readFileSync(configFile, "utf8") || "{}");
    return !!(cfg.mcpServers && cfg.mcpServers[SERVER_NAME]);
  } catch {
    return false;
  }
}

export function writeJsonConfig(configFile, entry) {
  const dir = path.dirname(configFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let config = {};
  if (fs.existsSync(configFile)) {
    const raw = fs.readFileSync(configFile, "utf8");
    try {
      config = raw.trim() ? JSON.parse(raw) : {};
    } catch (e) {
      throw new Error(
        `配置文件不是合法 JSON / not valid JSON:\n  ${configFile}\n  ${e.message}`
      );
    }
    backup(configFile, raw);
  }
  if (!config.mcpServers || typeof config.mcpServers !== "object") {
    config.mcpServers = {};
  }
  config.mcpServers[SERVER_NAME] = entry;
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + "\n");
}

// ====== Codex TOML 写入（外科式替换，保留其余内容与注释） ======

function tomlStr(v) {
  // 对简单值（API Key / URL / 模型名）而言，JSON 字符串即为合法的 TOML 基本字符串
  return JSON.stringify(String(v));
}

export function buildCodexBlock(entry) {
  const lines = [];
  lines.push(`[mcp_servers.${SERVER_NAME}]`);
  lines.push(`command = ${tomlStr(entry.command)}`);
  if (entry.args && entry.args.length) {
    lines.push(`args = [${entry.args.map(tomlStr).join(", ")}]`);
  }
  const envKeys = Object.keys(entry.env || {});
  if (envKeys.length) {
    lines.push("");
    lines.push(`[mcp_servers.${SERVER_NAME}.env]`);
    for (const k of envKeys) lines.push(`${k} = ${tomlStr(entry.env[k])}`);
  }
  return lines.join("\n") + "\n";
}

// 移除已有的 [mcp_servers.<name>] 段及其子表，保留文件其余部分
export function stripCodexBlock(text) {
  const headerRe = /^\s*\[\[?([^\]]*)\]\]?\s*$/;
  const belongs = (h) =>
    h === `mcp_servers.${SERVER_NAME}` ||
    h.startsWith(`mcp_servers.${SERVER_NAME}.`) ||
    h === `mcp_servers."${SERVER_NAME}"` ||
    h.startsWith(`mcp_servers."${SERVER_NAME}".`);

  const out = [];
  let skipping = false;
  for (const line of text.split("\n")) {
    const m = line.match(headerRe);
    if (m) {
      if (belongs(m[1].trim())) {
        skipping = true;
        continue;
      }
      skipping = false;
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n");
}

function tomlHasEntry(configFile) {
  if (!fs.existsSync(configFile)) return false;
  try {
    const cfg = parseToml(fs.readFileSync(configFile, "utf8"));
    return !!(cfg.mcp_servers && cfg.mcp_servers[SERVER_NAME]);
  } catch {
    return false;
  }
}

export function writeTomlConfig(configFile, entry) {
  const dir = path.dirname(configFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let text = "";
  if (fs.existsSync(configFile)) {
    text = fs.readFileSync(configFile, "utf8");
    try {
      parseToml(text); // 先校验，避免污染损坏的文件
    } catch (e) {
      throw new Error(
        `Codex config.toml 解析失败 / not valid TOML:\n  ${configFile}\n  ${e.message}`
      );
    }
    backup(configFile, text);
    text = stripCodexBlock(text);
  }

  const base = text.trim() ? text.replace(/\s+$/, "") + "\n\n" : "";
  fs.writeFileSync(configFile, base + buildCodexBlock(entry));
}

// ====== 统一入口 ======

function hasEntry(target) {
  return target.type === "toml"
    ? tomlHasEntry(target.file)
    : jsonHasEntry(target.file);
}

function writeTarget(target, entry) {
  if (target.type === "toml") writeTomlConfig(target.file, entry);
  else writeJsonConfig(target.file, entry);
}

// ====== 主流程 ======

const BACK = Symbol("back");

export async function runSetup() {
  if (!process.stdin.isTTY) {
    console.error(
      "❌ setup 需要在交互式终端中运行 / setup must be run in an interactive terminal."
    );
    process.exitCode = 1;
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let lang = "zh"; // 由第一步选择，之后所有文案单语言显示
  const L = (zh, en) => (lang === "en" ? en : zh);

  const stack = []; // 已执行步骤索引栈，用于「返回上一步」
  const canGoBack = () => stack.length > 0;
  const isBackToken = (s) => /^(b|back|<|返回)$/i.test(s);

  // 输入 b / back / < / 返回（且存在上一步）时抛出 BACK，由引擎捕获后回退
  const ask = (question) =>
    new Promise((resolve, reject) => {
      rl.question(question, (a) => {
        const t = a.trim();
        if (canGoBack() && isBackToken(t)) reject(BACK);
        else resolve(t);
      });
    });
  const askDefault = async (label, def) => {
    const suffix = def ? ` (${def})` : "";
    const ans = await ask(`${label}${suffix}: `);
    return ans || def || "";
  };

  const state = {};

  const steps = [
    // 0. 语言
    {
      key: "lang",
      run: async () => {
        console.log("\n🍌 banana-image-mcp");
        console.log("选择语言 / Select language:");
        console.log("  1) 中文");
        console.log("  2) English");
        const a = await askDefault("请选择 / Enter number", "1");
        lang = a === "2" ? "en" : "zh";
      },
    },
    // 1. 客户端（可多选）
    {
      key: "clients",
      run: async () => {
        while (true) {
          console.log(
            L("\n选择要写入的 MCP 客户端（可多选）：", "\nSelect MCP client(s) (multi-select):")
          );
          CLIENTS.forEach((c, i) => console.log(`  ${i + 1}) ${c.label}`));
          console.log(`  ${CLIENTS.length + 1}) ${L("自定义 JSON 路径", "Custom JSON path")}`);
          console.log(
            L("  （逗号分隔多选，如 1,4；或输入 all 全选）", "  (comma-separated, e.g. 1,4; or 'all')")
          );
          const sel = await askDefault(L("请选择", "Enter number(s)"), "1");
          const targets = [];
          const seen = new Set();
          const add = (t) => {
            if (t.file && !seen.has(t.file)) {
              seen.add(t.file);
              targets.push(t);
            }
          };
          if (/^all$/i.test(sel)) {
            CLIENTS.forEach((c) => add({ ...c, file: expandHome(c.path()) }));
          } else {
            for (const tok of sel.split(/[,\s]+/).filter(Boolean)) {
              const n = parseInt(tok, 10);
              if (n >= 1 && n <= CLIENTS.length) {
                add({ ...CLIENTS[n - 1], file: expandHome(CLIENTS[n - 1].path()) });
              } else if (n === CLIENTS.length + 1) {
                const cp = await ask(
                  L("自定义 JSON 配置文件绝对路径：", "Absolute custom JSON config path: ")
                );
                if (cp) add({ key: "custom", label: "Custom (JSON)", type: "json", file: expandHome(cp) });
              }
            }
          }
          if (targets.length) {
            state.targets = targets;
            return;
          }
          console.log(L("⚠️ 未选择任何客户端，请重新选择。", "⚠️ No client selected, try again."));
        }
      },
    },
    // 2. 运行方式
    {
      key: "runChoice",
      run: async () => {
        console.log(L("\n运行方式：", "\nRun command:"));
        console.log(L("  1) npx（推荐，无需全局安装）", "  1) npx (recommended, no global install)"));
        console.log(
          L("  2) 全局命令 banana-image-mcp（需先 npm i -g）", "  2) global banana-image-mcp (needs npm i -g)")
        );
        state.runChoice = await askDefault(L("请选择", "Enter number"), "1");
      },
    },
    // 3. GEMINI_API_KEY
    {
      key: "apiKey",
      run: async () => {
        state.apiKey = await ask(L("\nGEMINI_API_KEY（必填）：", "\nGEMINI_API_KEY (required): "));
      },
    },
    // 4. 正向代理
    {
      key: "proxyUrl",
      run: async () => {
        state.proxyUrl = await askDefault(
          L(
            "正向代理 PROXY_URL（可选，如 http://127.0.0.1:7890 或 http://user:pass@host:port）",
            "Forward proxy PROXY_URL (optional, e.g. http://127.0.0.1:7890 or http://user:pass@host:port)"
          ),
          ""
        );
      },
    },
    // 5. 反向代理网关
    {
      key: "baseUrl",
      run: async () => {
        console.log(
          L(
            "\n自建 API 网关（可选，反向代理，与正向代理二选一）：",
            "\nSelf-hosted API gateway (optional, reverse proxy; alternative to PROXY_URL):"
          )
        );
        state.baseUrl = await askDefault(
          L("GEMINI_BASE_URL（可选，如 https://gemini.example.com）", "GEMINI_BASE_URL (optional, e.g. https://gemini.example.com)"),
          ""
        );
      },
    },
    // 6. 网关请求头（仅当填了 baseUrl）
    {
      key: "extraHeaders",
      when: () => !!state.baseUrl,
      run: async () => {
        const h = await ask(
          L("网关自定义请求头（可选，格式  名称: 值  多个用 ; 分隔）：", "Gateway custom headers (optional, 'Name: value; Name2: value2'): ")
        );
        state.extraHeaders = headersToJson(h);
      },
    },
    // 7. 生图模型
    {
      key: "model",
      run: async () => {
        console.log(L("\n生图模型：", "\nImage model:"));
        console.log(`  1) gemini-3.1-flash-image-preview (${L("默认", "default")})`);
        console.log(`  2) gemini-3.1-flash-lite-image (${L("更快更省", "faster/cheaper")})`);
        console.log(`  3) ${L("自定义", "custom")}`);
        const c = await askDefault(L("请选择", "Enter number"), "1");
        if (c === "2") state.model = "gemini-3.1-flash-lite-image";
        else if (c === "3") state.model = await ask(L("模型名：", "Model name: "));
        else state.model = "";
      },
    },
    // 8. 生图比例
    {
      key: "aspect",
      run: async () => {
        state.aspect = await askDefault(
          L("生图比例（16:9 / 1:1 / 9:16 / 4:3 / 3:2 / 21:9）", "Aspect ratio (16:9 / 1:1 / 9:16 / 4:3 / 3:2 / 21:9)"),
          "16:9"
        );
      },
    },
    // 9. 生图分辨率
    {
      key: "size",
      run: async () => {
        state.size = await askDefault(
          L("生图分辨率（1K / 2K / 4K）", "Resolution (1K / 2K / 4K)"),
          "1K"
        );
      },
    },
    // 10. 上传服务商
    {
      key: "provider",
      run: async () => {
        console.log(L("\n上传服务商：", "\nUpload provider:"));
        console.log(L("  1) 七牛云 Qiniu（默认）", "  1) Qiniu (default)"));
        console.log(L("  2) 阿里云 OSS Aliyun", "  2) Aliyun OSS"));
        const c = await askDefault(L("请选择", "Enter number"), "1");
        state.provider = c === "2" ? "aliyun" : "qiniu";
      },
    },
    // 11a-d. 七牛云
    {
      key: "qiniu.ak",
      when: () => state.provider === "qiniu",
      run: async () => {
        state.qiniu = state.qiniu || {};
        state.qiniu.ak = await ask("QINIU_ACCESS_KEY: ");
      },
    },
    {
      key: "qiniu.sk",
      when: () => state.provider === "qiniu",
      run: async () => {
        state.qiniu.sk = await ask("QINIU_SECRET_KEY: ");
      },
    },
    {
      key: "qiniu.bucket",
      when: () => state.provider === "qiniu",
      run: async () => {
        state.qiniu.bucket = await ask("QINIU_BUCKET: ");
      },
    },
    {
      key: "qiniu.cdn",
      when: () => state.provider === "qiniu",
      run: async () => {
        state.qiniu.cdn = await ask(
          L("QINIU_CDN_DOMAIN（如 https://cdn.example.com）：", "QINIU_CDN_DOMAIN (e.g. https://cdn.example.com): ")
        );
      },
    },
    // 12a-e. 阿里云
    {
      key: "aliyun.id",
      when: () => state.provider === "aliyun",
      run: async () => {
        state.aliyun = state.aliyun || {};
        state.aliyun.id = await ask("ALIYUN_OSS_ACCESS_KEY_ID: ");
      },
    },
    {
      key: "aliyun.secret",
      when: () => state.provider === "aliyun",
      run: async () => {
        state.aliyun.secret = await ask("ALIYUN_OSS_ACCESS_KEY_SECRET: ");
      },
    },
    {
      key: "aliyun.bucket",
      when: () => state.provider === "aliyun",
      run: async () => {
        state.aliyun.bucket = await ask("ALIYUN_OSS_BUCKET: ");
      },
    },
    {
      key: "aliyun.region",
      when: () => state.provider === "aliyun",
      run: async () => {
        state.aliyun.region = await askDefault("ALIYUN_OSS_REGION", "oss-cn-hangzhou");
      },
    },
    {
      key: "aliyun.cdn",
      when: () => state.provider === "aliyun",
      run: async () => {
        state.aliyun.cdn = await ask(
          L("ALIYUN_OSS_CDN_DOMAIN（可选）：", "ALIYUN_OSS_CDN_DOMAIN (optional): ")
        );
      },
    },
    // 13. 确认
    {
      key: "confirm",
      run: async () => {
        const entry = assembleEntry(state);
        console.log(L("\n═══ 请确认配置 ═══", "\n═══ Review ═══"));
        console.log(L("将写入以下文件：", "Will write to:"));
        for (const t of state.targets) {
          const exists = fs.existsSync(t.file);
          const dup = exists && hasEntry(t);
          const note = dup
            ? L("（已存在，将覆盖并备份）", " (overwrite + backup)")
            : exists
            ? L("（合并写入并备份）", " (merge + backup)")
            : L("（新建）", " (create)");
          console.log(`  • ${t.label}: ${t.file}${note}`);
        }
        console.log(L("命令：", "command: ") + entry.command + (entry.args ? " " + entry.args.join(" ") : ""));
        console.log(L("环境变量：", "env:"));
        for (const [k, v] of Object.entries(entry.env)) {
          console.log(`    ${k} = ${maskValue(k, v)}`);
        }
        if (!entry.env.GEMINI_API_KEY) {
          console.log(
            L("  ⚠️ 未填写 GEMINI_API_KEY，生图将不可用（可稍后补充）", "  ⚠️ GEMINI_API_KEY is empty; generation won't work until set")
          );
        }
        const a = await askDefault(L("\n确认写入？(Y/n)", "\nProceed? (Y/n)"), "Y");
        state.confirmed = /^y(es)?$/i.test(a);
      },
    },
  ];

  try {
    let i = 0;
    let tipShown = false;
    while (i < steps.length) {
      const step = steps[i];
      if (step.when && !step.when()) {
        i++;
        continue;
      }
      try {
        await step.run();
        if (step.key === "lang" && !tipShown) {
          console.log(
            L("\n提示：任何提示下输入 b 可返回上一步。", "\nTip: type 'b' at any prompt to go back.")
          );
          tipShown = true;
        }
        stack.push(i);
        i++;
      } catch (e) {
        if (e === BACK) {
          i = stack.length ? stack.pop() : i;
          continue;
        }
        throw e;
      }
    }
  } finally {
    rl.close();
  }

  if (!state.confirmed) {
    console.log(L("已取消。", "Aborted."));
    return;
  }

  // 逐个写入
  const entry = assembleEntry(state);
  const ok = [];
  const failed = [];
  for (const t of state.targets) {
    try {
      writeTarget(t, entry);
      ok.push(t);
    } catch (e) {
      failed.push({ t, error: e.message });
    }
  }

  console.log("");
  for (const t of ok) console.log(`✅ ${L("已写入", "written")}: ${t.label} -> ${t.file}`);
  for (const f of failed)
    console.log(`❌ ${L("写入失败", "failed")}: ${f.t.label} -> ${f.t.file}\n   ${f.error}`);
  console.log(`\nMCP server name: ${SERVER_NAME}`);
  console.log(
    L("请重启对应的 MCP 客户端使配置生效。\n", "Restart the MCP client(s) to apply.\n")
  );
}
