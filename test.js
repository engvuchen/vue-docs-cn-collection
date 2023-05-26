const { readFile } = require('node:fs/promises');
const { getDocsConf, paddingSuffix } = require('./get-all-zh-docs');

let linkReg = /\[.+?\]\((.+?)\)/g; // 匹配带链接的标题

async function main(fsPath = '') {
  let str = await readFile(fsPath, 'utf-8');

  if (!str) return console.log('没有内容');

  let list = Array.from(str.matchAll(linkReg), m => m[1]).filter(link => !link.startsWith('http'));

  let paths = [];
  let result = await getDocsConf(
    'vue-router/docs/.vuepress/config.js',
    `{ '/zh/': { sidebar: $_$1, nav: $_$2 } }`,
    2
  );

  console.log('result', result);

  return;
  while (confList.length) {
    let item = confList.pop();
    if (typeof item === 'string') {
      paths.push(item);
    } else {
      let { children = [], items = [] } = item;
      confList.push(...children, ...items);
    }
  }

  // api 在 nav 怎么办中

  list.map(path => {
    let purePath = path
      .split('/')
      .filter(part => !['.', '..'].includes(part) || !part.startsWith('#'))
      .join('/');

    console.log('purePath', purePath);

    // confList.find()
  });

  console.log('paths', paths);

  console.log('list', list);
}

/**
 * 对于 vue-router
 * 1. '../' 是到哪里的导航？ - 需要具体到文章，已知有 guide / api /
 * 2. '../../' 哪里的导航？
 *
 * 文章引用路径，都在文档配置中；
 * 然后拼接一个域名 https://v3.router.vuejs.org/
 */

main('./vue-router-all-zh-docs.md');
