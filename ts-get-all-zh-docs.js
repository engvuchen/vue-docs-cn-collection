/**
 * 1. vue 官方文档的 MD、HTML 是一一对应的；
 * 2. 读写对应 MD，汇合成单一个文档；
 * 3. 图片需要自行处理；
 * 4. 若是 TS 文件，配置文件后缀需改成 .mjs; 导入这个 mjs 需要 import，package.json 需配置 type: 'module'
 * 5. 还需要对配置文件进行改造，例如去掉类型引用。毕竟不是 TS 文件，要让 node.js 成功读取
 */
import { readFile, writeFile } from "node:fs/promises";
import pkg from "./package.json" assert { type: "json" };
if (!pkg.name) pkg.name = "";
const docsConfPathMap = {
  vuex: "./docs/.vitepress/config.js",
  "@pinia/root": "./packages/docs/.vitepress/config/zh.mjs",
  "vite-docs-cn": "./.vitepress/config.mjs",
  "": "./.vitepress/config.mjs", // vue3 中文文档独立，且没有 name
};
const accessPathPrefixMap = {
  vuex: "docs",
  "@pinia/root": "packages/docs",
  "vite-docs-cn": ".",
  "": "src", // vue3 中文文档独立，且没有 name
};

async function main() {
  let docsConfPath = docsConfPathMap[pkg.name];
  if (!docsConfPath) throw new RangeError(`不支持${pkg.name}，文档配置找不到`);
  let docsConf = await import(docsConfPath);
  const zhAccessMap = {
    vuex: docsConf?.themeConfig?.locales?.["/zh/"]?.sidebar,
    "@pinia/root": docsConf?.zhConfig?.themeConfig?.sidebar?.["/zh/"],
    "vite-docs-cn": docsConf?.default?.themeConfig?.sidebar?.["/guide/"],
    "": docsConf?.sidebar?.["/guide/"],
  };
  let zhConf = zhAccessMap[pkg.name]; // vue3 获取到的是一个对象 { '/guide/': [...] }
  if (!zhConf) {
    throw new RangeError(`不支持${pkg.name}，中文语言配置找不到`);
  }
  let oriList = zhConf;
  let dataList = await Promise.all(
    oriList.map((pathConf) => {
      if (typeof pathConf === "object") {
        return childTxtHandler(pathConf);
      } else {
        // 这里仅字符串，很少文档会这样，暂不处理
        return readFile(`docs${pathConf}`, "utf-8");
      }
    })
  );

  let prefix = pkg.name.replace(/[/]+/g, "-") || "vue3"; // '/' 会被识别为目录，处理它
  writeFile(`${prefix}-all-zh-docs.md`, dataList.join("\n"));
  console.log(`执行成功，跳转 ./${prefix}-all-zh-docs.md 查看`);
}
async function childTxtHandler(pathConf) {
  let { title, text, children, items } = pathConf;
  let childList = children?.length ? children : items;

  let list = await Promise.all(
    childList.map(async (pathConf) => {
      let path = pathConf.link || pathConf; // pathConf<Object|String>
      let fullPath = addPathToFull(path);
      let str = await readFile(fullPath, "utf-8");
      str = str.replace(/(?<=(#.+?))\%.+?\%/g, ""); // 去掉 pinia 标题的旁边模版字符串
      // 文章内容都加上二级标题
      let { title, text } = pathConf || {};
      let list = [str];
      if (title || text) {
        list = addSelectedTitleToArticles(title || text, 1, list);
      }
      return list.join("\n\n");
    })
  );

  return addSelectedTitleToArticles(title || text, 1, list).join("\n\n");
}
function addPathToFull(fsPath = "") {
  let lastPart = fsPath.split("/").pop();
  if (!lastPart.endsWith(".md")) {
    fsPath = fsPath.replace(/[.].+/, "");
    // todo:
    fsPath = `${accessPathPrefixMap[pkg.name]}${fsPath}`;
    // if (pkg.name === '@pinia/root') {
    //   fsPath = `packages/docs${fsPath}`
    // } else {
    //   fsPath = `docs${fsPath}`
    // }
    if (lastPart === "") return `${fsPath}index.md`;
    return `${fsPath}.md`;
  }
  return fsPath;
}
// 文章都是规则的，从一级标题开始的，所以这里添加标题，几级标题仅需要简单递增
function addSelectedTitleToArticles(title, titleLevel = 1, oriList) {
  // let titleLevelPrefix = new Array(titleLevel).fill('#').join('');
  let titleLevelPrefix = "#";
  // 文章内容都加上二级标题
  let list = oriList.map((str) => {
    return str.replace(/(#)+/g, function (p1) {
      return `${titleLevelPrefix}${p1}`;
    });
  });
  list.unshift(`${titleLevelPrefix} ${title}`);
  return list;
}

main();
