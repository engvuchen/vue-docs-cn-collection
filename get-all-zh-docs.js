/**
 * 1. vue 官方文档的 MD、HTML 是一一对应的；
 * 2. 读写对应 MD，汇合成单一个文档；
 *
 * 注意：
 * 1. 图片需自行处理；
 * 2. 若是 TS 文件，配置文件后缀需改成 .mjs; 导入这个 mjs 需要 import，package.json 需配置 type: 'module'
 * 3. 还需要对配置文件进行改造，例去掉类型引用。经过第二步 TS 文件后缀改为 .mjs，要让 node.js 成功读取
 */

const { readFile, writeFile, readdir } = require('fs/promises');
const { multiselect, isCancel } = require('@clack/prompts');
const $ = require('gogocode');

// main();

async function main() {
  let dirs = (await readdir('./', { withFileTypes: true })).reduce((accu, curr) => {
    if (curr.isDirectory() && !['node_modules', '.git'].includes(curr.name)) {
      accu.push(curr.name);
    }
    return accu;
  }, []);
  let options = dirs.map(dir => ({ title: dir, value: dir }));

  // const res = ['vuex-docs', 'pinia', 'vue-router', 'docs-zh-cn']; // 测试用
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

const docsConfPathMap = {
  vuex: 'vuex-docs/docs/.vitepress/config.js',
  'vue-router': 'vue-router/docs/.vuepress/config.js',
  '@pinia/root': 'pinia/packages/docs/.vitepress/config/zh.ts',
  'vite-docs-cn': 'docs-cn/.vitepress/config.ts',
  '': 'docs-zh-cn/.vitepress/config.ts', // vue3 中文文档独立，且没有 name
};
let sidebarSelectorMap = {
  vuex: `{ '/zh/': { sidebar: $_$1 } }`,
  'vue-router': `{ '/zh/': { sidebar: $_$1 } }`,
  '@pinia/root': `{ sidebar: { '/zh/': $_$1 } }`,
  'vite-docs-cn': `{ themeConfig: { sidebar: { '/guide/': $_$1 } } }`,
  '': `const sidebar: ThemeConfig['sidebar'] = { '/guide/': $_$1 }`, // vue3
};
const accessPathPrefixMap = {
  vuex: 'vuex-docs/docs',
  'vue-router': 'vue-router/docs',
  '@pinia/root': 'pinia/packages/docs',
  'vite-docs-cn': 'docs-cn',
  '': 'docs-zh-cn/src', // vue3 中文文档独立，且没有 name
};

async function mergeDocs(pkg) {
  let { name: pkgName = '' } = pkg;
  let docsConfPath = docsConfPathMap[pkgName];
  if (!docsConfPath) throw new RangeError(`不支持${pkgName}，文档配置找不到`);
  let selector = sidebarSelectorMap[pkgName];
  let docsConf = await getDocsConf(docsConfPath, selector);
  let dataList = await Promise.all(
    // 目前配置数组只有 str / obj，先简单处理
    docsConf.map(pathConf => {
      if (typeof pathConf === 'object') {
        // 配置是对象
        return childTxtHandler(pathConf, pkgName);
      } else {
        // 配置仅字符串
        return readFile(`${accessPathPrefixMap[pkgName]}${pathConf}`, 'utf-8');
      }
    })
  );

  let countList = [];
  while (docsConf.length) {
    let item = docsConf.pop();
    if (typeof item === 'string') {
      countList.push(item);
      continue;
    }
    let { children = [], items = [], link } = item || {};
    if (link) {
      countList.push(item);
    } else {
      docsConf.push(...children, ...items);
    }
  }

  let prefix = pkgName.replace(/[/]+/g, '-') || 'vue3'; // '/' 会被识别为目录，处理它
  writeFile(`${prefix}-all-zh-docs.md`, dataList.join('\n'));
  console.log(`成功，文档共 ${countList.length} 篇，查看 ./${prefix}-all-zh-docs.md`);
}
async function getDocsConf(docsConfPath = '', selector, selectorNum = 1) {
  let str = await readFile(docsConfPath, 'utf-8');
  let result = [];
  $(str)
    .find(selector)
    .each(item => {
      for (let i = 0; i < selectorNum; i++) {
        result.push(item.match[i + 1][0].value);
      }
    });

  console.log('result', result);
  return eval(result.join('\n'));
}
async function childTxtHandler(pathConf, pkgName) {
  let { title, text, children, items } = pathConf;
  let childList = children?.length ? children : items;

  let list = await Promise.all(
    childList.map(async pathConf => {
      let path = typeof pathConf === 'string' ? pathConf : pathConf.link; // pathConf<Object|String>
      let fullPath = addPathToFull(path, pkgName);
      let str = await readFile(fullPath, 'utf-8');
      // str = str.replace(/(?<=(#.+?))\%.+?\%/g, ''); // 去掉 pinia 标题的旁边模版字符串
      // 添加文章一级标题。剩余标题需添加 '#' 变成次级标题
      let { title, text } = pathConf || {};
      let list = [str];
      if (title || text) {
        list = addSelectedTitleToArticles(title || text, list);
      }
      return list.join('\n\n');
    })
  );
  return addSelectedTitleToArticles(title || text, list).join('\n\n');
}
function addPathToFull(fsPath = '', pkgName = '') {
  let lastPart = fsPath.split('/').pop();
  // 为部分路径添加 .md 后缀。例 src/docs -> src/docs/index.md；src/docs -> src/docs.md
  if (!lastPart.endsWith('.md')) {
    // fsPath = fsPath.replace(/[.].+/, ''); // 去掉也能正常执行？
    fsPath = `${accessPathPrefixMap[pkgName]}${fsPath}`;
    if (lastPart === '') {
      // let suffix = 'index.md';
      // if (docsConfPathMap[pkgName].includes('.vuepress')) {
      //   suffix = 'README.md';
      // }
      // return `${fsPath}${suffix}`;
      return paddingSuffix(fsPath);
    }
    return `${fsPath}.md`;
  } else {
    fsPath = `${accessPathPrefixMap[pkgName]}${fsPath}`;
  }
  return fsPath;
}
function paddingSuffix(fsPath) {
  let suffix = 'index.md';
  if (docsConfPathMap[pkgName].includes('.vuepress')) {
    suffix = 'README.md';
  }

  return `${fsPath}${suffix}`;
}
// 文章都是规则的，从一级标题开始。所以这里添加标题，几级标题仅需要简单递增
function addSelectedTitleToArticles(title, oriList) {
  // let titleLevelPrefix = new Array(titleLevel).fill('#').join('');
  let titleLevelPrefix = '#';
  // 文章内容都加上二级标题
  let list = oriList.map(str => {
    return str.replace(/(#)+/g, function (p1) {
      return `${titleLevelPrefix}${p1}`;
    });
  });
  list.unshift(`${titleLevelPrefix} ${title}`);
  return list;
}

module.exports = {
  main,
  getDocsConf,
  paddingSuffix,
};
