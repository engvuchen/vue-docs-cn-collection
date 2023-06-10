/**
 * 1. vue 官方文档的 MD、HTML 是一一对应的；
 * 2. 读写对应 MD，汇合成单一个文档；
 *
 * 注意：
 * 1. 图片需自行处理；
 * 2. 若是 TS 文件，配置文件后缀需改成 .mjs; 导入这个 mjs 需要 import，package.json 需配置 type: 'module'
 * 3. 还需要对配置文件进行改造，例去掉类型引用。经过第二步 TS 文件后缀改为 .mjs，要让 node.js 成功读取
 *
 * 自测：
 * 1. openUrlInBrowser 打开所有链接
 * 2. vscode 打开汇总文档，使用正则 \[.+?\]\(.+?\) 检查引用链接是否被正确替换
 */

const { readFile, writeFile, readdir } = require('fs/promises');
const { multiselect, isCancel } = require('@clack/prompts');
const {
  getDocsConf,
  nameToDirMap,
  docsConfPathMap,
  selectorMap,
  accessPathPrefixMap,
  handlePathDiffInOnlineAndFile,
  flatterArr,
} = require('./util');
const { handleLinks } = require('./handle-relative-links');

async function main() {
  let names = ['vue-router', 'vuex', 'pinia'];
  let options = names.map(name => ({ title: name, value: nameToDirMap[name] }));
  const res = await multiselect({
    message: '选择一个或多个仓库进行操作',
    options,
    required: true,
  });
  if (isCancel(res)) return;

  res.forEach(async dir => {
    let pkgPath = `${dir}/package.json`;
    let pkgStr = await readFile(pkgPath, 'utf-8');
    if (!pkgStr) return console.log(`不存在 ${pkgPath}`);
    let pkg = JSON.parse(pkgStr);
    mergeDocs(pkg);
  });
}
async function mergeDocs(pkg) {
  let { name: pkgName = '' } = pkg;
  let docsConfPath = docsConfPathMap[pkgName];
  if (!docsConfPath) throw new RangeError(`不支持${pkgName}，文档配置找不到`);

  let selector = selectorMap[pkgName];
  let confList = await getDocsConf(docsConfPath, selector); // 注意选择器数量
  let docsConf = JSON.parse(JSON.stringify(confList[0]));
  let dataList = await Promise.all(
    // 目前配置数组只有 str / obj，先简单处理，暂时没有看到 items 里的项有 items 属性
    docsConf.map(async pathConf => {
      if (typeof pathConf === 'object') {
        // 配置是对象
        return childTxtHandler(pathConf, pkgName);
      } else {
        // 配置仅字符串
        let filePath = `${accessPathPrefixMap[pkgName]}${pathConf}`;
        let str = await readFile(filePath, 'utf-8');
        let resultStr = await handleLinks(str, pathConf, pkgName, filePath);
        return resultStr;
      }
    })
  );
  let prefix = pkgName.replace(/[/]+/g, '-') || 'vue3'; // '/' 会被识别为目录，处理它
  let pageStr = dataList.join('\n');
  await writeFile(`./${prefix}-all-zh-docs.md`, pageStr);

  // 统计文章数
  let count = getPageCount(docsConf);
  console.log(`成功，文档共 ${count} 篇，查看 ./${prefix}-all-zh-docs.md`);
}
async function childTxtHandler(pathConf, pkgName) {
  let { title, text, children = [], items = [] } = pathConf;
  let childList = children?.length ? children : items;
  let list = await Promise.all(
    childList.map(async pathConf => {
      let path = typeof pathConf === 'string' ? pathConf : pathConf.link; // pathConf<Object|String>
      let fullPath = addPathToFull(path, pkgName);

      let str = await readFile(fullPath, 'utf-8');
      // str = str.replace(/(?<=(#.+?))\%.+?\%/g, ''); // 去掉 pinia 标题的旁边模版字符串
      // 添加文章一级标题。剩余标题需添加 '#' 变成次级标题
      let { title, text } = pathConf || {};
      let list = [str]; // 若有 { text, link }，text 是一级标题，使 link 文章的标题多一个 #
      if (title || text) {
        list = addSelectedTitleToArticles(title || text, list);
      }
      let resultStr = await handleLinks(list.join('\n\n'), path, pkgName, fullPath);
      return resultStr;
    })
  );
  return addSelectedTitleToArticles(title || text, list).join('\n\n');
}
// 为部分路径添加 .md 后缀。例 src/docs/ -> src/docs/index.md； src/docs -> src/docs.md
function addPathToFull(fsPath = '', pkgName = '') {
  let lastPart = fsPath.split('/').pop();
  let prefix = accessPathPrefixMap[pkgName];
  if (!lastPart.endsWith('.md')) {
    fsPath = `${prefix}${fsPath}`;
    if (lastPart === '') return paddingSuffix(fsPath, pkgName);
    fsPath = fsPath.replace('.html', '');
    return `${fsPath}.md`;
  } else {
    fsPath = `${prefix}${fsPath}`;
  }
  return fsPath;
}
function paddingSuffix(fsPath, pkgName) {
  let suffix = 'index.md';
  if (docsConfPathMap[pkgName].includes('.vuepress')) {
    suffix = 'README.md';
  }
  return `${fsPath}${suffix}`;
}
// 文章都从一级标题开始。侧栏标题附加到文章上成为一级标题，每篇文章的每级标题都需添加 '#'，让标题顺利递进
function addSelectedTitleToArticles(title, oriList) {
  let titleLevelPrefix = '#';
  // 文章内容都加上二级标题
  let list = oriList.map(str => {
    // 自测案例： Array.from('#路由对象 ##路由参数配置 zh#abc #test'.matchAll(/(^|\s)#+/g))
    return str.replace(/(?<=^|\s)#+/g, function (p1) {
      return `${titleLevelPrefix}${p1}`;
    });
  });
  list.unshift(`${titleLevelPrefix} ${title}`);
  return list;
}
function getPageCount(docsConf = []) {
  let list = JSON.parse(JSON.stringify(docsConf));
  let count = 0;
  while (list.length) {
    let item = list.pop();
    if (typeof item === 'string') {
      count += 1;
      continue;
    }
    let { children = [], items = [] } = item || {};
    if (typeof item.link === 'string') {
      count += 1;
    } else {
      list.push(...children, ...items);
    }
  }
  return count;
}

module.exports = {
  getAllZhDocs: main,
};
