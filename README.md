# Banana Image MCP

一个基于 MCP (Model Context Protocol) 的博客封面图片生成服务，集成 Google Gemini 图片生成 API 和七牛云存储。

## 功能特性

- 🎨 使用 Google Gemini AI 生成高质量图片
- 🗜️ 自动转换为 WebP 格式并压缩
- ☁️ 自动上传到七牛云 CDN
- 📁 支持自定义上传目录
- 🧹 自动清理临时文件

## 架构说明

```
用户输入 prompt
    ↓
Google Gemini API (生成图片)
    ↓
Sharp (转换为 WebP + 压缩)
    ↓
七牛云 (上传到 CDN)
    ↓
返回图片 URL
```

### 技术栈

- **图片生成**: Google Gemini 3.1 Flash Image Preview
- **图片处理**: Sharp (WebP 转换、压缩)
- **云存储**: 七牛云 (Qiniu)
- **运行环境**: Node.js (ES Modules)

## 环境配置

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件并填入以下配置：

```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key

# 七牛云配置
QINIU_ACCESS_KEY=your_access_key
QINIU_SECRET_KEY=your_secret_key
QINIU_BUCKET=your_bucket_name
QINIU_CDN_DOMAIN=https://your-cdn-domain.com
```

### 获取 API Keys

**Google Gemini API Key**:
1. 访问 [Google AI Studio](https://aistudio.google.com/apikey)
2. 创建或获取 API Key
3. 注意免费版有配额限制

**七牛云配置**:
1. 注册 [七牛云账号](https://portal.qiniu.com/)
2. 创建存储空间 (Bucket)
3. 在个人中心获取 AccessKey 和 SecretKey
4. 配置 CDN 域名

## 使用方法

### 作为 MCP 服务使用

在 MCP 客户端（如 Claude Desktop）中配置此服务：

```json
{
  "mcpServers": {
    "banana-image": {
      "command": "node",
      "args": ["/path/to/banana-image-mcp/index.js"]
    }
  }
}
```

### 调用示例

```javascript
import { generate_blog_cover } from './index.js';

const result = await generate_blog_cover({
  prompt: "A beautiful sunset over mountains with vibrant colors",
  slug: "my-blog-post",
  path: "blog-covers"  // 可选，默认为 "blog-cover"
});

console.log(result.url);
// 输出: https://your-cdn-domain.com/blog-covers/20260317-my-blog-post.webp
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prompt` | string | 是 | 图片生成提示词 |
| `slug` | string | 是 | 文件名标识（会自动添加日期前缀） |
| `path` | string | 否 | 上传目录路径（默认: `blog-cover`） |

### 返回值

```javascript
{
  url: "https://your-cdn-domain.com/path/YYYYMMDD-slug.webp"
}
```

## 测试

### 测试七牛上传

```bash
node test.js
```

### 测试完整流程

```bash
node test-full.js
```

## 图片规格

- **尺寸**: 1792 x 1024 像素 (16:9)
- **格式**: WebP
- **质量**: 80%
- **命名**: `YYYYMMDD-{slug}.webp`

## 注意事项

1. **API 配额**: Gemini 免费版有每日请求限制，建议监控使用量
2. **存储成本**: 七牛云存储和流量会产生费用，注意控制
3. **临时文件**: 服务会自动清理 `./tmp/` 目录下的临时文件
4. **区域配置**: 当前使用七牛华东区域 (Zone_z0)，如需修改请编辑 `index.js`

## 目录结构

```
banana-image-mcp/
├── index.js          # 主服务文件
├── test.js           # 七牛上传测试
├── test-full.js      # 完整流程测试
├── package.json      # 依赖配置
├── .env              # 环境变量（需自行创建）
├── tmp/              # 临时文件目录（自动创建）
└── README.md         # 项目文档
```

## License

ISC
