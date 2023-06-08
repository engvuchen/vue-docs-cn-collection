const { readFile, readdir } = require('fs/promises');
const nodePath = require('path');
const $ = require('gogocode');

const PKG_NAME_TO_CONF_MAP = {
  dir: {
    'vue-router': 'vue-router',
    vuex: 'vuex',
    pinia: 'pinia',
    // vite: 'docs-cn',
    // vue@3: 'docs-zh-cn',
  },
  docs_conf_path: {
    vuex: 'vuex/docs/.vitepress/config.js',
    'vue-router': 'vue-router/docs/.vuepress/config.js',
    '@pinia/root': 'pinia/packages/docs/.vitepress/config/zh.ts',
    // 'vite-docs-cn': 'docs-cn/.vitepress/config.ts',
    // '': 'docs-zh-cn/.vitepress/config.ts', // vue3 中文文档独立，且没有 name
  },
  access_path_prefix: {
    vuex: 'vuex/docs',
    'vue-router': 'vue-router/docs',
    '@pinia/root': 'pinia/packages/docs',
    // 'vite-docs-cn': 'docs-cn',
    // '': 'docs-zh-cn/src', // vue3 中文文档独立，且没有 name
  },
  selector: {
    vuex: `{ '/zh/': { nav: $_$1, sidebar: $_$2 } }`,
    'vue-router': `{ '/zh/': { nav: $_$1, sidebar: $_$2 } }`,
    '@pinia/root': `{ themeConfig: { sidebar: { '/zh/api/': $_$1, '/zh/': $_$2 } } }`,
    // 'vite-docs-cn': `{ themeConfig: { sidebar: { '/guide/': $_$1 } } }`,
    // '': `const sidebar: ThemeConfig['sidebar'] = { '/guide/': $_$1 }`, // vue3
  },
  host: {
    vuex: 'https://vuex.vuejs.org',
    'vue-router': 'https://v3.router.vuejs.org',
    '@pinia/root': 'https://pinia.vuejs.org',
    // 'vite-docs-cn': 'https://cn.vitejs.dev',
    // '': 'https://cn.vuejs.org/', // vue3 中文文档独立，且没有 name
  },
  img_online: {
    vuex: {
      '/flow.png': 'https://vuex.vuejs.org/flow.png',
      '/vuex.png': 'https://vuex.vuejs.org/vuex.png',
    },
  },
};
const {
  dir: nameToDirMap,
  docs_conf_path: docsConfPathMap,
  access_path_prefix: accessPathPrefixMap,
  selector: selectorMap,
  host: hostMap,
  img_online: imgOnlineMap,
} = PKG_NAME_TO_CONF_MAP;

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
// 处理配置指向文件（.md）和实际访问不符（.html），且不切换为 html 无法访问
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
async function getFilesByExtension(dir, ext, fileList = []) {
  const files = await readdir(dir);
  files.forEach(file => {
    const filePath = nodePath.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFilesByExtension(filePath, ext, fileList);
    } else if (nodePath.extname(file) === ext) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

module.exports = {
  nameToDirMap,
  docsConfPathMap,
  accessPathPrefixMap,
  selectorMap,
  hostMap,
  imgOnlineMap,
  getDocsConf,
  handlePathDiffInOnlineAndFile,
  flatterArr,
  getFilesByExtension,
};
