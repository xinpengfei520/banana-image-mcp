# banana-image-mcp

[![npm version](https://img.shields.io/npm/v/banana-image-mcp.svg)](https://www.npmjs.com/package/banana-image-mcp)
[![npm downloads](https://img.shields.io/npm/dm/banana-image-mcp.svg)](https://www.npmjs.com/package/banana-image-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/banana-image-mcp.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

[English](./README.md)

一个基于 MCP (Model Context Protocol) 的图片生成、处理与 CDN 上传服务，集成 Google Gemini AI、Sharp 和七牛云存储。

## 功能特性

- 使用 Google Gemini AI 生成高质量图片
- 支持上传本地图片或网络图片到七牛云 CDN
- 自动转换为 WebP 格式并压缩
- 文件名自动添加日期前缀，支持自定义上传路径
- 自动清理临时文件

## 快速开始

### 使用 npx（推荐）

无需安装，直接在 MCP 客户端中配置：

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

### 全局安装

```bash
npm install -g banana-image-mcp
```

然后在 MCP 客户端中配置：

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

### 升级

```bash
# npx 用户：清除缓存即可获取最新版本
npx clear-npx-cache && npx -y banana-image-mcp

# 全局安装用户
npm update -g banana-image-mcp
```

### 配置文件位置

- **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows)**: `%APPDATA%\Claude\claude_desktop_config.json`

## 环境变量

| 变量 | 说明 |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API 密钥，用于图片生成 |
| `QINIU_ACCESS_KEY` | 七牛云 AccessKey |
| `QINIU_SECRET_KEY` | 七牛云 SecretKey |
| `QINIU_BUCKET` | 七牛云存储空间名称 |
| `QINIU_CDN_DOMAIN` | CDN 域名，用于生成图片访问链接 |

### 获取 API Keys

**Google Gemini API Key**：
1. 访问 [Google AI Studio](https://aistudio.google.com/apikey)
2. 创建或获取 API Key

**七牛云配置**：
1. 注册 [七牛云账号](https://portal.qiniu.com/)
2. 创建存储空间（Bucket）
3. 在个人中心获取 AccessKey 和 SecretKey
4. 配置 CDN 域名

## 工具

### `generate_blog_cover`

生成博客封面图片（1792x1024），转换为 WebP 格式，并上传到七牛云 CDN。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `prompt` | string | 是 | 描述要生成的图片的文本提示词 |
| `slug` | string | 是 | 文件名标识符（自动添加日期前缀） |
| `path` | string | 否 | 上传目录路径（默认：`blog-cover`） |

**返回值：**

```json
{
  "url": "https://your-cdn-domain.com/blog-cover/20260321-my-post.webp"
}
```

### `generate_image`

使用 Gemini AI 生成图片（保持原始尺寸），转换为 WebP 格式，并上传到七牛云 CDN。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `prompt` | string | 是 | 描述要生成的图片的文本提示词 |
| `slug` | string | 是 | 文件名标识符（自动添加日期前缀） |
| `path` | string | 否 | 上传目录路径（默认：`aigc/image`） |

**返回值：**

```json
{
  "url": "https://your-cdn-domain.com/aigc/image/20260321-my-image.webp"
}
```

### `upload_image`

上传本地图片或网络图片到七牛云 CDN，自动转换为 WebP 格式。

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
提示词 → Google Gemini API (PNG) → Sharp (WebP) → 七牛云 CDN → URL
图片源 (本地/网络) ──────────→ Sharp (WebP) → 七牛云 CDN → URL
```

- **图片生成**：Google Gemini 3.1 Flash Image Preview
- **图片处理**：Sharp（WebP 转换，可选缩放）
- **云存储**：七牛云 CDN

## 许可证

MIT
