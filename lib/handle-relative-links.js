/**
 * 处理“已汇总文章”中的链接：
 * 1. 🟩 MD 引用链接 - 例如：[test](./test.md) 、/ssr/nuxt.md
 * 1.1 不处理 https 链接，仅处理相对引用链接（例：../api/#test）
 * 1.2 目前相对引用链接在文档配置中的 nav / guide 中寻找，可能会有找不到的情况；
 * 2. ⬜️ MD 图片
 * 3. img 标签图片
 *
 * 思路：
 * 处理例如 '#test' 开头的链接，需要附加上本次读取文章的路径；
 * 文章以 MD 结尾，在线文章链接一般无后缀或后缀为 md、html；
 */
const nodePath = require('path');
const { hostMap, imgOnlineMap, handlePathDiffInOnlineAndFile } = require('./util');
// let linkReg = /(?<=!{0,1}\[.+?\])\(((?!http)(?![=>()<]).+?)\)/g; // 匹配相对引用链接
let linkReg = /(?<=!{0,1}\[.+?\])\(((?!http)(?![=>()<]).+?)\)/g; // 匹配相对引用链接；⬜️ 优化 [0-9a-zA-Z\u4e00-\u9fa5./#-] 对于 [] 内的匹配
let imgReg = /<img.+?src="(.+)"[/]?>/g;

/**
 *  处理文章相对路径
 * （1）../test#abc
 * （2）../test.(md|html)
 * （3）图片
 *
 * @param {String} str 文章字符串
 * @param {String} oriPageConfPath 当前被处理文章的配置路径
 * @param {String} pkgName 包名
 * @param {String} fullPath 读取 MD 文件的路径
 * @returns
 */
async function main(str = '', oriPageConfPath = '', pkgName = '', fullPath = '') {
  if (!str) return console.log('没有内容');
  let list = Array.from(str.matchAll(linkReg), m => m[1]);
  list = Array.from(new Set(list));
  let imgTagList = Array.from(str.matchAll(imgReg), m => m[1]);
  list.push(...imgTagList);
  // if (list.length) console.log(pkgName, list.length, list);

  let resultList = [];
  let host = hostMap[pkgName];
  list.forEach(async path => {
    // （1）去掉路径中的相对路径、文件尾缀： './sidebar' => ‘sidebar’;  vueprees/vitepress 都支持隐藏地址栏的 md
    let pathWithoutRelative = path.replace(/[.]{1,2}[/]/g, '').replace(/[.](md|html)/g, '');
    // （2）以 # 开头，链接处理定位为本篇文章
    let isHash = pathWithoutRelative[0] === '#';
    if (isHash) {
      let list = [oriPageConfPath];
      handlePathDiffInOnlineAndFile(list, pkgName);
      let [newPath] = list;
      resultList.push(`${host}${newPath}${path}`);
      return;
    }
    // （3）处理图片
    let isImg = ['.png', '.jpg', '.svg'].find(suffix => pathWithoutRelative.endsWith(suffix));
    if (isImg) {
      let imgOnlineLink = imgOnlineMap[pkgName][pathWithoutRelative] || path;
      resultList.push(imgOnlineLink);
      return;
    }
    // （4）取出 'api#test' 中的 'api'、'#test'
    let [, purePath = '', hash = ''] = /([a-zA-Z0-9-_/.]+)(#.+)*/.exec(path) || [];
    let referPagePath = '';
    switch (purePath[0]) {
      case '.': {
        // 处理相对路径
        referPagePath = getRelativePath(fullPath, purePath);
        break;
      }
      case '/': {
        // 基本以 zh 为文档根目录。例 /ssr/nuxt => 实际在线需为 /zh/ssr/nuxt
        referPagePath = `/zh${purePath}`;
        break;
      }
      default: {
        // 例 vue-router meta.md 也需要进行相对路径处理
        referPagePath = getRelativePath(fullPath, purePath);
        break;
      }
    }
    referPagePath = referPagePath.slice(referPagePath.indexOf('/zh')); // 仅需保留 /zh 开头的部分
    resultList.push(`${host}${referPagePath.replace('.md', '')}${hash}`);
  });
  // 替换原始链接 todo
  list.forEach((originLink, index) => {
    let link = resultList[index];
    str = replaceLink(originLink, link, str);
  });
  // console.log(pkgName, 'links:', resultList);

  // 🟩 验证使用。查看链接是否可导航，谨慎，会打开大量链接
  // resultList.forEach(url => {
  //   openUrlInBrowser(url);
  // });
  return str;
}
function getRelativePath(fullPath, purePath = '') {
  // 去掉末尾 MD 文件的部分；nodePath.resolve 会把文件名当成目录
  let newFullPath = fullPath.replace(/[/][^/]+[.]md$/, ''); // 'a/b/c.md' => 'a/b'
  return nodePath.resolve(newFullPath, purePath);
}
function replaceLink(originLink, newLink, str) {
  originLink = originLink.replace(/[.]/g, '[.]');
  let reg = new RegExp(`(?<!{)${originLink}(?!})`, 'g');
  let result = str.replace(reg, newLink);
  return result;
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
