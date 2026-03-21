# banana-image-mcp

[![npm version](https://img.shields.io/npm/v/banana-image-mcp.svg)](https://www.npmjs.com/package/banana-image-mcp)
[![npm downloads](https://img.shields.io/npm/dm/banana-image-mcp.svg)](https://www.npmjs.com/package/banana-image-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/banana-image-mcp.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

[中文文档](./README_CN.md)

An MCP (Model Context Protocol) server for image generation, processing, and CDN upload. Powered by Google Gemini AI, Sharp, and Qiniu Cloud.

## Features

- Generate images from text prompts using Google Gemini AI
- Upload local or remote images to Qiniu CDN
- Automatic conversion to WebP format with compression
- Date-prefixed filenames with customizable upload paths
- Temporary files are cleaned up automatically

## Quick Start

### Using npx (recommended)

No installation needed — configure directly in your MCP client:

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

### Global installation

```bash
npm install -g banana-image-mcp
```

Then configure in your MCP client:

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

### Upgrade

```bash
# npx users: just clear the cache to get the latest version
npx clear-npx-cache && npx -y banana-image-mcp

# Global installation users
npm update -g banana-image-mcp
```

### Configuration file location

- **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows)**: `%APPDATA%\Claude\claude_desktop_config.json`

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for image generation |
| `QINIU_ACCESS_KEY` | Qiniu cloud access key |
| `QINIU_SECRET_KEY` | Qiniu cloud secret key |
| `QINIU_BUCKET` | Qiniu storage bucket name |
| `QINIU_CDN_DOMAIN` | CDN domain for generated image URLs |

### Getting API Keys

**Google Gemini API Key**:
1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create or get an API key

**Qiniu Cloud**:
1. Register at [Qiniu Cloud](https://portal.qiniu.com/)
2. Create a storage bucket
3. Get AccessKey and SecretKey from your account settings
4. Configure a CDN domain

## Tools

### `generate_blog_cover`

Generate a blog cover image (1792x1024), convert to WebP, and upload to Qiniu CDN.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | Yes | Text prompt describing the image to generate |
| `slug` | string | Yes | Slug identifier for the filename (prefixed with date) |
| `path` | string | No | Upload directory path (default: `blog-cover`) |

**Returns:**

```json
{
  "url": "https://your-cdn-domain.com/blog-cover/20260321-my-post.webp"
}
```

### `generate_image`

Generate an image using Gemini AI (original size), convert to WebP, and upload to Qiniu CDN.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | Yes | Text prompt describing the image to generate |
| `slug` | string | Yes | Slug identifier for the filename (prefixed with date) |
| `path` | string | No | Upload directory path (default: `aigc/image`) |

**Returns:**

```json
{
  "url": "https://your-cdn-domain.com/aigc/image/20260321-my-image.webp"
}
```

### `upload_image`

Upload a local file or remote URL image to Qiniu CDN, with automatic WebP conversion.

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
prompt → Google Gemini API (PNG) → Sharp (WebP) → Qiniu CDN → URL
source (local/remote) ─────────→ Sharp (WebP) → Qiniu CDN → URL
```

- **Image generation**: Google Gemini 3.1 Flash Image Preview
- **Image processing**: Sharp (WebP conversion, optional resize)
- **Cloud storage**: Qiniu CDN

## License

MIT
