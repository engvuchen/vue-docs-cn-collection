# Vue-Docs-Cn-Collection

## 前言

最近在看 Vue 以及周边生态库的文档，打算过一遍，发现：

1. 不好把握阅读进度。侧栏的每一章节都是闭合的，没有点开前不知道还有多少未读；

2. 整理内容比较麻烦。每一篇文章都是独立出来的，阅读压力较小，但当需要归纳某一个知识点时，往往需要查阅多篇文章，整理不易；

3. 文档结构较统一。文档基本都由 [vitepress](https://vitepress.dev/guide/what-is-vitepress) 搭建；

遂萌生出“整合文档”的想法，如果合并仓库中的所有内容为单个 MD 文件，把控阅读进度、整理内容应该都能满足。

## 使用

1. 依赖：项目最近一次跑通使用 `node 14.21.3`；

2. 启用：

```bash
npm install
npm start
```

示例图：

![选择文档仓库](https://engvu.oss-cn-shenzhen.aliyuncs.com/e174a65f64054b173be3df04e1a9e543.webp)

![执行成功的提示](https://engvu.oss-cn-shenzhen.aliyuncs.com/4fdd0ff34e032138a3610f59227bcdd8.webp)

## 注意点

1. `npm install` 完成之后，自动执行 `git submodule update --init`，命令执行成功与否看梯子是否给力；

2. `git submodule update --init` 如果执行失败，只能手动 clone 相关仓库地址了。

vue-router: https://github.com/vuejs/vue-router
vuex: https://github.com/vuejs/vuex
pinia: https://github.com/vuejs/pinia
