# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides a tool for generating blog cover images. It integrates three services:
1. **Google Gemini AI** - Image generation from text prompts
2. **Sharp** - Image processing (resize, WebP conversion, compression)
3. **Qiniu Cloud** - CDN storage for generated images

The main export is `generate_blog_cover()` which orchestrates the full pipeline: generate → compress → upload → cleanup.

## Architecture

**Single-file MCP server** (`index.js`):
- Exports one MCP tool function: `generate_blog_cover({ prompt, slug, path })`
- Uses ES modules (import/export syntax)
- Temporary files stored in system temp directory (`os.tmpdir()/banana-image-mcp/`)
- File naming: `YYYYMMDD-{slug}.webp`

**Data flow**:
```
prompt → Gemini API (PNG) → Sharp (WebP) → Qiniu CDN → URL
                ↓              ↓
             tmpdir/        tmpdir/
           (cleaned up after upload)
```

## Environment Variables

Required (set via MCP client config or `.env`):
- `GEMINI_API_KEY` - Google Gemini API key
- `QINIU_ACCESS_KEY` - Qiniu access key
- `QINIU_SECRET_KEY` - Qiniu secret key
- `QINIU_BUCKET` - Qiniu storage bucket name
- `QINIU_CDN_DOMAIN` - CDN domain for returned URLs

## Development Commands

**Install dependencies**:
```bash
npm install
```

**Run as MCP server**:
This module is designed to be loaded by an MCP host (like Claude Desktop). It's not meant to be run directly as a standalone script.

## Key Implementation Details

- **Image specs**: 1792x1024 pixels, WebP format, 80% quality
- **Upload path**: Images stored at `blog-cover/{YYYYMMDD-slug}.webp` on Qiniu
- **Cleanup**: Both raw PNG and compressed WebP are deleted after successful upload
- **Distribution**: Published to npm as `banana-image-mcp`, users can run via `npx -y banana-image-mcp`
