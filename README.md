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
- Upload local or remote images to CDN (Qiniu Cloud or Aliyun OSS)
- Automatic conversion to WebP format with compression
- Date-prefixed filenames with customizable upload paths
- Temporary files are cleaned up automatically
- Switch upload provider via environment variable

## Quick Start

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

- **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows)**: `%APPDATA%\Claude\claude_desktop_config.json`

## Environment Variables

### Upload Provider

| Variable | Description |
|---|---|
| `UPLOAD_PROVIDER` | Upload provider: `qiniu` (default) or `aliyun` |

### Image Generation

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for image generation |

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

Generate a blog cover image (1792x1024), convert to WebP, and upload to CDN.

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

Generate an image using Gemini AI (original size), convert to WebP, and upload to CDN.

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

- **Image generation**: Google Gemini 3.1 Flash Image Preview
- **Image processing**: Sharp (WebP conversion, optional resize)
- **Cloud storage**: Qiniu Cloud or Aliyun OSS (configurable via `UPLOAD_PROVIDER`)

## License

MIT
