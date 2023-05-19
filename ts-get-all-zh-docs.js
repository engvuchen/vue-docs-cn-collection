/**
 * 1. vue 官方文档的 MD、HTML 是一一对应的；
 * 2. 读写对应 MD，汇合成单一个文档；
 *
 * 注意：
 * 1. 图片需要自行处理；
 * 2. 若是 TS 文件，配置文件后缀需改成 .mjs; 导入这个 mjs 需要 import，package.json 需配置 type: 'module'
 * 3. 还需要对配置文件进行改造，例去掉类型引用。经过第二步 TS 文件后缀改为 .mjs，要让 node.js 成功读取
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { multiselect, isCancel } from '@clack/prompts';

main();

async function main() {
  // let dirs = (await readdir('./', { withFileTypes: true })).reduce((accu, curr) => {
  //   if (curr.isDirectory() && !['node_modules', '.git'].includes(curr.name)) {
  //     accu.push(curr.name);
  //   }
  //   return accu;
  // }, []);
  // let options = dirs.map(dir => ({ title: dir, value: dir }));

  const res = ['vuex-docs', 'pinia', 'vue-router', 'docs-zh-cn'];
  // const res = await multiselect({
  //   message: '选择一个或多个仓库进行操作',
  //   options,
  //   required: true,
  // });
  // if (isCancel(res)) return;

  res.forEach(async dir => {
    let pkgPath = `${dir}/package.json`;
    let pkgStr = await readFile(pkgPath, 'utf-8');
    if (!pkgStr) return console.log(`不存在 ${pkgPath}`);

    let pkg = JSON.parse(pkgStr);
    mergeDocs(pkg);
  });
}

// todo
const docsConfPathMap = {
  vuex: 'vuex-docs/docs/.vitepress/config.js',
  'vue-router': 'vue-router/docs/.vuepress/config.js',
  '@pinia/root': 'pinia/packages/docs/.vitepress/config/zh.ts',
  // 'vite-docs-cn': '/.vitepress/config.mjs',
  '': 'docs-zh-cn/.vitepress/config.ts', // vue3 中文文档独立，且没有 name
};
const accessPathPrefixMap = {
  vuex: 'vuex-docs/docs',
  'vue-router': 'vue-router/docs',
  '@pinia/root': 'pinia/packages/docs',
  // 'vite-docs-cn': '.',
  '': 'docs-zh-cn/src', // vue3 中文文档独立，且没有 name
};
async function mergeDocs(pkg) {
  let { name: pkgName = '' } = pkg;
  // if (!pkgName) pkg.name = '';
  let docsConfPath = docsConfPathMap[pkgName];
  if (!docsConfPath) throw new RangeError(`不支持${pkgName}，文档配置找不到`);

  // let docsConf = await import(docsConfPath);
  // todo
  let docsConf = await getDocsConf(docsConfPath, pkgName);
  // const zhAccessMap = {
  //   vuex: docsConf?.default?.themeConfig?.locales?.['/zh/']?.sidebar,
  //   'vue-router': docsConf?.default?.themeConfig?.locales?.['/zh/'].sidebar,
  //   '@pinia/root': docsConf?.zhConfig?.themeConfig?.sidebar?.['/zh/'],
  //   // 'vite-docs-cn': docsConf?.default?.themeConfig?.sidebar?.['/guide/'],
  //   '': docsConf?.sidebar?.['/guide/'], // vue3
  // };
  // let zhConf = zhAccessMap[pkgName]; // vue3 获取到的是一个对象 { '/guide/': [...] }
  // if (!zhConf) {
  //   throw new RangeError(`${pkgName || '未知'}，中文语言配置找不到`);
  // }
  let oriList = docsConf;
  let dataList = await Promise.all(
    oriList.map(pathConf => {
      if (typeof pathConf === 'object') {
        return childTxtHandler(pathConf, pkgName);
      } else {
        // 这里仅字符串，很少文档会这样，暂不处理
        console.log('only str', pathConf);

        return readFile(`${accessPathPrefixMap[pkgName]}${pathConf}`, 'utf-8');
      }
    })
  );

  let prefix = pkgName.replace(/[/]+/g, '-') || 'vue3'; // '/' 会被识别为目录，处理它
  writeFile(`${prefix}-all-zh-docs.md`, dataList.join('\n'));
  console.log(`执行成功，跳转 ./${prefix}-all-zh-docs.md 查看`);
}
async function getDocsConf(docsConfPath = '', pkgName) {
  let str = await readFile(docsConfPath, 'utf-8');

  // let newStr = str.slice(3615, 5023); // vuex
  // let newStr = str.slice(4053, 5174); // vue-router
  // let newStr = str.slice(2103, 4279); // pinia
  // let newStr = str.slice(3415, 8428); // vue3

  let handlerMap = {
    vuex: function (str) {
      return str.slice(3615, 5023); // todo
    },
    'vue-router': function (str) {
      return str.slice(4053, 5174); // todo
    },
    '@pinia/root': function (str) {
      return str.slice(2103, 4279); // todo
    },
    // 'vite-docs-cn': docsConf?.default?.themeConfig?.sidebar?.['/guide/'],
    '': function (str) {
      return str.slice(3415, 8428); // todo
    }, // vue3
  };
  return eval(handlerMap[pkgName](str));
}
async function childTxtHandler(pathConf, pkgName) {
  let { title, text, children, items } = pathConf;
  let childList = children?.length ? children : items;

  let list = await Promise.all(
    childList.map(async pathConf => {
      let path = typeof pathConf === 'string' ? pathConf : pathConf.link; // pathConf<Object|String>
      // if (typeof path === 'function') {
      //   // 字符串上访问 得到 link?
      //   console.log(888, typeof pathConf, pathConf, pathConf.link);
      // }

      let fullPath = addPathToFull(path, pkgName);
      let str = await readFile(fullPath, 'utf-8');
      str = str.replace(/(?<=(#.+?))\%.+?\%/g, ''); // 去掉 pinia 标题的旁边模版字符串
      // 文章内容都加上二级标题
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
  // console.log('pkgName', pkgName);
  // console.log('fsPath', typeof fsPath, fsPath);

  let lastPart = fsPath.split('/').pop();
  // 处理文件夹的 md 文件，或无 .md 后缀。例 src/docs -> src/docs/index.md；src/docs -> src/docs.md
  if (!lastPart.endsWith('.md')) {
    fsPath = fsPath.replace(/[.].+/, '');
    // todo:
    fsPath = `${accessPathPrefixMap[pkgName]}${fsPath}`;
    if (lastPart === '') {
      let suffix = 'index.md';
      if (docsConfPathMap[pkgName].includes('.vuepress')) {
        suffix = 'README.md';
      }
      return `${fsPath}${suffix}`;
    }
    return `${fsPath}.md`;
  } else {
    fsPath = `${accessPathPrefixMap[pkgName]}${fsPath}`;
  }
  return fsPath;
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
