# banana-image-mcp

[![npm version](https://img.shields.io/npm/v/banana-image-mcp.svg)](https://www.npmjs.com/package/banana-image-mcp)
[![npm downloads](https://img.shields.io/npm/dm/banana-image-mcp.svg)](https://www.npmjs.com/package/banana-image-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/banana-image-mcp.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

[中文文档](./README_CN.md)

An MCP (Model Context Protocol) server for generating blog cover images using Google Gemini AI, with automatic WebP conversion and Qiniu CDN upload.

## Features

- Generate images from text prompts using Google Gemini AI
- Automatic conversion to WebP format (1792x1024, 80% quality)
- Upload to Qiniu CDN with date-prefixed filenames
- Customizable upload directory
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

## Tool

### `generate_blog_cover`

Generate a blog cover image, convert to WebP, and upload to Qiniu CDN.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | Yes | Text prompt describing the image to generate |
| `slug` | string | Yes | Slug identifier for the filename (prefixed with date) |
| `path` | string | No | Upload directory path (default: `blog-cover`) |

**Returns:** JSON with the CDN URL of the uploaded image.

```json
{
  "url": "https://your-cdn-domain.com/blog-cover/20260318-my-post.webp"
}
```

## Architecture

```
prompt → Google Gemini API (PNG) → Sharp (WebP) → Qiniu CDN → URL
```

- **Image generation**: Google Gemini 3.1 Flash Image Preview
- **Image processing**: Sharp (resize to 1792x1024, WebP at 80% quality)
- **Cloud storage**: Qiniu CDN

## License

MIT
