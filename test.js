import fs from "fs";
import sharp from "sharp";
import qiniu from "qiniu";
import dotenv from "dotenv";

dotenv.config();

// 测试七牛上传
async function testQiniuUpload() {
  console.log("开始测试七牛上传...");

  // 创建一个测试图片
  const testImagePath = "./tmp/test-image.webp";

  if (!fs.existsSync("./tmp")) {
    fs.mkdirSync("./tmp");
  }

  // 生成一个简单的测试图片
  await sharp({
    create: {
      width: 1792,
      height: 1024,
      channels: 4,
      background: { r: 100, g: 150, b: 200, alpha: 1 }
    }
  })
  .webp({ quality: 80 })
  .toFile(testImagePath);

  console.log("✓ 测试图片已生成");

  // 上传到七牛
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
  config.zone = qiniu.zone.Zone_z0;

  const formUploader = new qiniu.form_up.FormUploader(config);
  const putExtra = new qiniu.form_up.PutExtra();

  const key = `test/${Date.now()}.webp`;

  return new Promise((resolve, reject) => {
    formUploader.putFile(uploadToken, key, testImagePath, putExtra, (err, body, info) => {
      if (err) {
        console.error("✗ 上传失败:", err);
        reject(err);
      } else if (info.statusCode === 200) {
        const url = `${process.env.QINIU_CDN_DOMAIN}/${key}`;
        console.log("✓ 上传成功!");
        console.log("图片URL:", url);

        // 清理测试文件
        fs.unlinkSync(testImagePath);
        console.log("✓ 测试文件已清理");

        resolve(url);
      } else {
        console.error("✗ 上传失败，状态码:", info.statusCode);
        reject(new Error(`Upload failed: ${info.statusCode}`));
      }
    });
  });
}

testQiniuUpload().catch(console.error);
