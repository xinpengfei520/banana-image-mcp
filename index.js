import fs from "fs";
import path from "path";
import sharp from "sharp";
import qiniu from "qiniu";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// ====== 配置 ======
const TMP_DIR = "./tmp";
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR);
}

// ====== 工具函数 ======

function getFileName(slug) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${date}-${slug}`;
}

// ====== Step1: 调用 Google Gemini API 生图 ======

async function generateImage(prompt, outputPath) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const config = {
    imageConfig: {
      aspectRatio: "16:9",
      imageSize: "1K",
    },
    responseModalities: ["IMAGE"],
  };

  const model = "gemini-3.1-flash-image-preview";
  const contents = [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });

  for await (const chunk of response) {
    if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      const inlineData = chunk.candidates[0].content.parts[0].inlineData;
      const buffer = Buffer.from(inlineData.data || "", "base64");
      fs.writeFileSync(outputPath, buffer);
      return;
    }
  }

  throw new Error("No image generated");
}

// ====== Step2: 转 WebP + 压缩 ======

async function convertToWebp(input, output) {
  await sharp(input)
    .resize(1792, 1024)
    .webp({ quality: 80 })
    .toFile(output);
}

// ====== Step3: 上传七牛 ======

async function uploadToQiniu(filePath, fileName, uploadPath = "blog-cover") {
  const mac = new qiniu.auth.digest.Mac(
    process.env.QINIU_ACCESS_KEY,
    process.env.QINIU_SECRET_KEY
  );

  const options = {
    scope: process.env.QINIU_BUCKET,
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  const uploadToken = putPolicy.uploadToken(mac);

  const config = new qiniu.conf.Config();
  config.zone = qiniu.zone.Zone_z0; // 华东区域

  const formUploader = new qiniu.form_up.FormUploader(config);
  const putExtra = new qiniu.form_up.PutExtra();

  const key = `${uploadPath}/${fileName}.webp`;

  return new Promise((resolve, reject) => {
    formUploader.putFile(uploadToken, key, filePath, putExtra, (err, body, info) => {
      if (err) {
        reject(err);
      } else if (info.statusCode === 200) {
        resolve(`${process.env.QINIU_CDN_DOMAIN}/${key}`);
      } else {
        reject(new Error(`Upload failed: ${info.statusCode}`));
      }
    });
  });
}

// ====== MCP Tool 主函数 ======

export async function generate_blog_cover({ prompt, slug, path: uploadPath = "blog-cover" }) {
  const fileName = getFileName(slug);

  const rawPath = path.join(TMP_DIR, `${fileName}.png`);
  const webpPath = path.join(TMP_DIR, `${fileName}.webp`);

  // 1. 生图
  await generateImage(prompt, rawPath);

  // 2. 压缩
  await convertToWebp(rawPath, webpPath);

  // 3. 上传
  const url = await uploadToQiniu(webpPath, fileName, uploadPath);

  // 4. 清理
  fs.unlinkSync(rawPath);
  fs.unlinkSync(webpPath);

  return { url };
}
