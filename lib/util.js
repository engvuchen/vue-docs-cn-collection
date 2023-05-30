const { readFile, writeFile, readdir } = require('fs/promises');
const $ = require('gogocode');

const docsConfPathMap = {
  vuex: 'vuex/docs/.vitepress/config.js',
  'vue-router': 'vue-router/docs/.vuepress/config.js',
  '@pinia/root': 'pinia/packages/docs/.vitepress/config/zh.ts',
  'vite-docs-cn': 'docs-cn/.vitepress/config.ts',
  '': 'docs-zh-cn/.vitepress/config.ts', // vue3 中文文档独立，且没有 name
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
  flatterArr
};
