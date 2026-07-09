# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides a tool for generating blog cover images. It integrates these services:
1. **Google Gemini AI** - Image generation from text prompts
2. **Sharp** - Image processing (resize, WebP conversion, compression)
3. **Qiniu Cloud** or **Aliyun OSS** - CDN storage for generated images (configurable via `UPLOAD_PROVIDER`)

The main export is `generate_blog_cover()` which orchestrates the full pipeline: generate → compress → upload → cleanup.

## Architecture

**MCP server** (`index.js`):
- Exposes three MCP tools: `generate_blog_cover`, `generate_image`, `upload_image`
- Uses ES modules (import/export syntax)
- Temporary files stored in system temp directory (`os.tmpdir()/banana-image-mcp/`)
- File naming: `YYYYMMDD-{slug}.webp`
- Two optional ways to reach Gemini: a forward proxy (undici `setGlobalDispatcher` for the SDK's global `fetch`; `https-proxy-agent` for axios downloads) via `PROXY_URL`, or a reverse-proxy gateway via `GEMINI_BASE_URL` + `GEMINI_EXTRA_HEADERS` (SDK `httpOptions.baseUrl`/`headers`)

**Config wizard** (`cli-setup.js`):
- Loaded lazily when the binary is invoked as `banana-image-mcp setup`
- Interactive readline prompts; multi-select one or more targets (Claude Code / Claude Desktop / Cursor / Codex / custom JSON path), writes/merges the `banana-image` entry into each, backing up existing files first
- JSON clients use `mcpServers`; Codex uses `~/.codex/config.toml` (`[mcp_servers.banana-image]`), edited via surgical block replace (preserves other sections/comments) with `smol-toml` for validation/detection

**History** (`history-store.js` + `cli-history.js`):
- Every tool call is appended to `~/.banana-image-mcp/history.jsonl` (time, tool, status, size, duration, url, error, model/aspectRatio/imageSize) via `runWithHistory()` in `index.js` — logging failures never break the tool
- `banana-image-mcp history` renders a paginated, colorized table (columns: #, time, result, tool type, model, size, duration, url/error; latest first; ↑/↓ paging in a TTY)

**Data flow**:
```
prompt → Gemini API (PNG) → Sharp (WebP) → CDN (Qiniu / Aliyun OSS) → URL
          (via proxy)          ↓              ↓
                            tmpdir/        tmpdir/
                          (cleaned up after upload)
```

## Environment Variables

Required (set via MCP client config or `.env`):
- `GEMINI_API_KEY` - Google Gemini API key
- `UPLOAD_PROVIDER` - Upload provider: `qiniu` (default) or `aliyun`

Image generation (optional, with defaults):
- `GEMINI_IMAGE_MODEL` - image model (default `gemini-3.1-flash-image-preview`; also `gemini-3.1-flash-lite-image`)
- `GEMINI_ASPECT_RATIO` - aspect ratio (default `16:9`; e.g. `1:1`, `9:16`, `4:3`, `3:2`, `21:9`)
- `GEMINI_IMAGE_SIZE` - resolution (default `1K`; also `2K`, `4K`)
- `WEBP_QUALITY` - WebP quality 1–100 (default `80`)
- `generate_blog_cover` / `generate_image` also accept per-call `model` / `aspectRatio` / `imageSize` args that override the env defaults

Network — two independent ways to reach Gemini (optional):
- `PROXY_URL` - HTTP/HTTPS **forward proxy** (falls back to `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`); supports `http://user:pass@host:port` auth; HTTP-only (no SOCKS). Node's fetch ignores OS system-proxy settings, so a forward proxy or transparent TUN is required.
- `GEMINI_BASE_URL` (+ `GEMINI_EXTRA_HEADERS`) - **reverse-proxy gateway**: overrides the SDK `httpOptions.baseUrl` and adds custom headers (JSON or `Name: value; ...`). Used for self-hosted Gemini gateways (e.g. Cloudflare Worker needing `x-cf-proxy-key`). Do not combine with `PROXY_URL`.

Qiniu Cloud (when `UPLOAD_PROVIDER=qiniu` or not set):
- `QINIU_ACCESS_KEY` - Qiniu access key
- `QINIU_SECRET_KEY` - Qiniu secret key
- `QINIU_BUCKET` - Qiniu storage bucket name
- `QINIU_CDN_DOMAIN` - CDN domain for returned URLs

Aliyun OSS (when `UPLOAD_PROVIDER=aliyun`):
- `ALIYUN_OSS_ACCESS_KEY_ID` - Aliyun AccessKey ID
- `ALIYUN_OSS_ACCESS_KEY_SECRET` - Aliyun AccessKey Secret
- `ALIYUN_OSS_BUCKET` - OSS bucket name
- `ALIYUN_OSS_REGION` - OSS region, e.g. `oss-cn-hangzhou`
- `ALIYUN_OSS_CDN_DOMAIN` - (optional) Custom CDN domain, falls back to default OSS URL

## Development Commands

**Install dependencies**:
```bash
npm install
```

**Run as MCP server**:
This module is designed to be loaded by an MCP host (like Claude Desktop). It's not meant to be run directly as a standalone script.

## Key Implementation Details

- **Image specs**: dimensions follow the configured aspect ratio / resolution (default `16:9` at `1K`); output is WebP at `WEBP_QUALITY` (default 80). The blog-cover pipeline no longer force-resizes to a fixed 1792x1024 — the generated dimensions are preserved.
- **Upload path**: Images stored at `blog-cover/{YYYYMMDD-slug}.webp` on Qiniu (default; per-tool `path` overrides)
- **Cleanup**: Both raw PNG and compressed WebP are deleted after successful upload
- **Setup wizard**: `banana-image-mcp setup` writes/merges config into one or more client files with backups (see `cli-setup.js`)
- **History**: generation log at `~/.banana-image-mcp/history.jsonl`; view via `banana-image-mcp history`
- **Distribution**: Published to npm as `banana-image-mcp`, users can run via `npx -y banana-image-mcp`
