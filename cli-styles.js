// banana-image-mcp 风格目录
// 用法: banana-image-mcp styles
//       banana-image-mcp styles pornhub
//       banana-image-mcp styles --style dark-chalkboard
//       banana-image-mcp styles add --name "奶油笔记" --prompt "..."
//       banana-image-mcp styles add --name "奶油笔记" --image ./ref.png
//       banana-image-mcp styles remove --name "奶油笔记"
import readline from "readline";
import { deleteCustomStyle, describeStyles, listStyles, saveCustomStyle } from "./styles.js";

function parseStyleArg(argv) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--style" || arg === "-s") return argv[i + 1] || "";
    if (arg.startsWith("--style=")) return arg.slice("--style=".length);
    if (!arg.startsWith("-")) return arg;
  }
  return "";
}

function flagValue(argv, name) {
  const eq = argv.find((arg) => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = argv.indexOf(name);
  if (index >= 0) return argv[index + 1] || "";
  return null;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function printAddUsage() {
  console.error("\n用法 / usage:");
  console.error('  banana-image-mcp styles add --name "奶油笔记" --prompt "Soft cream paper, rounded title."');
  console.error('  banana-image-mcp styles add --name "奶油笔记" --image ./ref.png');
  console.error('  banana-image-mcp styles add --name "奶油笔记" --image https://example.com/ref.png\n');
}

async function runAdd(argv) {
  let name = flagValue(argv, "--name");
  let prompt = flagValue(argv, "--prompt");
  let image = flagValue(argv, "--image");
  const valueFlags = new Set(["--name", "--prompt", "--image"]);
  const positional = argv.filter((arg, index) => {
    if (valueFlags.has(arg)) return false;
    if (index > 0 && valueFlags.has(argv[index - 1])) return false;
    return !arg.startsWith("--");
  });
  if (name == null && positional.length) name = positional[0];
  if (prompt == null && image == null && positional.length > 1) prompt = positional.slice(1).join(" ");

  const interactive = process.stdin.isTTY && process.stdout.isTTY;
  if (interactive) {
    if (!name) name = await ask("风格名称 / style name: ");
    if (!String(prompt || "").trim() && !String(image || "").trim()) {
      prompt = await ask("风格提示词 / style prompt（直接回车改用参考图）: ");
      if (!prompt) image = await ask("参考图路径或链接 / image path or URL: ");
    }
  }
  if (!name || (!String(prompt || "").trim() && !String(image || "").trim())) {
    printAddUsage();
    process.exitCode = 1;
    return;
  }

  let saved;
  if (String(prompt || "").trim()) {
    saved = saveCustomStyle(name, prompt);
  } else {
    console.log("\n正在从图片提取风格 / extracting a style prompt from the image...\n");
    const { saveImageStyle } = await import("./index.js");
    saved = await saveImageStyle({ name, image });
    console.log("提取出的风格提示词 / extracted style prompt:\n");
    console.log(saved.style.prompt);
    console.log("");
  }
  const verb = saved.created ? "已创建 / created" : "已更新 / updated";
  console.log(`\n${verb}: ${saved.style.name} (${saved.style.id})`);
  console.log(`文件 / file: ${saved.path}`);
  console.log("生图时传入这个名称即可 / pass this name as style.\n");
}

function runRemove(argv) {
  let name = flagValue(argv, "--name");
  const positional = argv.filter((arg) => !arg.startsWith("--"));
  if (name == null && positional.length) name = positional.join(" ");
  if (!name) {
    console.error('\n用法 / usage: banana-image-mcp styles remove --name "奶油笔记"\n');
    process.exitCode = 1;
    return;
  }
  const removed = deleteCustomStyle(name);
  console.log(`\n已删除自定义风格 / deleted custom style: ${removed.name} (${removed.id})`);
  console.log(`文件 / file: ${removed.path}\n`);
}

export async function runStylesCli(argv) {
  const command = argv[0];
  if (command === "add" || command === "save" || command === "create") {
    try {
      await runAdd(argv.slice(1));
    } catch (error) {
      console.error(`\n${error.message}\n`);
      process.exitCode = 1;
    }
    return;
  }
  if (command === "remove" || command === "delete" || command === "rm") {
    try {
      runRemove(argv.slice(1));
    } catch (error) {
      console.error(`\n${error.message}\n`);
      process.exitCode = 1;
    }
    return;
  }

  const requested = parseStyleArg(argv);
  if (!requested) {
    const { styles, globalStyle } = describeStyles();
    console.log("\n生图风格 / Image styles\n");
    if (globalStyle?.id) {
      console.log(`全局风格 IMAGE_STYLE：${globalStyle.id}`);
      console.log(`Global style IMAGE_STYLE: ${globalStyle.id}`);
      console.log("不传 style 时使用它。当次传入的 style 优先。传 none 则这一次不套风格。");
      console.log("Omit style to use it. A style on the call wins. Pass none to skip it once.");
    } else if (globalStyle?.error) {
      console.log(`全局风格 IMAGE_STYLE 无法使用 / unusable IMAGE_STYLE: ${globalStyle.error}`);
    } else {
      console.log("当前进程没有全局风格。不传 style 时提示词原样发送。");
      console.log("This process has no global style. Omit style to send the prompt unchanged.");
      console.log("可在 banana-image-mcp setup 里设置 IMAGE_STYLE。");
      console.log("Set IMAGE_STYLE with banana-image-mcp setup.");
    }
    console.log("自定义风格保存在 ~/.banana-image-mcp/styles.json，更新 MCP 不会删除。");
    console.log("Custom styles live in ~/.banana-image-mcp/styles.json and survive MCP updates.\n");
    const width = Math.max(...styles.map((style) => style.id.length));
    for (const style of styles) {
      const label = style.source === "custom" ? `${style.name} / custom` : `${style.name} / ${style.nameEn}`;
      console.log(`  ${style.id.padEnd(width)}  ${label}`);
      console.log(`  ${" ".repeat(width)}  ${style.summary}`);
      console.log(`  ${" ".repeat(width)}  适合 / for: ${style.bestFor}`);
      console.log("");
    }
    console.log("查看某一风格的固定提示词 / show one fixed prompt:");
    console.log("  banana-image-mcp styles --style pornhub");
    console.log("创建自定义风格 / save a custom style:");
    console.log('  banana-image-mcp styles add --name "奶油笔记" --prompt "..."');
    console.log("用一张参考图提取风格 / extract a style from a reference image:");
    console.log('  banana-image-mcp styles add --name "奶油笔记" --image ./ref.png\n');
    return;
  }

  try {
    const { style } = describeStyles(requested);
    console.log(`\n${style.id}  ${style.name} / ${style.nameEn}`);
    console.log(style.summary);
    console.log(`适合 / for: ${style.bestFor}`);
    console.log(`来源 / source: ${style.source === "custom" ? "custom" : "builtin"}`);
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
