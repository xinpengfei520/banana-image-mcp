# banana-image-mcp

[![npm version](https://img.shields.io/npm/v/banana-image-mcp.svg)](https://www.npmjs.com/package/banana-image-mcp)
[![npm downloads](https://img.shields.io/npm/dm/banana-image-mcp.svg)](https://www.npmjs.com/package/banana-image-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/banana-image-mcp.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

[中文文档](./README_CN.md)

An MCP (Model Context Protocol) server for image generation, processing, and CDN upload. Powered by Google Gemini AI, Sharp, with Qiniu Cloud and Aliyun OSS support.

## Features

- Generate images from text prompts using Google Gemini AI
- **Proxy support** — access Google Gemini from restricted networks (e.g. mainland China) via an HTTP/HTTPS proxy
- **Configurable model** — default `gemini-3.1-flash-image-preview`, or switch to `gemini-3.1-flash-lite-image`
- **Configurable aspect ratio & resolution** — e.g. `16:9` / `1:1` / `9:16` and `1K` / `2K` / `4K`
- **Interactive setup wizard** — run `banana-image-mcp setup` to write your config automatically, no hand-editing JSON
- Upload local or remote images to CDN (Qiniu Cloud or Aliyun OSS)
- Automatic conversion to WebP format with compression
- Date-prefixed filenames with customizable upload paths
- Temporary files are cleaned up automatically
- Switch upload provider via environment variable

## Quick Start

### Interactive setup (`setup`) — recommended

Skip hand-editing JSON. The wizard asks for your keys, proxy, model, aspect ratio,
resolution and upload provider, then writes the config to the right file(s) (with a backup):

```bash
npx -y banana-image-mcp setup
# or, if installed globally:
banana-image-mcp setup
```

It lets you pick **one or more** target clients — **Claude Code**, **Claude Desktop**,
**Cursor**, **Codex**, or a custom JSON path — and merges the `banana-image` entry
without touching your other MCP servers (Codex's `config.toml` is edited in place,
preserving its other sections and comments). Restart the client(s) afterwards to apply.

### Manual configuration

### Using npx (recommended)

No installation needed — configure directly in your MCP client:

**Qiniu Cloud (default):**

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

**Aliyun OSS:**

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

### Global installation

```bash
npm install -g banana-image-mcp
```

Then configure in your MCP client:

**Qiniu Cloud (default):**

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

**Aliyun OSS:**

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

### Upgrade

```bash
# npx users: just clear the cache to get the latest version
npx clear-npx-cache && npx -y banana-image-mcp

# Global installation users
npm update -g banana-image-mcp
```

### Configuration file location

The `banana-image` entry lives under the `mcpServers` object of your client's config file:

| Client | OS | Path |
|---|---|---|
| **Claude Code** | macOS | `~/.claude.json` |
| **Claude Code** | Windows | `%USERPROFILE%\.claude.json` |
| **Claude Desktop** | macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Claude Desktop** | Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Cursor** | macOS / Windows | `~/.cursor/mcp.json` |
| **Codex** | macOS / Windows | `~/.codex/config.toml` (TOML: `[mcp_servers.banana-image]`) |

> Tip: run `banana-image-mcp setup` to have the file(s) created/updated for you — it targets any of the clients above (or a custom path) and backs up the existing file first.

For Claude Code you can also add the server from the CLI:

```bash
claude mcp add banana-image -- npx -y banana-image-mcp
```

## CLI Commands

| Command | Description |
|---|---|
| `banana-image-mcp setup` | Interactive config wizard |
| `banana-image-mcp history` | View generation history / log |
| `banana-image-mcp --version` | Print the version |
| `banana-image-mcp` | Run the MCP server over stdio (used by MCP clients) |

### `history` — generation log

Every `generate_image` / `generate_blog_cover` / `upload_image` call is logged to
`~/.banana-image-mcp/history.jsonl`. View it as a table (latest first):

```bash
npx -y banana-image-mcp history
```

It shows date/time, result (success/failure), image size, generation time, and the image
URL (or failure reason). The latest 10 entries are shown; in an interactive terminal use
**↑/↓** (or `j`/`k`) to page through older entries and `q` to quit.

```
   #  时间                 结果    类型  大小       耗时     链接 / 失败原因
 ─────────────────────────────────────────────────────────────────────────────────────
   1  2026-07-09 22:15:03  ✓ 成功  封面  186.4 KB   3.4s     https://cdn.example.com/blog-cover/2026…
   2  2026-07-09 21:58:11  ✗ 失败  生图  —          0.9s     fetch failed (proxy?)
```

## Environment Variables

### Upload Provider

| Variable | Description |
|---|---|
| `UPLOAD_PROVIDER` | Upload provider: `qiniu` (default) or `aliyun` |

### Image Generation

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | — | Google Gemini API key for image generation (required) |
| `GEMINI_IMAGE_MODEL` | `gemini-3.1-flash-image-preview` | Image model. Also supports `gemini-3.1-flash-lite-image` |
| `GEMINI_ASPECT_RATIO` | `16:9` | Aspect ratio, e.g. `16:9`, `1:1`, `9:16`, `4:3`, `3:2`, `21:9` |
| `GEMINI_IMAGE_SIZE` | `1K` | Resolution: `1K`, `2K` or `4K` |
| `WEBP_QUALITY` | `80` | WebP compression quality (1–100) |

> These are defaults; `generate_blog_cover` and `generate_image` also accept per-call
> `model` / `aspectRatio` / `imageSize` parameters that override the environment values.

### Network / Proxy

Useful when Google Gemini is not directly reachable (e.g. mainland China).

| Variable | Description |
|---|---|
| `PROXY_URL` | HTTP/HTTPS forward proxy for reaching Gemini, e.g. `http://127.0.0.1:7890` |

`PROXY_URL` is the address of an HTTP/HTTPS **forward proxy that the machine running this
MCP server can reach and that can itself reach Google**. In practice this is usually the
local proxy exposed by a client like Clash / V2Ray / Shadowsocks (Clash's default mixed
port is `7890`, so `http://127.0.0.1:7890`). It can equally be a remote gateway proxy that
has access to Google — anything that speaks the standard HTTP CONNECT proxy protocol works.

`PROXY_URL` takes precedence; if it is not set, the standard `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY` environment variables are honored as well. The proxy is applied to both Gemini API calls and remote image downloads.

### Qiniu Cloud (when `UPLOAD_PROVIDER=qiniu` or not set)

| Variable | Description |
|---|---|
| `QINIU_ACCESS_KEY` | Qiniu cloud access key |
| `QINIU_SECRET_KEY` | Qiniu cloud secret key |
| `QINIU_BUCKET` | Qiniu storage bucket name |
| `QINIU_CDN_DOMAIN` | CDN domain for generated image URLs |

### Aliyun OSS (when `UPLOAD_PROVIDER=aliyun`)

| Variable | Required | Description |
|---|---|---|
| `ALIYUN_OSS_ACCESS_KEY_ID` | Yes | Aliyun AccessKey ID |
| `ALIYUN_OSS_ACCESS_KEY_SECRET` | Yes | Aliyun AccessKey Secret |
| `ALIYUN_OSS_BUCKET` | Yes | OSS bucket name |
| `ALIYUN_OSS_REGION` | Yes | OSS region, e.g. `oss-cn-hangzhou` |
| `ALIYUN_OSS_CDN_DOMAIN` | No | Custom CDN domain (falls back to default OSS URL if not set) |

### Getting API Keys

**Google Gemini API Key**:
1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create or get an API key

**Qiniu Cloud**:
1. Register at [Qiniu Cloud](https://portal.qiniu.com/)
2. Create a storage bucket
3. Get AccessKey and SecretKey from your account settings
4. Configure a CDN domain

**Aliyun OSS**:
1. Register at [Aliyun](https://www.aliyun.com/)
2. Create an OSS bucket
3. Get AccessKey ID and AccessKey Secret from your account settings
4. Note your bucket's region (e.g. `oss-cn-hangzhou`)

## Tools

### `generate_blog_cover`

Generate a blog cover image, convert to WebP, and upload to CDN. The image dimensions
follow the configured aspect ratio / resolution (default `16:9` at `1K`).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | Yes | Text prompt describing the image to generate |
| `slug` | string | Yes | Slug identifier for the filename (prefixed with date) |
| `path` | string | No | Upload directory path (default: `blog-cover`) |
| `model` | string | No | Model override (default: `GEMINI_IMAGE_MODEL` or `gemini-3.1-flash-image-preview`) |
| `aspectRatio` | string | No | Aspect ratio override (default: `GEMINI_ASPECT_RATIO` or `16:9`) |
| `imageSize` | string | No | Resolution override `1K`/`2K`/`4K` (default: `GEMINI_IMAGE_SIZE` or `1K`) |

**Returns:**

```json
{
  "url": "https://your-cdn-domain.com/blog-cover/20260321-my-post.webp"
}
```

### `generate_image`

Generate an image using Gemini AI, convert to WebP, and upload to CDN.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | Yes | Text prompt describing the image to generate |
| `slug` | string | Yes | Slug identifier for the filename (prefixed with date) |
| `path` | string | No | Upload directory path (default: `aigc/image`) |
| `model` | string | No | Model override (default: `GEMINI_IMAGE_MODEL` or `gemini-3.1-flash-image-preview`) |
| `aspectRatio` | string | No | Aspect ratio override (default: `GEMINI_ASPECT_RATIO` or `16:9`) |
| `imageSize` | string | No | Resolution override `1K`/`2K`/`4K` (default: `GEMINI_IMAGE_SIZE` or `1K`) |

**Returns:**

```json
{
  "url": "https://your-cdn-domain.com/aigc/image/20260321-my-image.webp"
}
```

### `upload_image`

Upload a local file or remote URL image to CDN, with automatic WebP conversion.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `source` | string | Yes | Local file path or HTTP/HTTPS URL of the image |
| `slug` | string | Yes | Slug identifier for the filename (prefixed with date) |
| `path` | string | No | Upload directory path (default: `images`) |

**Returns:**

```json
{
  "url": "https://your-cdn-domain.com/images/20260321-my-photo.webp"
}
```

## Architecture

```
prompt → Google Gemini API (PNG) → Sharp (WebP) → CDN (Qiniu / Aliyun OSS) → URL
source (local/remote) ─────────→ Sharp (WebP) → CDN (Qiniu / Aliyun OSS) → URL
```

- **Image generation**: Google Gemini (`gemini-3.1-flash-image-preview` by default, configurable), with optional proxy
- **Image processing**: Sharp (WebP conversion; generated aspect ratio / resolution are preserved)
- **Cloud storage**: Qiniu Cloud or Aliyun OSS (configurable via `UPLOAD_PROVIDER`)

## License

MIT
