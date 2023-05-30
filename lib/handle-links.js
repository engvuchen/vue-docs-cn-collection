const { readFile, writeFile } = require('node:fs/promises');
const { docsConfPathMap, getDocsConf } = require('./util');

/**
 * 处理“已汇总文章”中的链接：
 * 1. 🟩 MD 链接 - []()
 * 1.1 不处理 https 链接，仅处理相对引用链接（例：../api/#test）
 * 1.2 相对引用链接在文档配置中的 nav / guide 中寻找，可能会有找不到的情况；
 * 2. ⬜️ MD 图片
 */

// main();

// let linkReg = /(?<=\[.+?\])\((.+?)\)/g; // 匹配相对引用链接

// [0-9a-zA-Z\u4e00-\u9fa5./#-] 对于 [] 内的匹配

/**
 * 用 vuex / vue-router 作为测试：
 * 1. 图片
 * 2. 相对路径
 * 3. 单文章导航
 */

// let linkReg = /(?<=!{0,1}\[.+?\])\(((?!http)(?![=>()<]).+?)\)/g; // 匹配相对引用链接
let linkReg = /(?<=!{0,1}\[.+?\])\(((?!http)(?![=>()<]).+?)\)/g; // 匹配相对引用链接
async function main(str, pkgName, confList) {
  // let fsPath = './vue-router-all-zh-docs.md';
  // let str = await readFile(fsPath, 'utf-8');
  if (!str) return console.log('没有内容');

  // let list = Array.from(str.matchAll(linkReg), m => m[1]).filter(link => !link.startsWith('http'));
  let list = Array.from(str.matchAll(linkReg), m => m[1]);
  console.log(pkgName, list.length, list);
  await writeFile('./test-relative.txt', list.join('\n'));

  // api 在 nav，取出用于匹配路径
  // let selectorMap = {
  //   vuex: `{ '/zh/': { nav: $_$1, sidebar: $_$2 } }`, // 🟩 { '/zh/': { nav: $_$1, sidebar: $_$2 } }
  //   'vue-router': `{ '/zh/': { nav: $_$1, sidebar: $_$2 } }`, // 🟩
  //   '@pinia/root': `{ themeConfig: { nav: $_$1, sidebar: { '/guide/': $_$2 } } }`,
  //   'vite-docs-cn': `{ themeConfig: { nav: $_$1, sidebar: { '/guide/': $_$2 } } }`, // ⬜️
  //   '': `{ themeConfig: { nav: $_$1, sidebar: { '/guide/': $_$2 } } }`, // vue3 中文文档独立，且没有 name
  // };
  // let docsConfPath = docsConfPathMap[pkgName];
  let [navConf, sidebarConf] = await getDocsConf(docsConfPath, selectorMap[pkgName], 2);
  let paths = [];
  flatterArr(navConf, paths);
  flatterArr(sidebarConf, paths);
  handlePaths(paths, pkgName);

  let result = list.reduce((arr, path) => {
    // 去掉路径中的相对路径、锚点 - './sidebar' => ‘sidebar’;  vue/vite 都支持隐藏地址栏的 md
    let pathWithoutRelative = path
      .replace(/[.]{1,2}[/]/g, '')
      .replace(/[.]md/g, '')
      .replace(/[.]html/g, '');

    // todo 页面导航 - 导航不是唯一 ID，只能在每一篇文章被读取时去处理
    if (pathWithoutRelative.startsWith('#')) {
      //
    }

    let purePath = '';
    let parts = pathWithoutRelative.split('');
    let [hash = ''] = /#.+/.exec(pathWithoutRelative) || [];
    while (parts.length) {
      let part = parts.shift();
      if (part === '#') break;
      purePath = purePath + part;
    }

    let hostMap = {
      vuex: 'https://vuex.vuejs.org/',
      'vue-router': 'https://v3.router.vuejs.org',
      '@pinia/root': 'https://pinia.vuejs.org/zh',
      'vite-docs-cn': 'https://cn.vitejs.dev',
      '': 'https://cn.vuejs.org/', // vue3 中文文档独立，且没有 name
    };

    /**
     * vite:
     * 1. 存在本页导航 #glob-import
     * 2. vite 既有 './config'，也有 '.html' 的地址栏，不统一
     */

    let found = paths.find(currPath => currPath.includes(purePath));
    if (found) arr.push(`${hostMap[pkgName]}${found.replace(/[.]md/, '')}${hash}`);
    return arr;
  }, []);

  console.log(pkgName, result.length, result);

  list.forEach((originLink, index) => {
    str = str.replace(originLink, result[index]);
  });

  // 验证使用。查看链接是否可导航
  // result.forEach(url => {
  //   openUrlInBrowser(url);
  // });

  return str;
}
// 处理配置指向文件（.md）和实际访问不符（.html）的问题
function handlePaths(paths = [], pkgName = '') {
  let map = {
    ['vue-router'](paths) {
      // dynamic-matching.md 实际使用 .html 导航: https://v3.router.vuejs.org/guide/essentials/dynamic-matching.html
      let foundIndex = paths.findIndex(curr => curr.includes('dynamic-matching.md'));
      if (foundIndex > -1) {
        paths[foundIndex] = paths[foundIndex].replace('.md', '.html');
      }
    },
  };
  if (map[pkgName]) map[pkgName](paths);
}
function flatterArr(list = [], collections = []) {
  while (list.length) {
    let item = list.pop();
    if (typeof item === 'string') {
      collections.push(item);
    } else if (typeof item.link === 'string') {
      collections.push(item.link);
    } else {
      let { children = [], items = [] } = item;
      list.push(...children, ...items);
    }
  }
}
function openUrlInBrowser(url = '') {
  if (!url) return;
  let map = {
    darwin: 'open',
    win32: 'start',
  };
  let start = map[process.platform] || 'xdg-open';
  require('child_process').exec(start + ' ' + url);
}
module.exports = {
  handleLinks: main,
};
