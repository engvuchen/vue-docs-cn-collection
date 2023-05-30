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
const { getDocsConf, docsConfPathMap } = require('./util');
const { handleLinks } = require('./handle-links');

async function main() {
  let dirToNameMap = {
    'docs-cn': 'vite',
    'docs-zh-cn': 'vue@3',
    pinia: 'pinia',
    'vue-router': 'vue-router',
    'vuex-docs': 'vuex',
  };
  let nameToDirMap = {};
  Object.keys(dirToNameMap).forEach(key => {
    nameToDirMap[dirToNameMap[key]] = key;
  });
  // console.log('nameToDirMap', nameToDirMap);

  // let names = (await readdir('./', { withFileTypes: true })).reduce((accu, curr) => {
  //   if (curr.isDirectory() && !['node_modules', '.git', 'lib'].includes(curr.name)) {
  //     accu.push(dirToNameMap[curr.name]);
  //   }
  //   return accu;
  // }, []);
  let names = ['vue-router', 'vuex'];
  let options = names.map(name => ({ title: name, value: nameToDirMap[name] }));
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
    mergeDocs(pkg); // todo
  });
}

let sidebarSelectorMap = {
  vuex: `{ '/zh/': { nav: $_$1, sidebar: $_$2 } }`,
  'vue-router': `{ '/zh/': { nav: $_$1, sidebar: $_$2 } }`,
  // '@pinia/root': `{ sidebar: { '/zh/': $_$1 } }`,
  // 'vite-docs-cn': `{ themeConfig: { sidebar: { '/guide/': $_$1 } } }`,
  // '': `const sidebar: ThemeConfig['sidebar'] = { '/guide/': $_$1 }`, // vue3
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

  console.log('docsConfPath', docsConfPath);

  /**
   * 单文章处理 相对路径：
   * 1. 获取 guide 在内的文档参数
   * 2. #开头特殊处理
   */
  let selector = sidebarSelectorMap[pkgName];
  let confList = await getDocsConf(docsConfPath, selector, 2);
  let [navConf, docsConf, ...otherConf] = confList;

  let dataList = await Promise.all(
    // 目前配置数组只有 str / obj，先简单处理
    docsConf.map(pathConf => {
      if (typeof pathConf === 'object') {
        // 配置是对象
        return childTxtHandler(pathConf, pkgName);
      } else {
        // 配置仅字符串
        // todo
        let str = readFile(`${accessPathPrefixMap[pkgName]}${pathConf}`, 'utf-8');
        handleLinks(str, pkgName, confList);
        return str;
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
    let { children = [], items = [] } = item || {};
    if (typeof item.link === 'string') {
      countList.push(item);
    } else {
      docsConf.push(...children, ...items);
    }
  }

  let prefix = pkgName.replace(/[/]+/g, '-') || 'vue3'; // '/' 会被识别为目录，处理它
  let pageStr = await handleLinks(dataList.join('\n'), pkgName);
  writeFile(`./${prefix}-all-zh-docs.md`, pageStr);
  console.log(`成功，文档共 ${countList.length} 篇，查看 ./${prefix}-all-zh-docs.md`);
}
async function childTxtHandler(pathConf, pkgName) {
  let { title, text, children = [], items = [] } = pathConf;
  let childList = children?.length ? children : items;
  let list = await Promise.all(
    childList.map(async pathConf => {
      let path = typeof pathConf === 'string' ? pathConf : pathConf.link; // pathConf<Object|String>
      let fullPath = addPathToFull(path, pkgName);

      let str = await readFile(fullPath, 'utf-8'); // todo
      // str = str.replace(/(?<=(#.+?))\%.+?\%/g, ''); // 去掉 pinia 标题的旁边模版字符串
      // 添加文章一级标题。剩余标题需添加 '#' 变成次级标题
      let { title, text } = pathConf || {};
      let list = [str]; // 若有 { text, link }，text 是一级标题，使 link 文章的标题多一个 #
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
    fsPath = `${accessPathPrefixMap[pkgName]}${fsPath}`;
    if (lastPart === '') {
      return paddingSuffix(fsPath, pkgName);
    }
    fsPath = fsPath.replace('.html', '');
    return `${fsPath}.md`;
  } else {
    fsPath = `${accessPathPrefixMap[pkgName]}${fsPath}`;
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
// 文章都是规则的，从一级标题开始。每篇文章的每级标题添加 '#'，让标题顺利递进
// todo 改掉 hash 了
function addSelectedTitleToArticles(title, oriList) {
  let titleLevelPrefix = '#';
  // 文章内容都加上二级标题
  let list = oriList.map(str => {
    // 测试： Array.from('#路由对象 ##路由参数配置 zh#abc #test'.matchAll(/(^|\s)#+/g))
    return str.replace(/(?<=^|\s)#+/g, function (p1) {
      return `${titleLevelPrefix}${p1}`;
    });
  });
  list.unshift(`${titleLevelPrefix} ${title}`);
  return list;
}

module.exports = {
  getAllZhDocs: main,
};
