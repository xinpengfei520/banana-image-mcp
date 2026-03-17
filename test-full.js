import { generate_blog_cover } from "./index.js";

async function testFullFlow() {
  console.log("开始测试完整流程...\n");

  try {
    const result = await generate_blog_cover({
      prompt: "A beautiful sunset over mountains with vibrant colors",
      slug: "test-blog",
      path: "test-images"
    });

    console.log("\n✓ 测试成功!");
    console.log("生成的图片URL:", result.url);
  } catch (error) {
    console.error("\n✗ 测试失败:", error.message);
    console.error(error);
  }
}

testFullFlow();
