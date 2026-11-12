# banana-image-mcp

[![npm version](https://img.shields.io/npm/v/banana-image-mcp.svg)](https://www.npmjs.com/package/banana-image-mcp)
[![npm downloads](https://img.shields.io/npm/dm/banana-image-mcp.svg)](https://www.npmjs.com/package/banana-image-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/banana-image-mcp.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

[English](./README.md)

一个基于 MCP (Model Context Protocol) 的图片生成、处理与 CDN 上传服务，集成 Google Gemini AI、Sharp，支持七牛云和阿里云 OSS 存储。

## 功能特性

- 使用 Google Gemini AI 生成高质量图片
- **支持代理与网关** —— 在无法直接访问 Google Gemini 的网络环境（如中国大陆）下，可通过正向代理（`PROXY_URL`）或自建反向代理网关（`GEMINI_BASE_URL`）访问
- **可配置生图模型** —— 默认 `gemini-3.1-flash-image-preview`，也可切换为 `gemini-3.1-flash-lite-image`
- **可配置生图比例与分辨率** —— 如 `16:9` / `1:1` / `9:16`，以及 `1K` / `2K` / `4K`
- **预设封面风格** —— 传入 `style` 才套用固定风格提示词。不传则保持原来的生图逻辑。例如 `dark-chalkboard`、`pornhub`（橙标大字）。也可以把自建风格存到本机，更新 MCP 不会清掉
- **交互式配置向导** —— 运行 `banana-image-mcp setup` 自动写入配置，无需手动编辑 JSON
- 支持上传本地图片或网络图片到 CDN（七牛云或阿里云 OSS）
- 自动转换为 WebP 格式并压缩
- 文件名自动添加日期前缀，支持自定义上传路径
- 自动清理临时文件
- 通过环境变量切换上传服务商

## 快速开始

### 交互式配置（`setup`，推荐）

安装（或首次使用）后运行 `setup` 向导即可完成全部配置，无需手动编辑 JSON：

```bash
npx -y banana-image-mcp setup
# 或者，如果已全局安装：
banana-image-mcp setup
```

向导会先让你选择**语言**（中文 / English），然后依次询问：

1. **写入哪个 / 哪些客户端**（可多选）：**Claude Code**、**Claude Desktop**、**Cursor**、**Codex** 或自定义 JSON 路径；
2. **运行方式**：`npx`（推荐）或全局命令 `banana-image-mcp`；
3. **`GEMINI_API_KEY`**、**代理 / 网关**（`PROXY_URL` 或 `GEMINI_BASE_URL`，见下方「网络」说明）；
4. **生图模型、比例、分辨率**；
5. **上传服务商**（七牛云 / 阿里云 OSS）及其密钥。

> 输错了？在任意提示下输入 **`b`**（或 `back`）即可**返回上一步**。
> 最后还有一个确认页，可在写入前核对全部配置（密钥自动掩码）。

最后会把 `banana-image` 这一项**合并**写入到所选客户端的配置文件（写入前**自动备份**原文件），
不影响你已有的其他 MCP 服务器（Codex 的 `config.toml` 为就地编辑，保留其余段落与注释）。
配置完成后请**重启对应客户端**使其生效。

### 手动配置

想自己编辑配置？把 `banana-image` 服务加到 MCP 客户端的配置文件里即可。

#### 使用 npx（推荐）

无需安装，直接在 MCP 客户端中配置：

**七牛云（默认）：**

```json
{
  "mcpServers": {
    "banana-image": {
      "command": "npx",
      "args": ["-y", "banana-image-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key",
        "QINIU_ACCESS_KEY": "your-qiniu-access-key",
        "QINIU_SECRET_KEY": "your-qiniu-secret-key",
        "QINIU_BUCKET": "your-bucket-name",
        "QINIU_CDN_DOMAIN": "https://your-cdn-domain.com"
      }
    }
  }
}
```

**阿里云 OSS：**

```json
{
  "mcpServers": {
    "banana-image": {
      "command": "npx",
      "args": ["-y", "banana-image-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key",
        "UPLOAD_PROVIDER": "aliyun",
        "ALIYUN_OSS_ACCESS_KEY_ID": "your-access-key-id",
        "ALIYUN_OSS_ACCESS_KEY_SECRET": "your-access-key-secret",
        "ALIYUN_OSS_BUCKET": "your-bucket-name",
        "ALIYUN_OSS_REGION": "oss-cn-hangzhou",
        "ALIYUN_OSS_CDN_DOMAIN": "https://your-cdn-domain.com"
      }
    }
  }
}
```

#### 全局安装

```bash
npm install -g banana-image-mcp
```

然后在 MCP 客户端中配置：

**七牛云（默认）：**

```json
{
  "mcpServers": {
    "banana-image": {
      "command": "banana-image-mcp",
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key",
        "QINIU_ACCESS_KEY": "your-qiniu-access-key",
        "QINIU_SECRET_KEY": "your-qiniu-secret-key",
        "QINIU_BUCKET": "your-bucket-name",
        "QINIU_CDN_DOMAIN": "https://your-cdn-domain.com"
      }
    }
  }
}
```

**阿里云 OSS：**

```json
{
  "mcpServers": {
    "banana-image": {
      "command": "banana-image-mcp",
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key",
        "UPLOAD_PROVIDER": "aliyun",
        "ALIYUN_OSS_ACCESS_KEY_ID": "your-access-key-id",
        "ALIYUN_OSS_ACCESS_KEY_SECRET": "your-access-key-secret",
        "ALIYUN_OSS_BUCKET": "your-bucket-name",
        "ALIYUN_OSS_REGION": "oss-cn-hangzhou",
        "ALIYUN_OSS_CDN_DOMAIN": "https://your-cdn-domain.com"
      }
    }
  }
}
```

#### 使用代理（如中国大陆）

中国大陆通常无法直接访问 Google Gemini。请从下面**两种方式中选一种**，把对应变量加进
`env` 里。完整说明见下方 [网络 —— 访问 Gemini 的两种方式](#网络--访问-gemini-的两种方式)。

**A. 正向代理** —— 本地客户端（Clash / V2Ray / Shadowsocks）或付费 HTTP 代理，加 `PROXY_URL`：

```json
{
  "mcpServers": {
    "banana-image": {
      "command": "npx",
      "args": ["-y", "banana-image-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key",
        "PROXY_URL": "http://127.0.0.1:7890",
        "QINIU_ACCESS_KEY": "your-qiniu-access-key",
        "QINIU_SECRET_KEY": "your-qiniu-secret-key",
        "QINIU_BUCKET": "your-bucket-name",
        "QINIU_CDN_DOMAIN": "https://your-cdn-domain.com"
      }
    }
  }
}
```

- **Clash / Clash Verge / ClashX**：用「设置 → 端口」里显示的混合/HTTP 端口（默认 `7890`）→ `http://127.0.0.1:7890`；或直接开 **TUN 模式**透明代理，这样**不用**设 `PROXY_URL`。
- 需要账号密码的代理：`http://用户名:密码@host:port`（密码里的特殊字符要 URL 编码，如 `+` → `%2B`）。
- ⚠️ 只开客户端的「系统代理」开关（即使切到「全局」模式）**没用** —— Node 的 `fetch` 不认系统代理。必须用 `PROXY_URL` 或 **TUN 模式**。

**B. 反向代理网关** —— 一个转发到 Gemini API 的自建端点（如 Cloudflare Worker）。设置
`GEMINI_BASE_URL`（及它需要的请求头），**不要**再设 `PROXY_URL`。由于 `GEMINI_EXTRA_HEADERS`
是「JSON 套在 JSON 里」，内部引号要用 `\"` 转义：

```json
{
  "mcpServers": {
    "banana-image": {
      "command": "npx",
      "args": ["-y", "banana-image-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key",
        "GEMINI_BASE_URL": "https://gemini.example.com",
        "GEMINI_EXTRA_HEADERS": "{\"x-cf-proxy-key\":\"your-gateway-key\"}",
        "QINIU_ACCESS_KEY": "your-qiniu-access-key",
        "QINIU_SECRET_KEY": "your-qiniu-secret-key",
        "QINIU_BUCKET": "your-bucket-name",
        "QINIU_CDN_DOMAIN": "https://your-cdn-domain.com"
      }
    }
  }
}
```

#### Codex（CLI 与 Desktop）

Codex CLI 和 Codex 桌面版（`Codex.app`）**共用同一个配置文件** `~/.codex/config.toml`
（TOML，不是 JSON），所以配一次就两个都生效。最省事的方式是用向导
（`banana-image-mcp setup` → 选 **Codex**），它会自动合并写入并备份原文件。手动配置则在
`~/.codex/config.toml` 里加上：

```toml
[mcp_servers.banana-image]
command = "/absolute/path/to/npx"
args = ["-y", "banana-image-mcp"]

[mcp_servers.banana-image.env]
GEMINI_API_KEY = "your-gemini-api-key"
# 若需要代理/网关，在这里加 PROXY_URL 或 GEMINI_BASE_URL（见下方「网络」说明）
UPLOAD_PROVIDER = "qiniu"
QINIU_ACCESS_KEY = "your-qiniu-access-key"
QINIU_SECRET_KEY = "your-qiniu-secret-key"
QINIU_BUCKET = "your-bucket-name"
QINIU_CDN_DOMAIN = "https://your-cdn-domain.com"
```

> ⚠️ **`command` 要用绝对路径**（即 `which npx` 的输出），不要只写 `npx`。Codex **桌面版**
> 不继承你终端的 `PATH`，直接写 `"npx"` 通常会启动失败。同时请指向 `sharp` 支持的
> `node`/`npx` 版本（Node 18 / 20 / 22 —— 避免像 26 这种太新、还没有预编译包的大版本）。
> 例如 nvm 的路径形如 `~/.nvm/versions/node/v22.16.0/bin/npx`。

配置后**重启 Codex**（CLI 开新会话，或退出重开桌面版）即可加载该服务。

### 升级

```bash
# npx 用户：清除缓存即可获取最新版本
npx clear-npx-cache && npx -y banana-image-mcp

# 全局安装用户
npm update -g banana-image-mcp
```

磁盘上的新包不会替换已经在跑的 MCP 进程。请完全退出客户端再打开，否则下一次生图仍走旧进程。见[常见问题](#常见问题)。

### 配置文件位置

`banana-image` 这一项位于客户端配置文件的 `mcpServers` 对象下：

| 客户端 | 操作系统 | 路径 |
|---|---|---|
| **Claude Code** | macOS | `~/.claude.json` |
| **Claude Code** | Windows | `%USERPROFILE%\.claude.json` |
| **Claude Desktop** | macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Claude Desktop** | Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Cursor** | macOS / Windows | `~/.cursor/mcp.json` |
| **Codex** | macOS / Windows | `~/.codex/config.toml`（TOML：`[mcp_servers.banana-image]`） |

> 提示：运行 `banana-image-mcp setup` 可自动创建/更新上述任意客户端（或自定义路径）的配置文件，并在写入前自动备份原文件。

对于 Claude Code，也可以直接用命令行添加：

```bash
claude mcp add banana-image -- npx -y banana-image-mcp
```

## 命令行命令

| 命令 | 说明 |
|---|---|
| `banana-image-mcp setup` | 交互式配置向导 |
| `banana-image-mcp history` | 查看生图历史 / 日志 |
| `banana-image-mcp styles` | 列出风格；`styles --style <id>` 查看提示词；`styles add --prompt` 保存手写提示词；`styles add --image <路径或链接>` 从图片提取风格 |
| `banana-image-mcp --version` | 打印版本号 |
| `banana-image-mcp` | 以 stdio 方式运行 MCP 服务（供 MCP 客户端调用） |

> **CLI 从哪里读配置**：CLI 和 MCP 服务是两条独立入口。`setup` 写进客户端配置文件（`~/.claude.json`、`~/.codex/config.toml` 等）里的 `env`，只会注入 MCP 子进程；在终端里跑 `history` / `styles` 时，读的是**当前进程的环境变量**和**当前目录的 `.env`**。
>
> 因此 `styles add --image`（从参考图提取风格，会调用 Gemini 视觉模型）之前，请确保当前 shell 里能拿到 `GEMINI_API_KEY`：临时 `export GEMINI_API_KEY=...`，或者把 `.env` 放在你执行命令的那个目录。`styles add --prompt` 只写本地文件，不需要 key。

### `history` —— 生图历史日志

每次 `generate_image` / `generate_blog_cover` / `upload_image` 调用都会记录到
`~/.banana-image-mcp/history.jsonl`。以表格形式（最新在前）查看：

```bash
npx -y banana-image-mcp history
```

显示日期时间、结果（成功/失败）、类型、**模型**、**风格**、图片大小、生成耗时、图片链接（或失败原因）。
默认展示最近 10 条；在交互式终端中可用 **↑/↓**（或 `j`/`k`）向下/向上翻页，按 `q` 退出。

```
   #  时间                 结果    类型  模型                     风格              大小       耗时     链接 / 失败原因
 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
   1  2026-07-09 22:15:03  ✓ 成功  封面  3.1-flash-image-preview  pornhub           186.4 KB   3.4s     https://cdn.example.com/…
   2  2026-07-09 21:58:11  ✗ 失败  生图  3.1-flash-lite-image     —                 —          0.9s     fetch failed (proxy?)
```

## 环境变量

### 上传服务商

| 变量 | 说明 |
|---|---|
| `UPLOAD_PROVIDER` | 上传服务商：`qiniu`（默认）或 `aliyun` |

### 图片生成

| 变量 | 默认值 | 说明 |
|---|---|---|
| `GEMINI_API_KEY` | — | Google Gemini API 密钥，用于图片生成（必填） |
| `GEMINI_IMAGE_MODEL` | `gemini-3.1-flash-image-preview` | 生图模型，也支持 `gemini-3.1-flash-lite-image` |
| `GEMINI_ASPECT_RATIO` | `16:9` | 生图比例，如 `16:9`、`1:1`、`9:16`、`4:3`、`3:2`、`21:9` |
| `GEMINI_IMAGE_SIZE` | `1K` | 生图分辨率：`1K`、`2K` 或 `4K` |
| `IMAGE_STYLE` | （无） | 全局风格 id，由 `banana-image-mcp setup` 写入。单次调用的 `style` 优先。该次传 `none` 则不套全局风格 |
| `GEMINI_VISION_MODEL` | `gemini-3.8-flash` | 从参考图提取风格提示词时使用的模型。走和生图相同的代理或网关 |
| `WEBP_QUALITY` | `80` | WebP 压缩质量（1–100） |

> 以上为默认值；`generate_blog_cover` 与 `generate_image` 也支持在调用时传入
> `model` / `aspectRatio` / `imageSize` / `style`。调用里的 `style` 覆盖 `IMAGE_STYLE`。

### 网络 —— 访问 Gemini 的两种方式

当无法直接访问 Google Gemini（如中国大陆）时使用。有**两种独立机制**，按你的代理类型选择其一即可。

**1. 正向代理**（`PROXY_URL`）—— 把原始流量隧道转发到 Google。适用于本地 Clash / V2Ray / Shadowsocks
客户端，或付费的 HTTP 代理服务。

| 变量 | 说明 |
|---|---|
| `PROXY_URL` | HTTP/HTTPS 正向代理，如 `http://127.0.0.1:7890` 或 `http://user:pass@host:port` |

- 通常就是你本地代理客户端暴露的端口（Clash 默认混合端口 `7890` → `http://127.0.0.1:7890`）。
- 支持带账号密码的代理：`http://用户名:密码@host:port`（密码里的特殊字符需 URL 编码，如 `+` → `%2B`）。
- 仅支持 HTTP/HTTPS 代理，**不支持 SOCKS5**。
- 若未设置 `PROXY_URL`，也会读取标准的 `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY` 环境变量。
- 同时作用于 Gemini API 请求与网络图片下载。

> ⚠️ Node 内置的 `fetch` **不认操作系统的「系统代理」设置**。仅打开代理客户端的「系统代理」开关
> （即使切到「全局/Global」规则模式）也无法让本服务走代理。请设置 `PROXY_URL`，或使用在网络层
> 透明接管流量的 **TUN / 虚拟网卡模式**（TUN 会接管所有流量，因此无需再设 `PROXY_URL`）。

**2. 反向代理网关**（`GEMINI_BASE_URL` [+ `GEMINI_EXTRA_HEADERS`]）—— 把 SDK 的请求指向一个转发到
Gemini API 的自建端点（如 Cloudflare Worker）。这种方式下**不要**设置 `PROXY_URL`。

| 变量 | 说明 |
|---|---|
| `GEMINI_BASE_URL` | 网关地址，如 `https://gemini.example.com` |
| `GEMINI_EXTRA_HEADERS` | 网关需要的自定义请求头。JSON，如 `{"x-cf-proxy-key":"..."}`；也可用 `名称: 值; 名称2: 值2` 字符串 |

### 七牛云（当 `UPLOAD_PROVIDER=qiniu` 或未设置时）

| 变量 | 说明 |
|---|---|
| `QINIU_ACCESS_KEY` | 七牛云 AccessKey |
| `QINIU_SECRET_KEY` | 七牛云 SecretKey |
| `QINIU_BUCKET` | 七牛云存储空间名称 |
| `QINIU_CDN_DOMAIN` | CDN 域名，用于生成图片访问链接 |

### 阿里云 OSS（当 `UPLOAD_PROVIDER=aliyun` 时）

| 变量 | 必填 | 说明 |
|---|---|---|
| `ALIYUN_OSS_ACCESS_KEY_ID` | 是 | 阿里云 AccessKey ID |
| `ALIYUN_OSS_ACCESS_KEY_SECRET` | 是 | 阿里云 AccessKey Secret |
| `ALIYUN_OSS_BUCKET` | 是 | OSS 存储空间名称 |
| `ALIYUN_OSS_REGION` | 是 | OSS 区域，如 `oss-cn-hangzhou` |
| `ALIYUN_OSS_CDN_DOMAIN` | 否 | 自定义 CDN 域名（未设置则使用 OSS 默认 URL） |

### 获取 API Keys

**Google Gemini API Key**：
1. 访问 [Google AI Studio](https://aistudio.google.com/apikey)
2. 创建或获取 API Key

**七牛云配置**：
1. 注册 [七牛云账号](https://portal.qiniu.com/)
2. 创建存储空间（Bucket）
3. 在个人中心获取 AccessKey 和 SecretKey
4. 配置 CDN 域名

**阿里云 OSS 配置**：
1. 注册 [阿里云账号](https://www.aliyun.com/)
2. 创建 OSS 存储空间（Bucket）
3. 在 AccessKey 管理页面获取 AccessKey ID 和 AccessKey Secret
4. 记录存储空间所在区域（如 `oss-cn-hangzhou`）

## 预设风格

`generate_image` 和 `generate_blog_cover` 的 `style` 是可选参数。一次调用按下面的顺序决定风格：

1. 这次传入的 `style`。
2. 没有传入时，用 `IMAGE_STYLE`（setup 或环境变量里设置了才有）。
3. 都没有时，走原来的生图逻辑：只把 `prompt` 发给模型。

这一次传 `none`，就跳过全局风格。传空字符串会落到 `IMAGE_STYLE`。

`banana-image-mcp setup` 会询问全局风格，并把风格 id 写进 MCP 客户端配置的 `IMAGE_STYLE`。直接回车或输入 `none` 表示不设全局风格。setup 会重写整条配置，所以原来保存的 `IMAGE_STYLE` 会被清掉。改完后重启 MCP 客户端。

主题、标题原文和步骤写在 `prompt` 里。风格只锁定介质、配色、字体和版式。账号可以设一个全局风格，某一张图想换样子时，再单独传一个 `style`。

```bash
npx -y banana-image-mcp styles
npx -y banana-image-mcp styles --style dark-chalkboard
```

| id | 风格 | 适合 |
|---|---|---|
| `dark-chalkboard` | 深色粉笔黑板 | 教程、流程图、清单 |
| `pornhub` | 橙标大字（纯黑底，白字加橙色圆角标） | 要强识别度的标题封面 |
| `xiaohongshu` | 小红书笔记 | 生活方式、种草封面 |
| `big-type` | 大字报 | 信息流里必须一眼读完的标题 |
| `wechat-editorial` | 公众号头图 | 头条封面、专栏、长文 |
| `premium-dark` | 暗金课程 | 课程、知识付费 |
| `bold-thumbnail` | 色块视频封面 | 视频缩略图 |
| `liquid-glass` | 液态玻璃 | 科技产品、工具 |
| `clay-3d` | 黏土三维 | 讲解、轻松主题 |
| `ink-wash` | 水墨留白 | 文化、随笔 |
| `paper-cut` | 层叠纸雕 | 生活方式、节日 |
| `brutalist` | 瑞士粗野海报 | 设计、观点 |

`pornhub` 只描述那套黑底橙标的词标版式，不生成照片。别名 `orange-wordmark`、`橙标` 指向同一风格。`dark-chalkboard` 沿用深色石板、白粉笔标题、粉彩黄绿粉、勾和星；具体标题和步骤写在 `prompt` 里，不会被风格写死。

也可调用工具 `list_image_styles`。传入 `id` 时会返回完整风格提示词。

### 自定义风格

内置风格都不合适时，可以自己建多条。每条有一个名称和一段风格提示词。保存之后，生图时把这个名称传给 `style`，用法和内置风格一样。

自定义风格写在本机 `~/.banana-image-mcp/styles.json`。这个文件在用户目录里，不在安装包里。更新、重装或换版本 banana-image-mcp 都不会删除它，已经建好的风格会留着。

```bash
banana-image-mcp styles add --name "奶油笔记" --prompt "Soft cream paper, huge rounded black title, blush pink tape and mint stickers."
```

如果看到一张图的风格好看，但不想自己写提示词，可以把本地路径或 http(s) 链接交给它。视觉模型只描述画面体系（介质、配色、字体、版式），这段文字会存成风格提示词。图里的主体和标题文字不会写进去。

用 `--image` 时命令行会调用 Gemini 视觉模型（`GEMINI_VISION_MODEL`），因此当前 shell 里必须能拿到 `GEMINI_API_KEY`——它不会从 MCP 客户端配置里继承，详见上文「CLI 从哪里读配置」。

```bash
banana-image-mcp styles add --name "奶油笔记" --image ./ref.png
banana-image-mcp styles add --name "奶油笔记" --image https://example.com/ref.png
```

`--prompt` 和 `--image` 同时给出时，保存手写提示词，图片不会发给模型。不带参数运行 `styles add` 时，先问名称，再问提示词；提示词直接回车，会再要一张参考图的路径或链接。同名再保存会更新这一条的提示词，其他自定义风格不动。名称不能和内置风格的 id 或别名重复。

MCP 工具是 `save_image_style`（参数 `name`，再加上 `prompt` 或 `image`）。删掉某一条用 `delete_image_style`，或：

```bash
banana-image-mcp styles remove --name "奶油笔记"
```

内置风格不能删除。

```json
{
  "prompt": "标题「周末咖啡」。一杯拿铁和一扇窗。",
  "slug": "weekend-coffee",
  "style": "奶油笔记"
}
```

```json
{
  "prompt": "标题「AI 提示词指南」。三步流程图：INPUT 键盘，PROCESS 机器人，RESULT 灯泡。",
  "slug": "ai-prompt-guide",
  "style": "dark-chalkboard"
}
```

### 示例

下面每张图使用同一条内容提示词，由本服务调用 `gemini-3.1-flash-image-preview` 生成，比例 `16:9`、分辨率 `1K`。生成时没有设置 `IMAGE_STYLE`。第一张没有传 `style`。其余每张只改了风格 id。

> The main title at the top says "AI PROMPT GUIDE" in large letters. The image shows a 3-step flowchart with arrows: Step 1 labeled "INPUT" with a keyboard icon, Step 2 labeled "PROCESS" with a cute robot head icon, and Step 3 labeled "RESULT" with a glowing lightbulb icon.

<table>
  <tr>
    <td align="center"><img src="docs/style-examples/none.webp" alt="不传 style" width="420"><br>不传 style</td>
    <td align="center"><img src="docs/style-examples/dark-chalkboard.webp" alt="dark-chalkboard" width="420"><br><code>dark-chalkboard</code> 深色粉笔黑板</td>
  </tr>
  <tr>
    <td align="center"><img src="docs/style-examples/pornhub.webp" alt="pornhub" width="420"><br><code>pornhub</code> 橙标大字</td>
    <td align="center"><img src="docs/style-examples/xiaohongshu.webp" alt="xiaohongshu" width="420"><br><code>xiaohongshu</code> 小红书笔记</td>
  </tr>
  <tr>
    <td align="center"><img src="docs/style-examples/big-type.webp" alt="big-type" width="420"><br><code>big-type</code> 大字报</td>
    <td align="center"><img src="docs/style-examples/wechat-editorial.webp" alt="wechat-editorial" width="420"><br><code>wechat-editorial</code> 公众号头图</td>
  </tr>
  <tr>
    <td align="center"><img src="docs/style-examples/premium-dark.webp" alt="premium-dark" width="420"><br><code>premium-dark</code> 暗金课程</td>
    <td align="center"><img src="docs/style-examples/bold-thumbnail.webp" alt="bold-thumbnail" width="420"><br><code>bold-thumbnail</code> 色块视频封面</td>
  </tr>
  <tr>
    <td align="center"><img src="docs/style-examples/liquid-glass.webp" alt="liquid-glass" width="420"><br><code>liquid-glass</code> 液态玻璃</td>
    <td align="center"><img src="docs/style-examples/clay-3d.webp" alt="clay-3d" width="420"><br><code>clay-3d</code> 黏土三维</td>
  </tr>
  <tr>
    <td align="center"><img src="docs/style-examples/ink-wash.webp" alt="ink-wash" width="420"><br><code>ink-wash</code> 水墨留白</td>
    <td align="center"><img src="docs/style-examples/paper-cut.webp" alt="paper-cut" width="420"><br><code>paper-cut</code> 层叠纸雕</td>
  </tr>
  <tr>
    <td align="center"><img src="docs/style-examples/brutalist.webp" alt="brutalist" width="420"><br><code>brutalist</code> 瑞士粗野海报</td>
    <td></td>
  </tr>
</table>

## 工具

### `generate_blog_cover`

生成博客封面图片，转换为 WebP 格式，并上传到 CDN。图片尺寸遵循所配置的生图比例 / 分辨率（默认 `16:9`、`1K`）。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `prompt` | string | 是 | 描述要生成的图片的文本提示词 |
| `slug` | string | 是 | 文件名标识符（自动添加日期前缀） |
| `path` | string | 否 | 上传目录路径（默认：`blog-cover`） |
| `model` | string | 否 | 模型覆盖（默认：`GEMINI_IMAGE_MODEL` 或 `gemini-3.1-flash-image-preview`） |
| `aspectRatio` | string | 否 | 生图比例覆盖（默认：`GEMINI_ASPECT_RATIO` 或 `16:9`） |
| `imageSize` | string | 否 | 分辨率覆盖 `1K`/`2K`/`4K`（默认：`GEMINI_IMAGE_SIZE` 或 `1K`） |
| `style` | string | 否 | 风格 id。优先于 `IMAGE_STYLE`。不传时使用全局风格；没设全局风格则不套风格。传 `none` 表示这一次跳过全局风格 |

**返回值：**

```json
{
  "url": "https://your-cdn-domain.com/blog-cover/20260321-my-post.webp",
  "style": "dark-chalkboard",
  "styleOrigin": "call"
}
```

`style` 是实际套用的风格 id。`styleOrigin` 为 `call` 表示这次传入了 `style`，为 `global` 表示用的是 `IMAGE_STYLE`。没有套风格时不返回 `style`。这次传了 `none` 时，返回 `styleOrigin: "call"`，没有 `style`。

### `generate_image`

使用 Gemini AI 生成图片，转换为 WebP 格式，并上传到 CDN。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `prompt` | string | 是 | 描述要生成的图片的文本提示词 |
| `slug` | string | 是 | 文件名标识符（自动添加日期前缀） |
| `path` | string | 否 | 上传目录路径（默认：`aigc/image`） |
| `model` | string | 否 | 模型覆盖（默认：`GEMINI_IMAGE_MODEL` 或 `gemini-3.1-flash-image-preview`） |
| `aspectRatio` | string | 否 | 生图比例覆盖（默认：`GEMINI_ASPECT_RATIO` 或 `16:9`） |
| `imageSize` | string | 否 | 分辨率覆盖 `1K`/`2K`/`4K`（默认：`GEMINI_IMAGE_SIZE` 或 `1K`） |
| `style` | string | 否 | 风格 id。优先于 `IMAGE_STYLE`。不传时使用全局风格；没设全局风格则不套风格。传 `none` 表示这一次跳过全局风格 |

**返回值：**

```json
{
  "url": "https://your-cdn-domain.com/aigc/image/20260321-my-image.webp",
  "style": "pornhub",
  "styleOrigin": "global"
}
```

### `list_image_styles`

列出内置风格和本机自定义风格。结果里的 `globalStyle` 是当前进程在不传 `style` 时会使用的 `IMAGE_STYLE`。传入 `id`（或别名、自定义名称）时附上该风格的固定提示词。`IMAGE_STYLE` 无法识别时写在 `globalStyle.error` 里，风格目录仍然返回。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 否 | 风格 id、别名或自定义名称。省略则返回全部风格 |

### `save_image_style`

把一条自定义风格保存到 `~/.banana-image-mcp/styles.json`。可以手写提示词，也可以给一张图，由模型提取风格提示词。同名再次调用会更新这一条，其他风格保留。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | string | 是 | 风格名称。之后作为 `style` 传入 |
| `prompt` | string | 否 | 固定风格提示词，只写介质、配色、字体和版式。没给 `image` 时必填。两者都有时以它为准 |
| `image` | string | 否 | 本地路径或 http(s) 链接。只在 `prompt` 为空时使用，由视觉模型写成风格提示词 |

### `delete_image_style`

删除一条自定义风格。内置风格不能删。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | string | 是 | 要删除的自定义风格名称或 id |

### `upload_image`

上传本地图片或网络图片到 CDN，自动转换为 WebP 格式。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `source` | string | 是 | 本地文件路径或 HTTP/HTTPS 图片链接 |
| `slug` | string | 是 | 文件名标识符（自动添加日期前缀） |
| `path` | string | 否 | 上传目录路径（默认：`images`） |

**返回值：**

```json
{
  "url": "https://your-cdn-domain.com/images/20260321-my-photo.webp"
}
```

## 常见问题

### 已经升级，history 里还是没有风格

`npx -y banana-image-mcp` 会下载新包。新开的终端里，`--version` 可以已经是新版本，`history` 也能看到风格列。Claude Code、Claude Desktop、Cursor、Codex 里面的服务是另一个进程，它一直用着启动时加载的那一版。磁盘上的文件换掉了，这个进程不会跟着换。

重启前生成的封面，画面仍可能像你要的风格，因为那段描述写进了提示词。历史记录里没有 `style` 字段，风格列就显示 `—`。

客户端如果本来就是 `npx -y banana-image-mcp`，配置不用改，也不用锁版本。

1. 完全退出客户端。只开一个新对话不够。把残留的窗口或进程都退出，然后重新打开。
2. 再传一次 `style` 生图，例如 `pornhub`。
3. 离开本仓库目录后检查版本和记录：

```bash
cd ~
npx -y banana-image-mcp --version
npx -y banana-image-mcp history
```

新的那一行会显示风格 id，例如 `pornhub`。更早的行仍是 `—`。那些记录是旧服务写的，当时没有保存风格。

## 架构

```
提示词 + 可选风格提示词 → Google Gemini API (PNG) → Sharp (WebP) → CDN（七牛云 / 阿里云 OSS） → URL
图片源 (本地/网络) ──────────→ Sharp (WebP) → CDN（七牛云 / 阿里云 OSS） → URL
```

- **图片生成**：Google Gemini（默认 `gemini-3.1-flash-image-preview`，可配置），可经由可选的正向代理或反向代理网关访问
- **图片处理**：Sharp（WebP 转换；保留生成图片的比例 / 分辨率）
- **云存储**：七牛云或阿里云 OSS（通过 `UPLOAD_PROVIDER` 配置）

## 许可证

MIT
