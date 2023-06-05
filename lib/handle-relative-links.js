/**
 * 处理“已汇总文章”中的链接：
 * 1. 🟩 MD 引用链接 - 例如：[test](./test.md)
 * 1.1 不处理 https 链接，仅处理相对引用链接（例：../api/#test）
 * 1.2 目前相对引用链接在文档配置中的 nav / guide 中寻找，可能会有找不到的情况；
 * 2. ⬜️ MD 图片
 * 3. img 标签图片
 *
 * 思路：
 * 处理例如 '#test' 开头的链接，需要附加上本次读取文章的路径；
 * 文章以 MD 结尾，在线文章链接一般无后缀或后缀为 md、html；
 */
const { handlePathDiffInOnlineAndFile } = require('./util');
// let linkReg = /(?<=!{0,1}\[.+?\])\(((?!http)(?![=>()<]).+?)\)/g; // 匹配相对引用链接
let linkReg = /(?<=!{0,1}\[.+?\])\(((?!http)(?![=>()<]).+?)\)/g; // 匹配相对引用链接；⬜️ 优化 [0-9a-zA-Z\u4e00-\u9fa5./#-] 对于 [] 内的匹配
let imgReg = /<img.+?src="(.+)"[/]?>/g;

let hostMap = {
  vuex: 'https://vuex.vuejs.org',
  'vue-router': 'https://v3.router.vuejs.org',
  // '@pinia/root': 'https://pinia.vuejs.org/zh',
  // 'vite-docs-cn': 'https://cn.vitejs.dev',
  // '': 'https://cn.vuejs.org/', // vue3 中文文档独立，且没有 name
};
let imgOnlineMap = {
  vuex: {
    '/flow.png': 'https://vuex.vuejs.org/flow.png',
    '/vuex.png': 'https://vuex.vuejs.org/vuex.png',
  },
  // 'vue-router': {}
};
/**
 *  处理文章相对路径
 * （1）../test#abc
 * （2）../test.(md|html)
 * （3）图片
 *
 * @param {String} str 文章字符串
 * @param {String} oriPageConfPath 当前被处理文章的配置路径
 * @param {String} paths 配置涉及的所有文章路径，用于相对引用
 * @param {String} pkgName 包名
 * @returns
 */
async function main(str = '', oriPageConfPath = '', paths = [], pkgName) {
  if (!str) return console.log('没有内容');
  let list = Array.from(str.matchAll(linkReg), m => m[1]);
  let imgTagList = Array.from(str.matchAll(imgReg), m => m[1]);
  list.push(...imgTagList);
  if (list.length) console.log(pkgName, list.length, list);

  let host = hostMap[pkgName];
  let result = list.reduce((arr, path) => {
    // 去掉路径中的相对路径、文件尾缀： './sidebar' => ‘sidebar’;  vue/vite 都支持隐藏地址栏的 md
    let pathWithoutRelative = path.replace(/[.]{1,2}[/]/g, '').replace(/[.](md|html)/g, '');
    // 以 # 开头，链接处理定位为本篇文章
    let isHash = pathWithoutRelative.startsWith('#');
    if (isHash) {
      let list = [oriPageConfPath];
      handlePathDiffInOnlineAndFile(list, pkgName);
      let [newPath] = list;
      let result = `${host}${newPath}${path}`;
      arr.push(result);
      return arr;
    }
    // 处理图片
    let isImg = ['.png', '.jpg', '.svg'].find(suffix => pathWithoutRelative.endsWith(suffix));
    if (isImg) {
      let imgOnlineLink = imgOnlineMap[pkgName][pathWithoutRelative] || path;
      arr.push(imgOnlineLink);
      return arr;
    }
    // 取出 'api#test' 中的 'api'、'#test'
    let [, purePath = '', hash = ''] =  /([a-zA-Z0-9-_/]+)(#.+)*/.exec(pathWithoutRelative) || [];
    /**
     * vite:
     * 1. 存在本页导航 #glob-import
     * 2. vite 既有 './config'，也有 '.html' 的地址栏，不统一
     */
    let found = paths.find(currPath => currPath.includes(purePath));
    if (found) arr.push(`${host}${found.replace(/[.]md/, '')}${hash}`);
    return arr;
  }, []);

  // 替换原始链接
  list.forEach((originLink, index) => {
    str = str.replace(originLink, result[index]);
  });
  // console.log('links', result);

  // 验证使用。查看链接是否可导航
  result.forEach(url => {
    openUrlInBrowser(url);
  });

  return str;
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
