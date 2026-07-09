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
| `banana-image-mcp --version` | 打印版本号 |
| `banana-image-mcp` | 以 stdio 方式运行 MCP 服务（供 MCP 客户端调用） |

### `history` —— 生图历史日志

每次 `generate_image` / `generate_blog_cover` / `upload_image` 调用都会记录到
`~/.banana-image-mcp/history.jsonl`。以表格形式（最新在前）查看：

```bash
npx -y banana-image-mcp history
```

显示 日期时间、结果（成功/失败）、类型、**模型**、图片大小、生成耗时、图片链接（或失败原因）。
默认展示最近 10 条；在交互式终端中可用 **↑/↓**（或 `j`/`k`）向下/向上翻页，按 `q` 退出。

```
   #  时间                 结果    类型  模型                     大小       耗时     链接 / 失败原因
 ───────────────────────────────────────────────────────────────────────────────────────────────────
   1  2026-07-09 22:15:03  ✓ 成功  封面  3.1-flash-image-preview  186.4 KB   3.4s     https://cdn.example.com/…
   2  2026-07-09 21:58:11  ✗ 失败  生图  3.1-flash-lite-image     —          0.9s     fetch failed (proxy?)
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
| `WEBP_QUALITY` | `80` | WebP 压缩质量（1–100） |

> 以上为默认值；`generate_blog_cover` 与 `generate_image` 也支持在调用时传入
> `model` / `aspectRatio` / `imageSize` 参数，覆盖环境变量的默认设置。

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

**返回值：**

```json
{
  "url": "https://your-cdn-domain.com/blog-cover/20260321-my-post.webp"
}
```

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

**返回值：**

```json
{
  "url": "https://your-cdn-domain.com/aigc/image/20260321-my-image.webp"
}
```

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

## 架构

```
提示词 → Google Gemini API (PNG) → Sharp (WebP) → CDN（七牛云 / 阿里云 OSS） → URL
图片源 (本地/网络) ──────────→ Sharp (WebP) → CDN（七牛云 / 阿里云 OSS） → URL
```

- **图片生成**：Google Gemini（默认 `gemini-3.1-flash-image-preview`，可配置），可经由可选的正向代理或反向代理网关访问
- **图片处理**：Sharp（WebP 转换；保留生成图片的比例 / 分辨率）
- **云存储**：七牛云或阿里云 OSS（通过 `UPLOAD_PROVIDER` 配置）

## 许可证

MIT
