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

function createAsk(rl) {
  const ask = (question) =>
    new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));
  const askDefault = async (label, def) => {
    const suffix = def ? ` (${def})` : "";
    const ans = await ask(`${label}${suffix}: `);
    return ans || def || "";
  };
  return { ask, askDefault };
}

function backup(configFile, rawText) {
  const b = `${configFile}.backup-${timestamp()}`;
  fs.writeFileSync(b, rawText);
  return b;
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
  const { ask, askDefault } = createAsk(rl);

  try {
    console.log("\n🍌 banana-image-mcp 配置向导 / setup wizard\n");

    // 1. 选择客户端（可多选）
    console.log("选择要写入的 MCP 客户端（可多选）/ Select MCP client(s):");
    CLIENTS.forEach((c, i) => console.log(`  ${i + 1}) ${c.label}`));
    console.log(`  ${CLIENTS.length + 1}) 自定义 JSON 路径 / Custom JSON path`);
    console.log("  (可多选，用逗号分隔，如 1,4；或输入 all 全选)");
    const sel = await askDefault(
      "请选择 / Enter number(s)",
      "1"
    );

    const targets = [];
    const seen = new Set();
    const addTarget = (t) => {
      if (!t.file || seen.has(t.file)) return;
      seen.add(t.file);
      targets.push(t);
    };

    if (/^all$/i.test(sel)) {
      CLIENTS.forEach((c) => addTarget({ ...c, file: expandHome(c.path()) }));
    } else {
      for (const token of sel.split(/[,\s]+/).filter(Boolean)) {
        const n = parseInt(token, 10);
        if (n >= 1 && n <= CLIENTS.length) {
          const c = CLIENTS[n - 1];
          addTarget({ ...c, file: expandHome(c.path()) });
        } else if (n === CLIENTS.length + 1) {
          const cp = await ask("自定义 JSON 配置文件绝对路径 / path: ");
          if (cp) {
            addTarget({
              key: "custom",
              label: "Custom (JSON)",
              type: "json",
              file: expandHome(cp),
            });
          }
        }
      }
    }

    if (!targets.length) {
      console.error("❌ 未选择任何客户端 / No client selected.");
      process.exitCode = 1;
      return;
    }

    // 2. 运行方式
    console.log("\n运行方式 / Run command:");
    console.log("  1) npx (推荐，无需全局安装 / no global install needed)");
    console.log("  2) 全局命令 banana-image-mcp (需先 npm i -g banana-image-mcp)");
    const runChoice = await askDefault("请输入序号 / Enter number", "1");

    // 3. Gemini 相关
    console.log("\n--- Google Gemini ---");
    const GEMINI_API_KEY = await ask("GEMINI_API_KEY (必填 / required): ");
    const PROXY_URL = await askDefault(
      "代理地址 PROXY_URL (可选，如本地 Clash 的 http://127.0.0.1:7890)",
      ""
    );

    console.log("生图模型 / Image model:");
    console.log("  1) gemini-3.1-flash-image-preview (默认 / default)");
    console.log("  2) gemini-3.1-flash-lite-image (Nano Banana Lite，更快更省)");
    console.log("  3) 自定义 / custom");
    const modelChoice = await askDefault("请输入序号 / Enter number", "1");
    let GEMINI_IMAGE_MODEL = "";
    if (modelChoice === "2") {
      GEMINI_IMAGE_MODEL = "gemini-3.1-flash-lite-image";
    } else if (modelChoice === "3") {
      GEMINI_IMAGE_MODEL = await ask("模型名 / model name: ");
    }

    const GEMINI_ASPECT_RATIO = await askDefault(
      "生图比例 GEMINI_ASPECT_RATIO (16:9 / 1:1 / 9:16 / 4:3 / 3:2 / 21:9)",
      "16:9"
    );
    const GEMINI_IMAGE_SIZE = await askDefault(
      "生图分辨率 GEMINI_IMAGE_SIZE (1K / 2K / 4K)",
      "1K"
    );

    // 4. 上传服务商
    console.log("\n--- 上传服务商 / Upload provider ---");
    console.log("  1) 七牛云 Qiniu (默认 / default)");
    console.log("  2) 阿里云 OSS Aliyun");
    const providerChoice = await askDefault("请输入序号 / Enter number", "1");
    const provider = providerChoice === "2" ? "aliyun" : "qiniu";

    const env = {};
    if (GEMINI_API_KEY) env.GEMINI_API_KEY = GEMINI_API_KEY;
    if (PROXY_URL) env.PROXY_URL = PROXY_URL;
    if (GEMINI_IMAGE_MODEL) env.GEMINI_IMAGE_MODEL = GEMINI_IMAGE_MODEL;
    if (GEMINI_ASPECT_RATIO && GEMINI_ASPECT_RATIO !== "16:9") {
      env.GEMINI_ASPECT_RATIO = GEMINI_ASPECT_RATIO;
    }
    if (GEMINI_IMAGE_SIZE && GEMINI_IMAGE_SIZE !== "1K") {
      env.GEMINI_IMAGE_SIZE = GEMINI_IMAGE_SIZE;
    }
    env.UPLOAD_PROVIDER = provider;

    if (provider === "qiniu") {
      console.log("\n--- 七牛云 Qiniu ---");
      env.QINIU_ACCESS_KEY = await ask("QINIU_ACCESS_KEY: ");
      env.QINIU_SECRET_KEY = await ask("QINIU_SECRET_KEY: ");
      env.QINIU_BUCKET = await ask("QINIU_BUCKET: ");
      env.QINIU_CDN_DOMAIN = await ask(
        "QINIU_CDN_DOMAIN (如 https://cdn.example.com): "
      );
    } else {
      console.log("\n--- 阿里云 OSS Aliyun ---");
      env.ALIYUN_OSS_ACCESS_KEY_ID = await ask("ALIYUN_OSS_ACCESS_KEY_ID: ");
      env.ALIYUN_OSS_ACCESS_KEY_SECRET = await ask(
        "ALIYUN_OSS_ACCESS_KEY_SECRET: "
      );
      env.ALIYUN_OSS_BUCKET = await ask("ALIYUN_OSS_BUCKET: ");
      env.ALIYUN_OSS_REGION = await askDefault(
        "ALIYUN_OSS_REGION",
        "oss-cn-hangzhou"
      );
      const cdn = await ask("ALIYUN_OSS_CDN_DOMAIN (可选 / optional): ");
      if (cdn) env.ALIYUN_OSS_CDN_DOMAIN = cdn;
    }

    for (const k of Object.keys(env)) {
      if (env[k] === "" || env[k] == null) delete env[k];
    }
    if (!env.GEMINI_API_KEY) {
      console.log(
        "\n⚠️  未填写 GEMINI_API_KEY，生图功能将不可用（可稍后手动补充）/ GEMINI_API_KEY is empty; add it later to enable generation."
      );
    }

    const entry =
      runChoice === "2"
        ? { command: "banana-image-mcp", env }
        : { command: "npx", args: ["-y", "banana-image-mcp"], env };

    // 5. 展示计划并确认
    console.log("\n即将写入以下配置文件 / Will write to:");
    for (const t of targets) {
      const exists = fs.existsSync(t.file);
      const dup = exists && hasEntry(t);
      const note = dup
        ? " （已存在 banana-image，将覆盖并备份 / will overwrite + backup）"
        : exists
        ? " （合并写入并备份 / merge + backup）"
        : " （新建 / create）";
      console.log(`  • ${t.label}: ${t.file}${note}`);
    }
    const confirm = await askDefault("\n确认写入？/ Proceed? (Y/n)", "Y");
    if (!/^y(es)?$/i.test(confirm)) {
      console.log("已取消 / Aborted.");
      return;
    }

    // 6. 逐个写入
    const ok = [];
    const failed = [];
    for (const t of targets) {
      try {
        writeTarget(t, entry);
        ok.push(t);
      } catch (e) {
        failed.push({ t, error: e.message });
      }
    }

    console.log("");
    for (const t of ok) console.log(`✅ 已写入 / written: ${t.label} -> ${t.file}`);
    for (const f of failed)
      console.log(`❌ 写入失败 / failed: ${f.t.label} -> ${f.t.file}\n   ${f.error}`);
    console.log(`\nMCP server name: ${SERVER_NAME}`);
    console.log(
      "请重启对应的 MCP 客户端使配置生效 / Restart the MCP client(s) to apply.\n"
    );
  } finally {
    rl.close();
  }
}
