# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides a tool for generating blog cover images. It integrates three services:
1. **Banana API** - AI image generation from text prompts
2. **Sharp** - Image processing (resize, WebP conversion, compression)
3. **Qiniu Cloud** - CDN storage for generated images

The main export is `generate_blog_cover()` which orchestrates the full pipeline: generate → compress → upload → cleanup.

## Architecture

**Single-file MCP server** (`index.js`):
- Exports one MCP tool function: `generate_blog_cover({ prompt, slug })`
- Uses ES modules (import/export syntax)
- Temporary files stored in `./tmp/` directory (auto-created)
- File naming: `YYYYMMDD-{slug}.webp`

**Data flow**:
```
prompt → Banana API (PNG) → Sharp (WebP) → Qiniu CDN → URL
                ↓              ↓
              tmp/           tmp/
           (cleaned up after upload)
```

## Environment Variables

Required in `.env`:
- `BANANA_API_KEY` - Banana API authentication
- `QINIU_UPLOAD_TOKEN` - Qiniu upload token
- `QINIU_UPLOAD_URL` - Qiniu upload endpoint
- `QINIU_CDN_DOMAIN` - CDN domain for returned URLs

## Development Commands

**Install dependencies**:
```bash
npm install
```

**Run as MCP server**:
This module is designed to be loaded by an MCP host (like Claude Desktop). It's not meant to be run directly as a standalone script.

**Test the tool function** (if needed):
```javascript
import { generate_blog_cover } from './index.js';
const result = await generate_blog_cover({
  prompt: "test prompt",
  slug: "test-slug"
});
console.log(result.url);
```

## Key Implementation Details

- **Image specs**: 1792x1024 pixels, WebP format, 80% quality
- **Upload path**: Images stored at `blog-cover/{YYYYMMDD-slug}.webp` on Qiniu
- **Cleanup**: Both raw PNG and compressed WebP are deleted after successful upload
- **Error handling**: Currently relies on axios/sharp throwing errors; no explicit try-catch

## Banana API Note

The current endpoint `https://api.banana.dev/generate` in the code is marked with a warning comment to replace with the real API. Verify the actual Banana API endpoint and request format when working with this code.
