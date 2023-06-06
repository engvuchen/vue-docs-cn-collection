const { readFile } = require('fs/promises');
const $ = require('gogocode');

const docsConfPathMap = {
  vuex: 'vuex/docs/.vitepress/config.js',
  'vue-router': 'vue-router/docs/.vuepress/config.js',
  '@pinia/root': 'pinia/packages/docs/.vitepress/config/zh.ts',
  // 'vite-docs-cn': 'docs-cn/.vitepress/config.ts',
  // '': 'docs-zh-cn/.vitepress/config.ts', // vue3 中文文档独立，且没有 name
};

async function getDocsConf(docsConfPath = '', selector, selectorNum = 1) {
  let str = await readFile(docsConfPath, 'utf-8');
  let result = [];
  $(str)
    .find(selector)
    .each(item => {
      for (let i = 0; i < selectorNum; i++) {
        result.push(eval(item.match[i + 1][0].value));
      }
    });
  return result;
}
// 处理配置指向文件（.md）和实际访问不符（.html）的问题
function handlePathDiffInOnlineAndFile(paths = [], pkgName = '') {
  let map = {
    ['vue-router'](paths) {
      // dynamic-matching.md 实际使用 .html 导航: https://v3.router.vuejs.org/guide/essentials/dynamic-matching.html
      let foundIndex = paths.findIndex(curr => curr.includes('dynamic-matching.md'));
      if (foundIndex > -1) {
        paths[foundIndex] = paths[foundIndex].replace('.md', '.html');
      }
    },
    ['vuex'](paths) {
      // migrating-to-4-0-from-3-x 实际使用 .html 导航: https://vuex.vuejs.org/zh/guide/migrating-to-4-0-from-3-x.html
      let foundIndex = paths.findIndex(curr => curr.includes('migrating-to-4-0-from-3-x'));
      if (foundIndex > -1) {
        let result = paths[foundIndex].replace('.md', '.html');
        if (!result.endsWith('.html')) result = result + '.html';
        paths[foundIndex] = result;
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

module.exports = {
  docsConfPathMap,
  getDocsConf,
  handlePathDiffInOnlineAndFile,
  flatterArr,
};
