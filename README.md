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
- **Proxy & gateway support** — reach Google Gemini from restricted networks (e.g. mainland China) via a forward proxy (`PROXY_URL`) or a self-hosted reverse-proxy gateway (`GEMINI_BASE_URL`)
- **Configurable model** — default `gemini-3.1-flash-image-preview`, or switch to `gemini-3.1-flash-lite-image`
- **Configurable aspect ratio & resolution** — e.g. `16:9` / `1:1` / `9:16` and `1K` / `2K` / `4K`
- **Preset cover styles** — a style prompt is appended only when `style` is passed. Omitting it keeps the original prompt-only generation. For example `dark-chalkboard` or `pornhub` (orange wordmark)
- **Interactive setup wizard** — run `banana-image-mcp setup` to write your config automatically, no hand-editing JSON
- Upload local or remote images to CDN (Qiniu Cloud or Aliyun OSS)
- Automatic conversion to WebP format with compression
- Date-prefixed filenames with customizable upload paths
- Temporary files are cleaned up automatically
- Switch upload provider via environment variable

## Quick Start

### Interactive setup (`setup`) — recommended

After installing (or on first use), run the `setup` wizard to configure everything — no
hand-editing JSON:

```bash
npx -y banana-image-mcp setup
# or, if installed globally:
banana-image-mcp setup
```

It first asks your preferred **language** (中文 / English), then walks you through:

1. **Which client(s)** to write to (multi-select): **Claude Code**, **Claude Desktop**, **Cursor**, **Codex**, or a custom JSON path;
2. **Run command**: `npx` (recommended) or the global `banana-image-mcp`;
3. **`GEMINI_API_KEY`** and **proxy / gateway** (`PROXY_URL` or `GEMINI_BASE_URL`, see [Network](#network--two-ways-to-reach-gemini));
4. **Image model, aspect ratio, resolution**;
5. **Upload provider** (Qiniu / Aliyun OSS) and its keys.

> Made a typo? Type **`b`** (or `back`) at any prompt to go back to the previous step.
> A review screen at the end lets you check everything (secrets masked) before writing.

It then **merges** the `banana-image` entry into each selected config file (**backing up**
the original first), without touching your other MCP servers (Codex's `config.toml` is
edited in place, preserving its other sections and comments). **Restart the client(s)**
afterwards to apply.

### Manual configuration

Prefer editing config yourself? Add the `banana-image` server to your MCP client's config file.

#### Using npx (recommended)

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

#### Global installation

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

#### With a proxy (e.g. mainland China)

Google Gemini is often not directly reachable from mainland China. Pick **one** of the two
approaches and add its variables to the `env` block. See
[Network — two ways to reach Gemini](#network--two-ways-to-reach-gemini) for the full explanation.

**A. Forward proxy** — a local client (Clash / V2Ray / Shadowsocks) or a paid HTTP proxy.
Add `PROXY_URL`:

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

- **Clash / Clash Verge / ClashX**: use the mixed/HTTP port shown under *Settings → Port* (default `7890`) → `http://127.0.0.1:7890`. Alternatively, enable **TUN mode** to route all traffic transparently — then you don't need `PROXY_URL` at all.
- Proxy that needs a login: `http://username:password@host:port` (URL-encode special characters in the password, e.g. `+` → `%2B`).
- ⚠️ Just toggling your client's *system proxy* (even in "Global"/rule mode) is **not** enough — Node's `fetch` ignores OS proxy settings. Use `PROXY_URL`, or a transparent **TUN mode**.

**B. Reverse-proxy gateway** — a self-hosted endpoint (e.g. a Cloudflare Worker) that
forwards to the Gemini API. Set `GEMINI_BASE_URL` (and any header it requires) **instead of**
`PROXY_URL`. Because `GEMINI_EXTRA_HEADERS` is a JSON string inside JSON, the inner quotes
are escaped with `\"`:

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

#### Codex (CLI & Desktop)

Codex CLI and the Codex desktop app (`Codex.app`) share the **same** config file —
`~/.codex/config.toml` (TOML, not JSON) — so configuring it once covers both. The easiest
way is the wizard (`banana-image-mcp setup` → select **Codex**), which merges the entry and
backs up the file. To do it by hand, add:

```toml
[mcp_servers.banana-image]
command = "/absolute/path/to/npx"
args = ["-y", "banana-image-mcp"]

[mcp_servers.banana-image.env]
GEMINI_API_KEY = "your-gemini-api-key"
# add PROXY_URL or GEMINI_BASE_URL here if you need a proxy/gateway (see Network below)
UPLOAD_PROVIDER = "qiniu"
QINIU_ACCESS_KEY = "your-qiniu-access-key"
QINIU_SECRET_KEY = "your-qiniu-secret-key"
QINIU_BUCKET = "your-bucket-name"
QINIU_CDN_DOMAIN = "https://your-cdn-domain.com"
```

> ⚠️ **Use an absolute path for `command`** (the output of `which npx`), not bare `npx`.
> The Codex **desktop app** does not inherit your shell `PATH`, so `"npx"` alone usually
> fails to launch there. Also point it at a `node`/`npx` version `sharp` supports (Node
> 18 / 20 / 22 — avoid brand-new majors like 26 that have no prebuilt binaries yet). For
> example, an nvm path looks like `~/.nvm/versions/node/v22.16.0/bin/npx`.

Restart Codex (start a new CLI session, or quit & reopen the desktop app) to load the server.

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
| `banana-image-mcp styles` | List preset styles; `styles --style <id>` prints that style's fixed prompt |
| `banana-image-mcp --version` | Print the version |
| `banana-image-mcp` | Run the MCP server over stdio (used by MCP clients) |

### `history` — generation log

Every `generate_image` / `generate_blog_cover` / `upload_image` call is logged to
`~/.banana-image-mcp/history.jsonl`. View it as a table (latest first):

```bash
npx -y banana-image-mcp history
```

It shows date/time, result (success/failure), tool type, model, **style**, image size,
generation time, and the image URL (or failure reason). The latest 10 entries are shown; in an
interactive terminal use **↑/↓** (or `j`/`k`) to page through older entries and `q` to quit.

```
   #  时间                 结果    类型  模型                     大小       耗时     链接 / 失败原因
 ───────────────────────────────────────────────────────────────────────────────────────────────────
   1  2026-07-09 22:15:03  ✓ 成功  封面  3.1-flash-image-preview  186.4 KB   3.4s     https://cdn.example.com/…
   2  2026-07-09 21:58:11  ✗ 失败  生图  3.1-flash-lite-image     —          0.9s     fetch failed (proxy?)
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
> `style` has no environment default. Omit it and the prompt is sent unchanged.

### Network — two ways to reach Gemini

Useful when Google Gemini is not directly reachable (e.g. mainland China). There are two
**independent** mechanisms — pick whichever matches your proxy.

**1. Forward proxy** (`PROXY_URL`) — tunnels raw traffic to Google. Use this for a local
client like Clash / V2Ray / Shadowsocks, or a paid HTTP proxy service.

| Variable | Description |
|---|---|
| `PROXY_URL` | HTTP/HTTPS forward proxy, e.g. `http://127.0.0.1:7890` or `http://user:pass@host:port` |

- Usually the local proxy port of your client (Clash's default mixed port is `7890` → `http://127.0.0.1:7890`).
- Basic-auth proxies are supported via `http://user:pass@host:port` (URL-encode special characters in the password, e.g. `+` → `%2B`).
- Only HTTP/HTTPS proxies are supported (not SOCKS5).
- If `PROXY_URL` is unset, the standard `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY` env vars are honored too.
- Applied to both Gemini API calls and remote image downloads.

> ⚠️ Node's built-in `fetch` does **not** honor your OS "system proxy" setting. Enabling
> your client's *system-proxy* toggle alone (even in "global"/rule mode) won't route this
> server. Either set `PROXY_URL`, or use a transparent **TUN / virtual-NIC mode** — that
> captures all traffic at the network layer, so no `PROXY_URL` is needed.

**2. Reverse-proxy gateway** (`GEMINI_BASE_URL` [+ `GEMINI_EXTRA_HEADERS`]) — point the SDK
at a self-hosted endpoint that forwards to the Gemini API (e.g. a Cloudflare Worker). In
this case do **not** set `PROXY_URL`.

| Variable | Description |
|---|---|
| `GEMINI_BASE_URL` | Base URL of your gateway, e.g. `https://gemini.example.com` |
| `GEMINI_EXTRA_HEADERS` | Optional custom headers the gateway requires. JSON, e.g. `{"x-cf-proxy-key":"..."}` — a `Name: value; Name2: value2` string also works |

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

## Preset styles

`style` on `generate_image` and `generate_blog_cover` is optional. Omit it, pass an empty string, or pass `none`, and the call uses the original path: only `prompt` is sent. A known style id appends that style's fixed prompt after the content prompt.

Put the subject, exact title, and steps in `prompt`. The style only locks medium, palette, lettering, and layout. Pass the same id on every cover when a channel should stay visually consistent.

```bash
npx -y banana-image-mcp styles
npx -y banana-image-mcp styles --style dark-chalkboard
```

| id | Look | Good for |
|---|---|---|
| `dark-chalkboard` | Dark slate, white chalk infographic, pastel yellow / green / pink | Tutorials, flowcharts, checklists |
| `pornhub` | Black field, white italic type, one word in an orange `#FF9900` badge | High-recognition title covers |
| `xiaohongshu` | Cream paper, huge rounded title, pink stickers | Lifestyle note covers |
| `big-type` | Flat color, title filling the frame | Feeds where the title must be readable at a glance |
| `wechat-editorial` | Quiet magazine header | Essays and columns |
| `premium-dark` | Near-black, warm serif, thin gold line | Courses |
| `bold-thumbnail` | Two saturated color blocks, outlined title | Video thumbnails |
| `liquid-glass` | Frosted glass panels on a light gray field | Product and tool covers |
| `clay-3d` | Soft clay, pastel studio light | Explainers |
| `ink-wash` | Rice paper, black ink, large empty space | Essays |
| `paper-cut` | Layered colored paper | Lifestyle and seasonal series |
| `brutalist` | Black, white, one primary, huge grotesk type | Design and opinion |

`pornhub` is the black-and-orange wordmark layout only. It does not ask for photographs. Aliases `orange-wordmark` and `橙标` select the same style. `dark-chalkboard` keeps the slate texture, white chalk title, and pastel chalk marks; the specific title and diagram stay in `prompt`.

The `list_image_styles` tool returns the same catalog. Pass `id` to include the full style prompt.

```json
{
  "prompt": "Title \"AI PROMPT GUIDE\". A 3-step flowchart: INPUT with a keyboard, PROCESS with a robot, RESULT with a lightbulb.",
  "slug": "ai-prompt-guide",
  "style": "dark-chalkboard"
}
```

### Examples

Every image below uses the same content prompt. They were generated by this server with `gemini-3.1-flash-image-preview` at `16:9` and `1K`. The first one omits `style`. Each of the others changes only the style id.

> The main title at the top says "AI PROMPT GUIDE" in large letters. The image shows a 3-step flowchart with arrows: Step 1 labeled "INPUT" with a keyboard icon, Step 2 labeled "PROCESS" with a cute robot head icon, and Step 3 labeled "RESULT" with a glowing lightbulb icon.

<table>
  <tr>
    <td align="center"><img src="docs/style-examples/none.webp" alt="no style" width="420"><br>no <code>style</code></td>
    <td align="center"><img src="docs/style-examples/dark-chalkboard.webp" alt="dark-chalkboard" width="420"><br><code>dark-chalkboard</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/style-examples/pornhub.webp" alt="pornhub" width="420"><br><code>pornhub</code></td>
    <td align="center"><img src="docs/style-examples/xiaohongshu.webp" alt="xiaohongshu" width="420"><br><code>xiaohongshu</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/style-examples/big-type.webp" alt="big-type" width="420"><br><code>big-type</code></td>
    <td align="center"><img src="docs/style-examples/wechat-editorial.webp" alt="wechat-editorial" width="420"><br><code>wechat-editorial</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/style-examples/premium-dark.webp" alt="premium-dark" width="420"><br><code>premium-dark</code></td>
    <td align="center"><img src="docs/style-examples/bold-thumbnail.webp" alt="bold-thumbnail" width="420"><br><code>bold-thumbnail</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/style-examples/liquid-glass.webp" alt="liquid-glass" width="420"><br><code>liquid-glass</code></td>
    <td align="center"><img src="docs/style-examples/clay-3d.webp" alt="clay-3d" width="420"><br><code>clay-3d</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/style-examples/ink-wash.webp" alt="ink-wash" width="420"><br><code>ink-wash</code></td>
    <td align="center"><img src="docs/style-examples/paper-cut.webp" alt="paper-cut" width="420"><br><code>paper-cut</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/style-examples/brutalist.webp" alt="brutalist" width="420"><br><code>brutalist</code></td>
    <td></td>
  </tr>
</table>

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
| `style` | string | No | Preset style id, e.g. `dark-chalkboard` or `pornhub`. Omit it, or pass `none`, to skip the preset |

**Returns:**

```json
{
  "url": "https://your-cdn-domain.com/blog-cover/20260321-my-post.webp",
  "style": "dark-chalkboard"
}
```

`style` is present only when a preset was applied.

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
| `style` | string | No | Preset style id, e.g. `dark-chalkboard` or `pornhub`. Omit it, or pass `none`, to skip the preset |

**Returns:**

```json
{
  "url": "https://your-cdn-domain.com/aigc/image/20260321-my-image.webp",
  "style": "pornhub"
}
```

### `list_image_styles`

List preset styles. Pass `id` (or an alias) to include that style's fixed prompt.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | No | Style id or alias. Omit it to list every style's name and summary |

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
prompt + optional style prompt → Google Gemini API (PNG) → Sharp (WebP) → CDN (Qiniu / Aliyun OSS) → URL
source (local/remote) ─────────→ Sharp (WebP) → CDN (Qiniu / Aliyun OSS) → URL
```

- **Image generation**: Google Gemini (`gemini-3.1-flash-image-preview` by default, configurable), reachable via optional forward proxy or reverse-proxy gateway
- **Image processing**: Sharp (WebP conversion; generated aspect ratio / resolution are preserved)
- **Cloud storage**: Qiniu Cloud or Aliyun OSS (configurable via `UPLOAD_PROVIDER`)

## License

MIT
