// banana-image-mcp 预设风格目录
// 用法: banana-image-mcp styles
//       banana-image-mcp styles pornhub
//       banana-image-mcp styles --style dark-chalkboard
import { describeStyles, listStyles } from "./styles.js";

function parseStyleArg(argv) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--style" || arg === "-s") return argv[i + 1] || "";
    if (arg.startsWith("--style=")) return arg.slice("--style=".length);
    if (!arg.startsWith("-")) return arg;
  }
  return "";
}

export async function runStylesCli(argv) {
  const requested = parseStyleArg(argv);
  if (!requested) {
    const { styles } = describeStyles();
    console.log("\n预设生图风格 / Preset image styles\n");
    console.log("不传 style 时不套风格，提示词原样发送。");
    console.log("Omit style to send the prompt unchanged.");
    console.log("传入 style 才追加该风格的固定提示词。传 \"none\" 与不传相同。");
    console.log("Pass a style id to append that fixed style prompt. \"none\" matches omitting it.\n");
    const width = Math.max(...styles.map((style) => style.id.length));
    for (const style of styles) {
      console.log(`  ${style.id.padEnd(width)}  ${style.name} / ${style.nameEn}`);
      console.log(`  ${" ".repeat(width)}  ${style.summary}`);
      console.log(`  ${" ".repeat(width)}  适合 / for: ${style.bestFor}`);
      console.log("");
    }
    console.log("查看某一风格的固定提示词 / show one fixed prompt:");
    console.log("  banana-image-mcp styles --style pornhub\n");
    return;
  }

  try {
    const { style } = describeStyles(requested);
    console.log(`\n${style.id}  ${style.name} / ${style.nameEn}`);
    console.log(style.summary);
    console.log(`适合 / for: ${style.bestFor}`);
    if (style.aliases.length) {
      console.log(`别名 / aliases: ${style.aliases.join(", ")}`);
    }
    console.log("\n固定风格提示词 / fixed style prompt:\n");
    console.log(style.prompt);
    console.log("");
  } catch (error) {
    console.error(`\n${error.message}\n`);
    console.error("可用 id / available ids:");
    for (const style of listStyles()) console.error(`  ${style.id}`);
    console.error("");
    process.exitCode = 1;
  }
}
