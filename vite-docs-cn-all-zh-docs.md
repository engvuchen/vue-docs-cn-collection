# 指引

## 为什么选 Vite

### 为什么选 Vite {###why-vite}

#### 现实问题 {###the-problems}

在浏览器支持 ES 模块之前，JavaScript 并没有提供原生机制让开发者以模块化的方式进行开发。这也正是我们对 “打包” 这个概念熟悉的原因：使用工具抓取、处理并将我们的源码模块串联成可以在浏览器中运行的文件。

时过境迁，我们见证了诸如 [webpack](https://webpack.js.org/)、[Rollup](https://rollupjs.org) 和 [Parcel](https://parceljs.org/) 等工具的变迁，它们极大地改善了前端开发者的开发体验。

然而，当我们开始构建越来越大型的应用时，需要处理的 JavaScript 代码量也呈指数级增长。包含数千个模块的大型项目相当普遍。基于 JavaScript 开发的工具就会开始遇到性能瓶颈：通常需要很长时间（甚至是几分钟！）才能启动开发服务器，即使使用模块热替换（HMR），文件修改后的效果也需要几秒钟才能在浏览器中反映出来。如此循环往复，迟钝的反馈会极大地影响开发者的开发效率和幸福感。

Vite 旨在利用生态系统中的新进展解决上述问题：浏览器开始原生支持 ES 模块，且越来越多 JavaScript 工具使用编译型语言编写。

##### 缓慢的服务器启动 {###slow-server-start}

当冷启动开发服务器时，基于打包器的方式启动必须优先抓取并构建你的整个应用，然后才能提供服务。

Vite 通过在一开始将应用中的模块区分为 **依赖** 和 **源码** 两类，改进了开发服务器启动时间。

- **依赖** 大多为在开发时不会变动的纯 JavaScript。一些较大的依赖（例如有上百个模块的组件库）处理的代价也很高。依赖也通常会存在多种模块化格式（例如 ESM 或者 CommonJS）。

  Vite 将会使用 [esbuild](https://esbuild.github.io/) [预构建依赖](./dep-pre-bundling)。esbuild 使用 Go 编写，并且比以 JavaScript 编写的打包器预构建依赖快 10-100 倍。

- **源码** 通常包含一些并非直接是 JavaScript 的文件，需要转换（例如 JSX，CSS 或者 Vue/Svelte 组件），时常会被编辑。同时，并不是所有的源码都需要同时被加载（例如基于路由拆分的代码模块）。

  Vite 以 [原生 ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) 方式提供源码。这实际上是让浏览器接管了打包程序的部分工作：Vite 只需要在浏览器请求源码时进行转换并按需提供源码。根据情景动态导入代码，即只在当前屏幕上实际使用时才会被处理。

<script setup>
import bundlerSvg from '../images/bundler.svg?raw'
import esmSvg from '../images/esm.svg?raw'
</script>
<svg-image :svg="bundlerSvg" />
<svg-image :svg="esmSvg" />

##### 缓慢的更新 {###slow-updates}

基于打包器启动时，重建整个包的效率很低。原因显而易见：因为这样更新速度会随着应用体积增长而直线下降。

一些打包器的开发服务器将构建内容存入内存，这样它们只需要在文件更改时使模块图的一部分失活<sup>[[1]](###footnote-1)</sup>，但它也仍需要整个重新构建并重载页面。这样代价很高，并且重新加载页面会消除应用的当前状态，所以打包器支持了动态模块热替换（HMR）：允许一个模块 “热替换” 它自己，而不会影响页面其余部分。这大大改进了开发体验 —— 然而，在实践中我们发现，即使采用了 HMR 模式，其热更新速度也会随着应用规模的增长而显著下降。

在 Vite 中，HMR 是在原生 ESM 上执行的。当编辑一个文件时，Vite 只需要精确地使已编辑的模块与其最近的 HMR 边界之间的链失活<sup>[[1]](###footnote-1)</sup>（大多数时候只是模块本身），使得无论应用大小如何，HMR 始终能保持快速更新。

Vite 同时利用 HTTP 头来加速整个页面的重新加载（再次让浏览器为我们做更多事情）：源码模块的请求会根据 `304 Not Modified` 进行协商缓存，而依赖模块请求则会通过 `Cache-Control: max-age=31536000,immutable` 进行强缓存，因此一旦被缓存它们将不需要再次请求。

一旦你体验到 Vite 的神速，你是否愿意再忍受像曾经那样使用打包器开发就要打上一个大大的问号了。

#### 为什么生产环境仍需打包 {###why-bundle-for-production}

尽管原生 ESM 现在得到了广泛支持，但由于嵌套导入会导致额外的网络往返，在生产环境中发布未打包的 ESM 仍然效率低下（即使使用 HTTP/2）。为了在生产环境中获得最佳的加载性能，最好还是将代码进行 tree-shaking、懒加载和 chunk 分割（以获得更好的缓存）。

要确保开发服务器和生产环境构建之间的最优输出和行为一致并不容易。所以 Vite 附带了一套 [构建优化](./features###build-optimizations) 的 [构建命令](./build)，开箱即用。

##### 为何不用 ESBuild 打包？ {###why-not-bundle-with-esbuild}

Vite 目前的插件 API 与使用 `esbuild` 作为打包器并不兼容。尽管 `esbuild` 速度更快，但 Vite 采用了 Rollup 灵活的插件 API 和基础建设，这对 Vite 在生态中的成功起到了重要作用。目前来看，我们认为 Rollup 提供了更好的性能与灵活性方面的权衡。

即便如此，`esbuild` 在过去几年有了很大进展，我们不排除在未来使用 `esbuild` 进行生产构建的可能性。我们将继续利用他们所发布的新功能，就像我们在 JS 和 CSS 最小化压缩方面所做的那样，`esbuild` 使 Vite 在避免对其生态造成干扰的同时获得了性能提升。

#### Vite 与 X 的区别是？ {###how-is-vite-different-from-x}

你可以查看 [比较](./comparisons) 章节获取更多细节，了解 Vite 与同类工具的异同。

<small class="cn-footnote">
<br/>
<strong class="title">译者注</strong>
<a id="footnote-1"></a>[1] 暂以意译方式呈现。
</small>


## 开始

### 开始 {###getting-started}

<audio id="vite-audio">
  <source src="/vite.mp3" type="audio/mpeg">
</audio>

#### 总览 {###overview}

Vite（法语意为 "快速的"，发音 `/vit/`<button id="play-vite-audio" onclick="document.getElementById('vite-audio').play();" style="border: none; padding: 3px; border-radius: 4px; vertical-align: bottom;"><svg style="height:2em;width:2em"><use href="/voice.svg###voice" /></svg></button>，发音同 "veet"）是一种新型前端构建工具，能够显著提升前端开发体验。它主要由两部分组成：

- 一个开发服务器，它基于 [原生 ES 模块](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) 提供了 [丰富的内建功能](./features)，如速度快到惊人的 [模块热更新（HMR）](./features###hot-module-replacement)。

- 一套构建指令，它使用 [Rollup](https://rollupjs.org) 打包你的代码，并且它是预配置的，可输出用于生产环境的高度优化过的静态资源。

Vite 意在提供开箱即用的配置，同时它的 [插件 API](./api-plugin) 和 [JavaScript API](./api-javascript) 带来了高度的可扩展性，并有完整的类型支持。

你可以在 [为什么选 Vite](./why) 中了解更多关于项目的设计初衷。

#### 浏览器支持 {###browser-support}

默认的构建目标是能支持 [原生 ESM 语法的 script 标签](https://caniuse.com/es6-module)、[原生 ESM 动态导入](https://caniuse.com/es6-module-dynamic-import) 和 [`import.meta`](https://caniuse.com/mdn-javascript_operators_import_meta) 的浏览器。传统浏览器可以通过官方插件 [@vitejs/plugin-legacy](https://github.com/vitejs/vite/tree/main/packages/plugin-legacy) 支持 —— 查看 [构建生产版本](./build) 章节获取更多细节。

#### 在线试用 Vite {###trying-vite-online}

你可以通过 [StackBlitz](https://vite.new/) 在线试用 vite。它直接在浏览器中运行基于 Vite 的构建，因此它与本地开发几乎无差别，同时无需在你的机器上安装任何东西。你可以浏览 `vite.new/{template}` 来选择你要使用的框架。

目前支持的模板预设如下：

|             JavaScript              |                TypeScript                 |
| :---------------------------------: | :---------------------------------------: |
| [vanilla](https://vite.new/vanilla) | [vanilla-ts](https://vite.new/vanilla-ts) |
|     [vue](https://vite.new/vue)     |     [vue-ts](https://vite.new/vue-ts)     |
|   [react](https://vite.new/react)   |   [react-ts](https://vite.new/react-ts)   |
|  [preact](https://vite.new/preact)  |  [preact-ts](https://vite.new/preact-ts)  |
|     [lit](https://vite.new/lit)     |     [lit-ts](https://vite.new/lit-ts)     |
|  [svelte](https://vite.new/svelte)  |  [svelte-ts](https://vite.new/svelte-ts)  |

#### 搭建第一个 Vite 项目 {###scaffolding-your-first-vite-project}

::: tip 兼容性注意
Vite 需要 [Node.js](https://nodejs.org/en/) 版本 14.18+，16+。然而，有些模板需要依赖更高的 Node 版本才能正常运行，当你的包管理器发出警告时，请注意升级你的 Node 版本。
:::

使用 NPM:

```bash
$ npm create vite@latest
```

使用 Yarn:

```bash
$ yarn create vite
```

使用 PNPM:

```bash
$ pnpm create vite
```

然后按照提示操作即可！

你还可以通过附加的命令行选项直接指定项目名称和你想要使用的模板。例如，要构建一个 Vite + Vue 项目，运行:

```bash
### npm 6.x
npm create vite@latest my-vue-app --template vue

### npm 7+, extra double-dash is needed:
npm create vite@latest my-vue-app -- --template vue

### yarn
yarn create vite my-vue-app --template vue

### pnpm
pnpm create vite my-vue-app --template vue
```

查看 [create-vite](https://github.com/vitejs/vite/tree/main/packages/create-vite) 以获取每个模板的更多细节：`vanilla`，`vanilla-ts`, `vue`, `vue-ts`，`react`，`react-ts`，`react-swc`，`react-swc-ts`，`preact`，`preact-ts`，`lit`，`lit-ts`，`svelte`，`svelte-ts`。

#### 社区模板 {###community-templates}

create-vite 是一个快速生成主流框架基础模板的工具。查看 Awesome Vite 仓库的 [社区维护模板](https://github.com/vitejs/awesome-vite###templates)，里面包含各种工具和不同框架的模板。你可以用如 [degit](https://github.com/Rich-Harris/degit) 之类的工具，使用社区模版来搭建项目。

```bash
npx degit user/project my-project
cd my-project

npm install
npm run dev
```

如果该项目使用 `main` 作为默认分支, 需要在项目名后添加 `###main`。

```bash
npx degit user/project###main my-project
```

#### `index.html` 与项目根目录 {###index-html-and-project-root}

你可能已经注意到，在一个 Vite 项目中，`index.html` 在项目最外层而不是在 `public` 文件夹内。这是有意而为之的：在开发期间 Vite 是一个服务器，而 `index.html` 是该 Vite 项目的入口文件。

Vite 将 `index.html` 视为源码和模块图的一部分。Vite 解析 `<script type="module" src="...">` ，这个标签指向你的 JavaScript 源码。甚至内联引入 JavaScript 的 `<script type="module">` 和引用 CSS 的 `<link href>` 也能利用 Vite 特有的功能被解析。另外，`index.html` 中的 URL 将被自动转换，因此不再需要 `%PUBLIC_URL%` 占位符了。

与静态 HTTP 服务器类似，Vite 也有 “根目录” 的概念，即服务文件的位置，在接下来的文档中你将看到它会以 `<root>` 代称。源码中的绝对 URL 路径将以项目的 “根” 作为基础来解析，因此你可以像在普通的静态文件服务器上一样编写代码（并且功能更强大！）。Vite 还能够处理依赖关系，解析处于根目录外的文件位置，这使得它即使在基于 monorepo 的方案中也十分有用。

Vite 也支持多个 `.html` 作入口点的 [多页面应用模式](./build###multi-page-app)。

###### 指定替代根目录 {###specifying-alternative-root}

`vite` 以当前工作目录作为根目录启动开发服务器。你也可以通过 `vite serve some/sub/dir` 来指定一个替代的根目录。

#### 命令行界面 {###command-line-interface}

在安装了 Vite 的项目中，可以在 npm scripts 中使用 `vite` 可执行文件，或者直接使用 `npx vite` 运行它。下面是通过脚手架创建的 Vite 项目中默认的 npm scripts：

<!-- prettier-ignore -->
```json
{
  "scripts": {
    "dev": "vite", // 启动开发服务器，别名：`vite dev`，`vite serve`
    "build": "vite build", // 为生产环境构建产物
    "preview": "vite preview" // 本地预览生产构建产物
  }
}
```

可以指定额外的命令行选项，如 `--port` 或 `--https`。运行 `npx vite --help` 获得完整的命令行选项列表。

查看 [命令行界面](./cli.md) 了解更多细节。

#### 使用未发布的功能 {###using-unreleased-commits}

如果你迫不及待想要体验最新的功能，可以自行克隆 [vite 仓库](https://github.com/vitejs/vite) 到本地机器上然后自行将其链接（将需要 [pnpm](https://pnpm.io/)）：

```bash
git clone https://github.com/vitejs/vite.git
cd vite
pnpm install
cd packages/vite
pnpm run build
pnpm link --global ### 在这一步中可使用你喜欢的包管理器
```

然后，回到你的 Vite 项目并运行 `pnpm link --global vite`（或者使用你的其他包管理工具来全局链接 `vite`）。重新启动开发服务器来体验新功能吧！

#### 社区 {###community}

如果你有疑问或者需要帮助，可以到 [Discord](https://chat.vitejs.dev) 和 [GitHub Discussions](https://github.com/vitejs/vite/discussions) 社区来寻求帮助。


## 功能

### 功能 {###features}

对非常基础的使用来说，使用 Vite 开发和使用一个静态文件服务器并没有太大区别。然而，Vite 还通过原生 ESM 导入提供了许多主要用于打包场景的增强功能。

#### NPM 依赖解析和预构建 {###npm-dependency-resolving-and-pre-bundling}

原生 ES 导入不支持下面这样的裸模块导入：

```js
import { someMethod } from 'my-dep'
```

上面的代码会在浏览器中抛出一个错误。Vite 将会检测到所有被加载的源文件中的此类裸模块导入，并执行以下操作:

1. [预构建](./dep-pre-bundling) 它们可以提高页面加载速度，并将 CommonJS / UMD 转换为 ESM 格式。预构建这一步由 [esbuild](http://esbuild.github.io/) 执行，这使得 Vite 的冷启动时间比任何基于 JavaScript 的打包器都要快得多。

2. 重写导入为合法的 URL，例如 `/node_modules/.vite/deps/my-dep.js?v=f3sf2ebd` 以便浏览器能够正确导入它们。

**依赖是强缓存的**

Vite 通过 HTTP 头来缓存请求得到的依赖，所以如果你想要编辑或调试一个依赖，请按照 [这里](./dep-pre-bundling###浏览器缓存) 的步骤操作。

#### 模块热替换 {###hot-module-replacement}

Vite 提供了一套原生 ESM 的 [HMR API](./api-hmr)。 具有 HMR 功能的框架可以利用该 API 提供即时、准确的更新，而无需重新加载页面或清除应用程序状态。Vite 内置了 HMR 到 [Vue 单文件组件（SFC）](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue) 和 [React Fast Refresh](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react) 中。也通过 [@prefresh/vite](https://github.com/JoviDeCroock/prefresh/tree/main/packages/vite) 对 Preact 实现了官方集成。

注意，你不需要手动设置这些 —— 当你通过 [`create-vite`](./) 创建应用程序时，所选模板已经为你预先配置了这些。

#### TypeScript {###typescript}

Vite 天然支持引入 `.ts` 文件。

##### 仅执行转译 {###transpile-only}

请注意，Vite 仅执行 `.ts` 文件的转译工作，**并不执行** 任何类型检查。并假定类型检查已经被你的 IDE 或构建过程处理了。

Vite 之所以不把类型检查作为转换过程的一部分，是因为这两项工作在本质上是不同的。转译可以在每个文件的基础上进行，与 Vite 的按需编译模式完全吻合。相比之下，类型检查需要了解整个模块图。把类型检查塞进 Vite 的转换管道，将不可避免地损害 Vite 的速度优势。

Vite 的工作是尽可能快地将源模块转化为可以在浏览器中运行的形式。为此，我们建议将静态分析检查与 Vite 的转换管道分开。这一原则也适用于其他静态分析检查，例如 ESLint。

- 在构建生产版本时，你可以在 Vite 的构建命令之外运行 `tsc --noEmit`。

- 在开发时，如果你需要更多的 IDE 提示，我们建议在一个单独的进程中运行 `tsc --noEmit --watch`，或者如果你喜欢在浏览器中直接看到上报的类型错误，可以使用 [vite-plugin-checker](https://github.com/fi3ework/vite-plugin-checker)。

Vite 使用 [esbuild](https://github.com/evanw/esbuild) 将 TypeScript 转译到 JavaScript，约是 `tsc` 速度的 20~30 倍，同时 HMR 更新反映到浏览器的时间小于 50ms。

使用 [仅含类型的导入和导出](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html###type-only-imports-and-export) 形式的语法可以避免潜在的 “仅含类型的导入被不正确打包” 的问题，写法示例如下：

```ts
import type { T } from 'only/types'
export type { T }
```

##### TypeScript 编译器选项 {###typescript-compiler-options}

`tsconfig.json` 中 `compilerOptions` 下的一些配置项需要特别注意。

###### `isolatedModules`

应该设置为 `true`。

这是因为 `esbuild` 只执行没有类型信息的转译，它并不支持某些特性，如 `const enum` 和隐式类型导入。

你必须在 `tsconfig.json` 中的 `compilerOptions` 下设置 `"isolatedModules": true`。如此做，TS 会警告你不要使用隔离（isolated）转译的功能。

然而，一些库（如：[`vue`](https://github.com/vuejs/core/issues/1228)）不能很好地与 `"isolatedModules": true` 共同工作。你可以在上游仓库修复好之前暂时使用 `"skipLibCheck": true` 来缓解这个错误。

###### `useDefineForClassFields`

从 Vite v2.5.0 开始，如果 TypeScript 的 target 是 `ESNext` 或 `ES2022` 及更新版本，此选项默认值则为 `true`。这与 [`tsc` v4.3.2 及以后版本的行为](https://github.com/microsoft/TypeScript/pull/42663) 一致。这也是标准的 ECMAScript 的运行时行为。

但对于那些习惯其他编程语言或旧版本 TypeScript 的开发者来说，这可能是违反直觉的。
你可以参阅 [TypeScript 3.7 发布日志](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html###the-usedefineforclassfields-flag-and-the-declare-property-modifier) 中了解更多关于如何兼容的信息。

如果你正在使用一个严重依赖 class fields 的库，请注意该库对此选项的预期设置。

大多数库都希望 `"useDefineForClassFields": true`，如 [MobX](https://mobx.js.org/installation.html###use-spec-compliant-transpilation-for-class-properties)。

但是有几个库还没有兼容这个新的默认值，其中包括 [`lit-element`](https://github.com/lit/lit-element/issues/1030)。如果遇到这种情况，请将 `useDefineForClassFields` 设置为 `false`。

###### 影响构建结果的其他编译器选项 {###other-compiler-options-affecting-the-build-result}

- [`extends`](https://www.typescriptlang.org/tsconfig###extends)
- [`importsNotUsedAsValues`](https://www.typescriptlang.org/tsconfig###importsNotUsedAsValues)
- [`preserveValueImports`](https://www.typescriptlang.org/tsconfig###preserveValueImports)
- [`jsxFactory`](https://www.typescriptlang.org/tsconfig###jsxFactory)
- [`jsxFragmentFactory`](https://www.typescriptlang.org/tsconfig###jsxFragmentFactory)

如果你的代码库很难迁移到 `"isolatedModules": true`，或许你可以尝试通过第三方插件来解决，比如 [rollup-plugin-friendly-type-imports](https://www.npmjs.com/package/rollup-plugin-friendly-type-imports)。但是，这种方式不被 Vite 官方支持。

##### 客户端类型 {###client-types}

Vite 默认的类型定义是写给它的 Node.js API 的。要将其补充到一个 Vite 应用的客户端代码环境中，请添加一个 `d.ts` 声明文件：

```typescript
/// <reference types="vite/client" />
```

或者，你也可以将 `vite/client` 添加到 `tsconfig.json` 中的 `compilerOptions.types` 下：

```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

这将会提供以下类型定义补充：

- 资源导入 (例如：导入一个 `.svg` 文件)
- `import.meta.env` 上 Vite 注入的环境变量的类型定义
- `import.meta.hot` 上的 [HMR API](./api-hmr) 类型定义

::: tip
要覆盖默认的类型定义，请添加一个包含你所定义类型的文件，请在三斜线注释 reference `vite/client` 前添加定义。

例如，要为 React 组件中的 `*.svg` 文件定义类型：

- `vite-env-override.d.ts` (the file that contains your typings):
  ```ts
  declare module '*.svg' {
    const content: React.FC<React.SVGProps<SVGElement>>
    export default content
  }
  ```
- The file containing the reference to `vite/client`:
  ```ts
  /// <reference types="./vite-env-override.d.ts" />
  /// <reference types="vite/client" />
  ```

:::

#### Vue {###vue}

Vite 为 Vue 提供第一优先级支持：

- Vue 3 单文件组件支持：[@vitejs/plugin-vue](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue)
- Vue 3 JSX 支持：[@vitejs/plugin-vue-jsx](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue-jsx)
- Vue 2.7 支持：[vitejs/vite-plugin-vue2](https://github.com/vitejs/vite-plugin-vue2)
- Vue <2.7 的支持：[underfin/vite-plugin-vue2](https://github.com/underfin/vite-plugin-vue2)

#### JSX {###jsx}

`.jsx` 和 `.tsx` 文件同样开箱即用。JSX 的转译同样是通过 [esbuild](https://esbuild.github.io)。

Vue 用户应使用官方提供的 [@vitejs/plugin-vue-jsx](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue-jsx) 插件，它提供了 Vue 3 特性的支持，包括 HMR，全局组件解析，指令和插槽。

如果不是在 React 或 Vue 中使用 JSX，自定义的 `jsxFactory` 和 `jsxFragment` 可以使用 [`esbuild` 选项](/config/shared-options.md###esbuild) 进行配置。例如对 Preact：

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
})
```

更多细节详见 [esbuild 文档](https://esbuild.github.io/content-types/###jsx).

你可以使用 `jsxInject`（这是一个仅在 Vite 中使用的选项）为 JSX 注入 helper，以避免手动导入：

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
})
```

#### CSS {###css}

导入 `.css` 文件将会把内容插入到 `<style>` 标签中，同时也带有 HMR 支持。也能够以字符串的形式检索处理后的、作为其模块默认导出的 CSS。

##### `@import` 内联和变基 {###import-inlining-and-rebasing}

Vite 通过 `postcss-import` 预配置支持了 CSS `@import` 内联，Vite 的路径别名也遵从 CSS `@import`。换句话说，所有 CSS `url()` 引用，即使导入的文件在不同的目录中，也总是自动变基，以确保正确性。

Sass 和 Less 文件也支持 `@import` 别名和 URL 变基（具体请参阅 [CSS Pre-processors](###css-pre-processors)）。

##### PostCSS {###postcss}

如果项目包含有效的 PostCSS 配置 (任何受 [postcss-load-config](https://github.com/postcss/postcss-load-config) 支持的格式，例如 `postcss.config.js`)，它将会自动应用于所有已导入的 CSS。

请注意，CSS 最小化压缩将在 PostCSS 之后运行，并会使用 [`build.cssTarget`](/config/build-options.md###build-csstarget) 选项。

##### CSS Modules {###css-modules}

任何以 `.module.css` 为后缀名的 CSS 文件都被认为是一个 [CSS modules 文件](https://github.com/css-modules/css-modules)。导入这样的文件会返回一个相应的模块对象：

```css
/* example.module.css */
.red {
  color: red;
}
```

```js
import classes from './example.module.css'
document.getElementById('foo').className = classes.red
```

CSS modules 行为可以通过 [`css.modules` 选项](/config/shared-options.md###css-modules) 进行配置。

如果 `css.modules.localsConvention` 设置开启了 camelCase 格式变量名转换（例如 `localsConvention: 'camelCaseOnly'`），你还可以使用按名导入。

```js
// .apply-color -> applyColor
import { applyColor } from './example.module.css'
document.getElementById('foo').className = applyColor
```

##### CSS 预处理器 {###css-pre-processors}

由于 Vite 的目标仅为现代浏览器，因此建议使用原生 CSS 变量和实现 CSSWG 草案的 PostCSS 插件（例如 [postcss-nesting](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting)）来编写简单的、符合未来标准的 CSS。

话虽如此，但 Vite 也同时提供了对 `.scss`, `.sass`, `.less`, `.styl` 和 `.stylus` 文件的内置支持。没有必要为它们安装特定的 Vite 插件，但必须安装相应的预处理器依赖：

```bash
### .scss and .sass
npm add -D sass

### .less
npm add -D less

### .styl and .stylus
npm add -D stylus
```

如果使用的是单文件组件，可以通过 `<style lang="sass">`（或其他预处理器）自动开启。

Vite 为 Sass 和 Less 改进了 `@import` 解析，以保证 Vite 别名也能被使用。另外，`url()` 中的相对路径引用的，与根文件不同目录中的 Sass/Less 文件会自动变基以保证正确性。

由于 Stylus API 限制，`@import` 别名和 URL 变基不支持 Stylus。

你还可以通过在文件扩展名前加上 `.module` 来结合使用 CSS modules 和预处理器，例如 `style.module.scss`。

##### 禁用 CSS 注入页面 {###disabling-css-injection-into-the-page}

自动注入 CSS 内容的行为可以通过 `?inline` 参数来关闭。在关闭时，被处理过的 CSS 字符串将会作为该模块的默认导出，但样式并没有被注入到页面中。

```js
import './foo.css' // 样式将会注入页面
import otherStyles from './bar.css?inline' // 样式不会注入页面
```

::: tip 注意
自 Vite 4 起，CSS 文件的默认导入和按名导入（例如 `import style from './foo.css'`）将弃用。请使用 `?inline` 参数代替。
:::

#### 静态资源处理 {###static-assets}

导入一个静态资源会返回解析后的 URL：

```js
import imgUrl from './img.png'
document.getElementById('hero-img').src = imgUrl
```

添加一些特殊的查询参数可以更改资源被引入的方式：

```js
// 显式加载资源为一个 URL
import assetAsURL from './asset.js?url'
```

```js
// 以字符串形式加载资源
import assetAsString from './shader.glsl?raw'
```

```js
// 加载为 Web Worker
import Worker from './worker.js?worker'
```

```js
// 在构建时 Web Worker 内联为 base64 字符串
import InlineWorker from './worker.js?worker&inline'
```

更多细节请见 [静态资源处理](./assets)。

#### JSON {###json}

JSON 可以被直接导入 —— 同样支持具名导入：

```js
// 导入整个对象
import json from './example.json'
// 对一个根字段使用具名导入 —— 有效帮助 treeshaking！
import { field } from './example.json'
```

#### Glob 导入 {###glob-import}

Vite 支持使用特殊的 `import.meta.glob` 函数从文件系统导入多个模块：

```js
const modules = import.meta.glob('./dir/*.js')
```

以上将会被转译为下面的样子：

```js
// vite 生成的代码
const modules = {
  './dir/foo.js': () => import('./dir/foo.js'),
  './dir/bar.js': () => import('./dir/bar.js'),
}
```

你可以遍历 `modules` 对象的 key 值来访问相应的模块：

```js
for (const path in modules) {
  modules[path]().then((mod) => {
    console.log(path, mod)
  })
}
```

匹配到的文件默认是懒加载的，通过动态导入实现，并会在构建时分离为独立的 chunk。如果你倾向于直接引入所有的模块（例如依赖于这些模块中的副作用首先被应用），你可以传入 `{ eager: true }` 作为第二个参数：

```js
const modules = import.meta.glob('./dir/*.js', { eager: true })
```

以上会被转译为下面的样子：

```js
// vite 生成的代码
import * as __glob__0_0 from './dir/foo.js'
import * as __glob__0_1 from './dir/bar.js'
const modules = {
  './dir/foo.js': __glob__0_0,
  './dir/bar.js': __glob__0_1,
}
```

##### Glob 导入形式 {###glob-import-as}

`import.meta.glob` 都支持以字符串形式导入文件，类似于 [以字符串形式导入资源](./assets.html###importing-asset-as-string)。在这里，我们使用了 [Import Reflection](https://github.com/tc39/proposal-import-reflection) 语法对导入进行断言：

```js
const modules = import.meta.glob('./dir/*.js', { as: 'raw', eager: true })
```

上面的代码会被转换为下面这样：

```js
// code produced by vite（代码由 vite 输出）
const modules = {
  './dir/foo.js': 'export default "foo"\n',
  './dir/bar.js': 'export default "bar"\n',
}
```

`{ as: 'url' }` 还支持将资源作为 URL 加载。

##### 多个匹配模式 {###multiple-patterns}

第一个参数可以是一个 glob 数组，例如：

```js
const modules = import.meta.glob(['./dir/*.js', './another/*.js'])
```

##### 反面匹配模式 {###negative-patterns}

同样也支持反面 glob 匹配模式（以 `!` 作为前缀）。若要忽略结果中的一些文件，你可以添加“排除匹配模式”作为第一个参数：

```js
const modules = import.meta.glob(['./dir/*.js', '!**/bar.js'])
```

```js
// vite 生成的代码
const modules = {
  './dir/foo.js': () => import('./dir/foo.js'),
}
```

###### 具名导入 {###named-imports}

也可能你只想要导入模块中的部分内容，那么可以利用 `import` 选项。

```ts
const modules = import.meta.glob('./dir/*.js', { import: 'setup' })
```

```ts
// vite 生成的代码
const modules = {
  './dir/foo.js': () => import('./dir/foo.js').then((m) => m.setup),
  './dir/bar.js': () => import('./dir/bar.js').then((m) => m.setup),
}
```

当与 `eager` 一同存在时，甚至可以对这些模块进行 tree-shaking。

```ts
const modules = import.meta.glob('./dir/*.js', {
  import: 'setup',
  eager: true,
})
```

```ts
// vite 生成的代码
import { setup as __glob__0_0 } from './dir/foo.js'
import { setup as __glob__0_1 } from './dir/bar.js'
const modules = {
  './dir/foo.js': __glob__0_0,
  './dir/bar.js': __glob__0_1,
}
```

设置 `import` 为 `default` 可以加载默认导出。

```ts
const modules = import.meta.glob('./dir/*.js', {
  import: 'default',
  eager: true,
})
```

```ts
// vite 生成的代码
import __glob__0_0 from './dir/foo.js'
import __glob__0_1 from './dir/bar.js'
const modules = {
  './dir/foo.js': __glob__0_0,
  './dir/bar.js': __glob__0_1,
}
```

###### 自定义查询 {###custom-queries}

你也可以使用 `query` 选项来提供对导入的自定义查询，以供其他插件使用。

```ts
const modules = import.meta.glob('./dir/*.js', {
  query: { foo: 'bar', bar: true },
})
```

```ts
// vite 生成的代码
const modules = {
  './dir/foo.js': () => import('./dir/foo.js?foo=bar&bar=true'),
  './dir/bar.js': () => import('./dir/bar.js?foo=bar&bar=true'),
}
```

##### Glob 导入注意事项 {###glob-import-caveats}

请注意：

- 这只是一个 Vite 独有的功能而不是一个 Web 或 ES 标准
- 该 Glob 模式会被当成导入标识符：必须是相对路径（以 `./` 开头）或绝对路径（以 `/` 开头，相对于项目根目录解析）或一个别名路径（请看 [`resolve.alias` 选项](/config/shared-options.md###resolve-alias))。
- Glob 匹配是使用 [fast-glob](https://github.com/mrmlnc/fast-glob) 来实现的 —— 阅读它的文档来查阅 [支持的 Glob 模式](https://github.com/mrmlnc/fast-glob###pattern-syntax)。
- 你还需注意，所有 `import.meta.glob` 的参数都必须以字面量传入。你 **不** 可以在其中使用变量或表达式。

#### 动态导入 {###dynamic-import}

和 [glob 导入](###glob-import) 类似，Vite 也支持带变量的动态导入。

```ts
const module = await import(`./dir/${file}.js`)
```

注意变量仅代表一层深的文件名。如果 `file` 是 `foo/bar`，导入将会失败。对于更进阶的使用详情，你可以使用 [glob 导入](###glob-import) 功能。

#### WebAssembly {###webassembly}

预编译的 `.wasm` 文件可以通过 `?init` 来导入。默认导出一个初始化函数，返回值为所导出 wasm 实例对象的 Promise：

```js
import init from './example.wasm?init'

init().then((instance) => {
  instance.exports.test()
})
```

`init` 函数还可以将传递给 `WebAssembly.instantiate` 的导入对象作为其第二个参数：

```js
init({
  imports: {
    someFunc: () => {
      /* ... */
    },
  },
}).then(() => {
  /* ... */
})
```

在生产构建当中，体积小于 `assetInlineLimit` 的 `.wasm` 文件将会被内联为 base64 字符串。否则，它们将作为资源复制到 `dist` 目录中，并按需获取。

::: warning
[对 WebAssembly 的 ES 模块集成提案](https://github.com/WebAssembly/esm-integration) 尚未支持。
请使用 [`vite-plugin-wasm`](https://github.com/Menci/vite-plugin-wasm) 或其他社区上的插件来处理。
:::

#### Web Workers {###web-workers}

##### 通过构造器导入 {###import-with-constructors}

一个 Web Worker 可以使用 [`new Worker()`](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker) 和 [`new SharedWorker()`](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker/SharedWorker) 导入。与 worker 后缀相比，这种语法更接近于标准，是创建 worker 的 **推荐** 方式。

```ts
const worker = new Worker(new URL('./worker.js', import.meta.url))
```

worker 构造函数会接受可以用来创建 “模块” worker 的选项：

```ts
const worker = new Worker(new URL('./worker.js', import.meta.url), {
  type: 'module',
})
```

##### 带有查询后缀的导入 {###import-with-query-suffixes}

你可以在导入请求上添加 `?worker` 或 `?sharedworker` 查询参数来直接导入一个 web worker 脚本。默认导出会是一个自定义 worker 的构造函数：

```js
import MyWorker from './worker?worker'

const worker = new MyWorker()
```

Worker 脚本也可以使用 `import` 语句来替代 `importScripts()` —— 注意，在开发过程中，这依赖于浏览器原生支持，目前只在 Chrome 中适用，而在生产版本中，它已经被编译掉了。

默认情况下，worker 脚本将在生产构建中编译成单独的 chunk。如果你想将 worker 内联为 base64 字符串，请添加 `inline` 查询参数：

```js
import MyWorker from './worker?worker&inline'
```

如果你想要以一个 URL 的形式读取该 worker，请添加 `url` 这个 query：

```js
import MyWorker from './worker?worker&url'
```

关于如何配置打包全部 worker，可以查看 [Worker 选项](/config/worker-options.md) 了解更多相关细节。

#### 构建优化 {###build-optimizations}

> 下面所罗列的功能会自动应用为构建过程的一部分，除非你想禁用它们，否则没有必要显式配置。

##### CSS 代码分割 {###css-code-splitting}

Vite 会自动地将一个异步 chunk 模块中使用到的 CSS 代码抽取出来并为其生成一个单独的文件。这个 CSS 文件将在该异步 chunk 加载完成时自动通过一个 `<link>` 标签载入，该异步 chunk 会保证只在 CSS 加载完毕后再执行，避免发生 [FOUC](https://en.wikipedia.org/wiki/Flash_of_unstyled_content###:~:text=A%20flash%20of%20unstyled%20content,before%20all%20information%20is%20retrieved.) 。

如果你更倾向于将所有的 CSS 抽取到一个文件中，你可以通过设置 [`build.cssCodeSplit`](/config/build-options.md###build-csscodesplit) 为 `false` 来禁用 CSS 代码分割。

##### 预加载指令生成 {###preload-directives-generation}

Vite 会为入口 chunk 和它们在打包出的 HTML 中的直接引入自动生成 `<link rel="modulepreload">` 指令。

##### 异步 Chunk 加载优化 {###async-chunk-loading-optimization}

在实际项目中，Rollup 通常会生成 “共用” chunk —— 被两个或以上的其他 chunk 共享的 chunk。与动态导入相结合，会很容易出现下面这种场景：

<script setup>
import graphSvg from '../images/graph.svg?raw'
</script>
<svg-image :svg="graphSvg" />

在无优化的情境下，当异步 chunk `A` 被导入时，浏览器将必须请求和解析 `A`，然后它才能弄清楚它也需要共用 chunk `C`。这会导致额外的网络往返：

```
Entry ---> A ---> C
```

Vite 将使用一个预加载步骤自动重写代码，来分割动态导入调用，以实现当 `A` 被请求时，`C` 也将 **同时** 被请求：

```
Entry ---> (A + C)
```

`C` 也可能有更深的导入，在未优化的场景中，这会导致更多的网络往返。Vite 的优化会跟踪所有的直接导入，无论导入的深度如何，都能够完全消除不必要的往返。


## 命令行界面

### 命令行界面 {###command-line-interface}

#### 开发服务器 {###dev-server}

##### `vite` {###vite}

在当前目录下启动 Vite 开发服务器。

###### 使用 {###usage}

```bash
vite [root]
```

###### 选项 {###options}

| 选项                     |                                              |
| ------------------------ | ------------------------------------------- |
| `--host [host]`          | 指定主机名称 (`string`) |
| `--port <port>`          | 指定端口 (`number`) |
| `--https`                | 使用 TLS + HTTP/2 (`boolean`) |
| `--open [path]`          | 启动时打开浏览器 (`boolean \| string`) |
| `--cors`                 | 启用 CORS (`boolean`) |
| `--strictPort`           | 如果指定的端口已在使用中，则退出 (`boolean`) |
| `--force`                | 强制优化器忽略缓存并重新构建 (`boolean`) |
| `-c, --config <file>`    | 使用指定的配置文件 (`string`) |
| `--base <path>`          | 公共基础路径（默认为：`/`）(`string`) |
| `-l, --logLevel <level>` | Info \| warn \| error \| silent (`string`) |
| `--clearScreen`          | 允许或禁用打印日志时清除屏幕 (`boolean`) |
| `-d, --debug [feat]`     | 显示调试日志 (`string \| boolean`) |
| `-f, --filter <filter>`  | 过滤调试日志 (`string`) |
| `-m, --mode <mode>`      | 设置环境模式 (`string`) |
| `-h, --help`             | 显示可用的 CLI 选项 |
| `-v, --version`          | 显示版本号 |

#### 构建 {###build}

##### `vite build` {###vite-build}

构建生产版本。

###### 使用 {###usage-1}

```bash
vite build [root]
```

###### 选项 {###options-1}

| 选项                           |                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `--target <target>`            | 编译目标（默认为：`"modules"`）(`string`) |
| `--outDir <dir>`               | 输出目录（默认为：`dist`）(`string`) |
| `--assetsDir <dir>`            | 在输出目录下放置资源的目录（默认为：`"assets"`）(`string`) |
| `--assetsInlineLimit <number>` | 静态资源内联为 base64 编码的阈值，以字节为单位（默认为：`4096`）(`number`) |
| `--ssr [entry]`                | 为服务端渲染配置指定入口文件 (`string`) |
| `--sourcemap [output]`         | 构建后输出 source map 文件（默认为：`false`）(`boolean \| "inline" \| "hidden"`) |
| `--minify [minifier]`          | 允许或禁用最小化混淆，或指定使用哪种混淆器（默认为：`"esbuild"`）(`boolean \| "terser" \| "esbuild"`) |
| `--manifest [name]`            | 构建后生成 manifest.json 文件 (`boolean \| string`) |
| `--ssrManifest [name]`         | 构建后生成 SSR manifest.json 文件 (`boolean \| string`) |
| `--force`                      | 强制优化器忽略缓存并重新构建（实验性）(`boolean`) |
| `--emptyOutDir`                | 若输出目录在根目录外，强制清空输出目录 (`boolean`) |
| `-w, --watch`                  | 在磁盘中模块发生变化时，重新构建 (`boolean`) |
| `-c, --config <file>`          | 使用指定的配置文件 (`string`) |
| `--base <path>`                | 公共基础路径（默认为：`/`）(`string`) |
| `-l, --logLevel <level>`       | Info \| warn \| error \| silent (`string`) |
| `--clearScreen`                | 允许或禁用打印日志时清除屏幕 (`boolean`) |
| `-d, --debug [feat]`           | 显示调试日志 (`string \| boolean`) |
| `-f, --filter <filter>`        | 过滤调试日志 (`string`) |
| `-m, --mode <mode>`            | 设置环境模式 (`string`) |
| `-h, --help`                   | 显示可用的 CLI 选项 |

#### 其他 {###others}

##### `vite optimize` {###vite-optimize}

预构建依赖。

###### 使用 {###usage-2}

```bash
vite optimize [root]
```

###### 选项 {###options-2}

| 选项                     |                                             |
| ------------------------ | ------------------------------------------ |
| `--force`                | 强制优化器忽略缓存并重新构建 (`boolean`) |
| `-c, --config <file>`    | 使用指定的配置文件 (`string`) |
| `--base <path>`          | 公共基础路径（默认为：`/`）(`string`) |
| `-l, --logLevel <level>` | Info \| warn \| error \| silent (`string`) |
| `--clearScreen`          | 允许或禁用打印日志时清除屏幕 (`boolean`) |
| `-d, --debug [feat]`     | 显示调试日志 (`string \| boolean`) |
| `-f, --filter <filter>`  | 过滤调试日志 (`string`) |
| `-m, --mode <mode>`      | 设置环境模式 (`string`) |
| `-h, --help`             | 显示可用的 CLI 选项 |

##### `vite preview` {###vite-preview}

本地预览构建产物。

###### 使用 {###usage-3}

```bash
vite preview [root]
```

###### 选项 {###options-3}

| 选项                     |                                             |
| ------------------------ | ------------------------------------------ |
| `--host [host]`          | 指定主机名称 (`string`) |
| `--port <port>`          | 指定端口 (`number`) |
| `--strictPort`           | 如果指定的端口已在使用中，则退出 (`boolean`) |
| `--https`                | 使用 TLS + HTTP/2 (`boolean`) |
| `--open [path]`          | 启动时打开浏览器 (`boolean \| string`) |
| `--outDir <dir>`         | 输出目录（默认为：`dist`)(`string`) |
| `-c, --config <file>`    | 使用指定的配置文件 (`string`) |
| `--base <path>`          | 公共基础路径（默认为：`/`）(`string`) |
| `-l, --logLevel <level>` | Info \| warn \| error \| silent (`string`) |
| `--clearScreen`          | 允许或禁用打印日志时清除屏幕 (`boolean`) |
| `-d, --debug [feat]`     | 显示调试日志 (`string \| boolean`) |
| `-f, --filter <filter>`  | 过滤调试日志 (`string`) |
| `-m, --mode <mode>`      | 设置环境模式 (`string`) |
| `-h, --help`             | 显示可用的 CLI 选项 |


## 使用插件

### 使用插件 {###using-plugins}

Vite 可以使用插件进行扩展，这得益于 Rollup 优秀的插件接口设计和一部分 Vite 独有的额外选项。这意味着 Vite 用户可以利用 Rollup 插件的强大生态系统，同时根据需要也能够扩展开发服务器和 SSR 功能。

#### 添加一个插件 {###adding-a-plugin}

若要使用一个插件，需要将它添加到项目的 `devDependencies` 并在 `vite.config.js` 配置文件中的 `plugins` 数组中引入它。例如，要想为传统浏览器提供支持，可以按下面这样使用官方插件 [@vitejs/plugin-legacy](https://github.com/vitejs/vite/tree/main/packages/plugin-legacy)：

```
$ npm add -D @vitejs/plugin-legacy
```

```js
// vite.config.js
import legacy from '@vitejs/plugin-legacy'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
})
```

`plugins` 也可以接受包含多个插件作为单个元素的预设。这对于使用多个插件实现的复杂特性（如框架集成）很有用。该数组将在内部被扁平化。

Falsy 虚值的插件将被忽略，可以用来轻松地启用或停用插件。

#### 查找插件 {###finding-plugins}

:::tip 注意
Vite 旨在为常见的 Web 开发范式提供开箱即用的支持。在寻找一个 Vite 或兼容的 Rollup 插件之前，请先查看 [功能指引](../guide/features.md)。大量在 Rollup 项目中需要使用插件的用例在 Vite 中已经覆盖到了。
:::

查看 [Plugins 章节](../plugins/) 获取官方插件信息。社区插件列表请参见 [awesome-vite](https://github.com/vitejs/awesome-vite###plugins)。而对于兼容的 Rollup 插件，请查看 [Vite Rollup 插件](https://vite-rollup-plugins.patak.dev) 获取一个带使用说明的兼容 Rollup 官方插件列表，若列表中没有找到，则请参阅 [Rollup 插件兼容性章节](../guide/api-plugin###rollup-plugin-compatibility)。

你也可以使用此 [npm Vite 插件搜索链接](https://www.npmjs.com/search?q=vite-plugin&ranking=popularity) 来找到一些遵循了 [推荐约定](./api-plugin.md###conventions) 的 Vite 插件，或者通过 [npm Rollup 插件搜索链接](https://www.npmjs.com/search?q=rollup-plugin&ranking=popularity) 获取 Rollup 插件。

#### 强制插件排序 {###enforcing-plugin-ordering}

为了与某些 Rollup 插件兼容，可能需要强制修改插件的执行顺序，或者只在构建时使用。这应该是 Vite 插件的实现细节。可以使用 `enforce` 修饰符来强制插件的位置:

- `pre`：在 Vite 核心插件之前调用该插件
- 默认：在 Vite 核心插件之后调用该插件
- `post`：在 Vite 构建插件之后调用该插件

```js
// vite.config.js
import image from '@rollup/plugin-image'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    {
      ...image(),
      enforce: 'pre',
    },
  ],
})
```

查看 [Plugins API Guide](./api-plugin.md###plugin-ordering) 获取细节信息，并在 [Vite Rollup 插件](https://vite-rollup-plugins.patak.dev) 兼容性列表中注意 `enforce` 标签和流行插件的使用说明。

#### 按需应用 {###conditional-application}

默认情况下插件在开发 (serve) 和生产 (build) 模式中都会调用。如果插件在服务或构建期间按需使用，请使用 `apply` 属性指明它们仅在 `'build'` 或 `'serve'` 模式时调用：

```js
// vite.config.js
import typescript2 from 'rollup-plugin-typescript2'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    {
      ...typescript2(),
      apply: 'build',
    },
  ],
})
```

#### 创建插件 {###building-plugins}

阅读 [插件 API 指引](./api-plugin.md) 文档了解如何创建插件。


## 依赖预构建

### 依赖预构建 {###dependency-pre-bundling}

当你首次启动 `vite` 时，Vite 在本地加载你的站点之前预构建了项目依赖。默认情况下，它是自动且透明地完成的。

#### 原因 {###the-why}

这就是 Vite 执行时所做的“依赖预构建”。这个过程有两个目的:

1. **CommonJS 和 UMD 兼容性:** 在开发阶段中，Vite 的开发服务器将所有代码视为原生 ES 模块。因此，Vite 必须先将以 CommonJS 或 UMD 形式提供的依赖项转换为 ES 模块。

   在转换 CommonJS 依赖项时，Vite 会进行智能导入分析，这样即使模块的导出是动态分配的（例如 React），具名导入（named imports）也能正常工作：

   ```js
   // 符合预期
   import React, { useState } from 'react'
   ```

2. **性能：** 为了提高后续页面的加载性能，Vite将那些具有许多内部模块的 ESM 依赖项转换为单个模块。

   有些包将它们的 ES 模块构建为许多单独的文件，彼此导入。例如，[`lodash-es` 有超过 600 个内置模块](https://unpkg.com/browse/lodash-es/)！当我们执行 `import { debounce } from 'lodash-es'` 时，浏览器同时发出 600 多个 HTTP 请求！即使服务器能够轻松处理它们，但大量请求会导致浏览器端的网络拥塞，使页面加载变得明显缓慢。

   通过将 `lodash-es` 预构建成单个模块，现在我们只需要一个HTTP请求！

::: tip 注意
依赖预构建仅适用于开发模式，并使用 `esbuild` 将依赖项转换为 ES 模块。在生产构建中，将使用 `@rollup/plugin-commonjs`。
:::

#### 自动依赖搜寻 {###automatic-dependency-discovery}

如果没有找到现有的缓存，Vite 会扫描您的源代码，并自动寻找引入的依赖项（即 "bare import"，表示期望从 `node_modules` 中解析），并将这些依赖项作为预构建的入口点。预打包使用 `esbuild` 执行，因此通常速度非常快。

在服务器已经启动后，如果遇到尚未在缓存中的新依赖项导入，则 Vite 将重新运行依赖项构建过程，并在需要时重新加载页面。

#### Monorepo 和链接依赖 {###monorepos-and-linked-dependencies}

在一个 monorepo 启动中，该仓库中的某个包可能会成为另一个包的依赖。Vite 会自动侦测没有从 `node_modules` 解析的依赖项，并将链接的依赖视为源码。它不会尝试打包被链接的依赖，而是会分析被链接依赖的依赖列表。

然而，这需要被链接的依赖被导出为 ESM 格式。如果不是，那么你可以在配置里将此依赖添加到 [`optimizeDeps.include`](/config/dep-optimization-options.md###optimizedeps-include) 和 [`build.commonjsOptions.include`](/config/build-options.md###build-commonjsoptions) 这两项中。

```js
export default defineConfig({
  optimizeDeps: {
    include: ['linked-dep'],
  },
  build: {
    commonjsOptions: {
      include: [/linked-dep/, /node_modules/],
    },
  },
})
```

当对链接的依赖进行更改时，请使用 `--force` 命令行选项重新启动开发服务器，以使更改生效。

::: warning 重复删除
由于链接的依赖项解析方式不同，传递依赖项（transitive dependencies）可能会被错误地去重，从而在运行时出现问题。如果遇到此问题，请使用 `npm pack` 命令来修复它。
:::

#### 自定义行为 {###customizing-the-behavior}

有时候默认的依赖启发式算法（discovery heuristics）可能并不总是理想的。如果您想要明确地包含或排除依赖项，可以使用 [`optimizeDeps` 配置项](/config/dep-optimization-options.md) 来进行设置。

`optimizeDeps.include` 或 `optimizeDeps.exclude` 的一个典型使用场景，是当 Vite 在源码中无法直接发现 import 的时候。例如，import 可能是插件转换的结果。这意味着 Vite 无法在初始扫描时发现 import —— 只能在文件被浏览器请求并转换后才能发现。这将导致服务器在启动后立即重新打包。

`include` 和 `exclude` 都可以用来处理这个问题。如果依赖项很大（包含很多内部模块）或者是 CommonJS，那么你应该包含它；如果依赖项很小，并且已经是有效的 ESM，则可以排除它，让浏览器直接加载它。

你也可以使用 [`optimizeDeps.esbuildOptions` 选项](/config/dep-optimization-options.md###optimizedeps-esbuildoptions) 来进一步自定义 esbuild。例如，添加一个 esbuild 插件来处理依赖项中的特殊文件。

#### 缓存 {###caching}

##### 文件系统缓存 {###file-system-cache}

Vite 将预构建的依赖项缓存到 `node_modules/.vite` 中。它会基于以下几个来源来决定是否需要重新运行预构建步骤：

- 包管理器的锁文件内容，例如 `package-lock.json`，`yarn.lock`，`pnpm-lock.yaml`，或者 `bun.lockb`；
- 补丁文件夹的修改时间；
- `vite.config.js` 中的相关字段；
- `NODE_ENV` 的值。

只有在上述其中一项发生更改时，才需要重新运行预构建。

如果出于某些原因你想要强制 Vite 重新构建依赖项，你可以在启动开发服务器时指定 `--force` 选项，或手动删除 `node_modules/.vite` 缓存目录。

##### 浏览器缓存 {###browser-cache}

已预构建的依赖请求使用 HTTP 头 `max-age=31536000, immutable` 进行强缓存，以提高开发期间页面重新加载的性能。一旦被缓存，这些请求将永远不会再次访问开发服务器。如果安装了不同版本的依赖项（这反映在包管理器的 lockfile 中），则会通过附加版本查询自动失效。如果你想通过本地编辑来调试依赖项，您可以：

1. 通过浏览器开发工具的 Network 选项卡暂时禁用缓存；
2. 重启 Vite 开发服务器指定 `--force` 选项，来重新构建依赖项;
3. 重新载入页面。


## 静态资源处理

### 静态资源处理 {###static-asset-handling}

- 相关: [公共基础路径](./build###public-base-path)
- 相关: [`assetsInclude` 配置项](/config/shared-options.md###assetsinclude)

#### 将资源引入为 URL {###importing-asset-as-url}

服务时引入一个静态资源会返回解析后的公共路径：

```js
import imgUrl from './img.png'
document.getElementById('hero-img').src = imgUrl
```

例如，`imgUrl` 在开发时会是 `/img.png`，在生产构建后会是 `/assets/img.2d8efhg.png`。

行为类似于 Webpack 的 `file-loader`。区别在于导入既可以使用绝对公共路径（基于开发期间的项目根路径），也可以使用相对路径。

- `url()` 在 CSS 中的引用也以同样的方式处理。

- 如果 Vite 使用了 Vue 插件，Vue SFC 模板中的资源引用都将自动转换为导入。

- 常见的图像、媒体和字体文件类型被自动检测为资源。你可以使用 [`assetsInclude` 选项](/config/shared-options.md###assetsinclude) 扩展内部列表。

- 引用的资源作为构建资源图的一部分包括在内，将生成散列文件名，并可以由插件进行处理以进行优化。

- 较小的资源体积小于 [`assetsInlineLimit` 选项值](/config/build-options.md###build-assetsinlinelimit) 则会被内联为 base64 data URL。

- Git LFS 占位符会自动排除在内联之外，因为它们不包含它们所表示的文件的内容。要获得内联，请确保在构建之前通过 Git LFS 下载文件内容。

- 默认情况下，TypeScript 不会将静态资源导入视为有效的模块。要解决这个问题，需要添加 [`vite/client`](./features###client-types)。

##### 显式 URL 引入 {###explicit-url-imports}

未被包含在内部列表或 `assetsInclude` 中的资源，可以使用 `?url` 后缀显式导入为一个 URL。这十分有用，例如，要导入 [Houdini Paint Worklets](https://houdini.how/usage) 时：

```js
import workletURL from 'extra-scalloped-border/worklet.js?url'
CSS.paintWorklet.addModule(workletURL)
```

##### 将资源引入为字符串 {###importing-asset-as-string}

资源可以使用 `?raw` 后缀声明作为字符串引入。

```js
import shaderString from './shader.glsl?raw'
```

##### 导入脚本作为 Worker {###importing-script-as-a-worker}

脚本可以通过 `?worker` 或 `?sharedworker` 后缀导入为 web worker。

```js
// 在生产构建中将会分离出 chunk
import Worker from './shader.js?worker'
const worker = new Worker()
```

```js
// sharedworker
import SharedWorker from './shader.js?sharedworker'
const sharedWorker = new SharedWorker()
```

```js
// 内联为 base64 字符串
import InlineWorker from './shader.js?worker&inline'
```

查看 [Web Worker 小节](./features.md###web-workers) 获取更多细节。

##### `public` 目录 {###the-public-directory}

如果你有下列这些资源：

- 不会被源码引用（例如 `robots.txt`）
- 必须保持原有文件名（没有经过 hash）
- ...或者你压根不想引入该资源，只是想得到其 URL。

那么你可以将该资源放在指定的 `public` 目录中，它应位于你的项目根目录。该目录中的资源在开发时能直接通过 `/` 根路径访问到，并且打包时会被完整复制到目标目录的根目录下。

目录默认是 `<root>/public`，但可以通过 [`publicDir` 选项](/config/shared-options.md###publicdir) 来配置。

请注意：

- 引入 `public` 中的资源永远应该使用根绝对路径 —— 举个例子，`public/icon.png` 应该在源码中被引用为 `/icon.png`。
- `public` 中的资源不应该被 JavaScript 文件引用。

#### new URL(url, import.meta.url)

[import.meta.url](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import.meta) 是一个 ESM 的原生功能，会暴露当前模块的 URL。将它与原生的 [URL 构造器](https://developer.mozilla.org/en-US/docs/Web/API/URL) 组合使用，在一个 JavaScript 模块中，通过相对路径我们就能得到一个被完整解析的静态资源 URL：

```js
const imgUrl = new URL('./img.png', import.meta.url).href

document.getElementById('hero-img').src = imgUrl
```

这在现代浏览器中能够原生使用 - 实际上，Vite 并不需要在开发阶段处理这些代码！

这个模式同样还可以通过字符串模板支持动态 URL：

```js
function getImageUrl(name) {
  return new URL(`./dir/${name}.png`, import.meta.url).href
}
```

在生产构建时，Vite 才会进行必要的转换保证 URL 在打包和资源哈希后仍指向正确的地址。然而，这个 URL 字符串必须是静态的，这样才好分析。否则代码将被原样保留、因而在 `build.target` 不支持 `import.meta.url` 时会导致运行时错误。

```js
// Vite 不会转换这个
const imgUrl = new URL(imagePath, import.meta.url).href
```

::: warning 注意：无法在 SSR 中使用
如果你正在以服务端渲染模式使用 Vite 则此模式不支持，因为 `import.meta.url` 在浏览器和 Node.js 中有不同的语义。服务端的产物也无法预先确定客户端主机 URL。
:::


## 构建生产版本

### 构建生产版本 {###building-for-production}

当需要将应用部署到生产环境时，只需运行 `vite build` 命令。默认情况下，它使用 `<root>/index.html` 作为其构建入口点，并生成能够静态部署的应用程序包。请查阅 [部署静态站点](./static-deploy) 获取常见服务的部署指引。

#### 浏览器兼容性 {###browser-compatibility}

用于生产环境的构建包会假设目标浏览器支持现代 JavaScript 语法。默认情况下，Vite 的目标是能够 [支持原生 ESM script 标签](https://caniuse.com/es6-module)、[支持原生 ESM 动态导入](https://caniuse.com/es6-module-dynamic-import) 和 [`import.meta`](https://caniuse.com/mdn-javascript_operators_import_meta) 的浏览器：

- Chrome >=87
- Firefox >=78
- Safari >=14
- Edge >=88

你也可以通过 [`build.target` 配置项](/config/build-options.md###build-target) 指定构建目标，最低支持 `es2015`。

请注意，默认情况下 Vite 只处理语法转译，且 **默认不包含任何 polyfill**。你可以前往 [Polyfill.io](https://polyfill.io/v3/) 查看，这是一个基于用户浏览器 User-Agent 字符串自动生成 polyfill 包的服务。

传统浏览器可以通过插件 [@vitejs/plugin-legacy](https://github.com/vitejs/vite/tree/main/packages/plugin-legacy) 来支持，它将自动生成传统版本的 chunk 及与其相对应 ES 语言特性方面的 polyfill。兼容版的 chunk 只会在不支持原生 ESM 的浏览器中进行按需加载。

#### 公共基础路径 {###public-base-path}

- 相关内容：[静态资源处理](./assets)

如果你需要在嵌套的公共路径下部署项目，只需指定 [`base` 配置项](/config/shared-options.md###base)，然后所有资源的路径都将据此配置重写。这个选项也可以通过命令行参数指定，例如 `vite build --base=/my/public/path/`。

由 JS 引入的资源 URL，CSS 中的 `url()` 引用以及 `.html` 文件中引用的资源在构建过程中都会自动调整，以适配此选项。

当然，情况也有例外，当访问过程中需要使用动态连接的 url 时，可以使用全局注入的 `import.meta.env.BASE_URL` 变量，它的值为公共基础路径。注意，这个变量在构建时会被静态替换，因此，它必须按 `import.meta.env.BASE_URL` 的原样出现（例如 `import.meta.env['BASE_URL']` 是无效的）

若想要进一步控制基础路径，请查看 [高级 base 选项](###advanced-base-options).

#### 自定义构建 {###customizing-the-build}

构建过程可以通过多种 [构建配置选项](/config/###build-options) 来自定义构建。具体来说，你可以通过 `build.rollupOptions` 直接调整底层的 [Rollup 选项](https://rollupjs.org/configuration-options/)：

```js
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      // https://rollupjs.org/configuration-options/
    },
  },
})
```

例如，你可以使用仅在构建期间应用的插件来指定多个 Rollup 输出。

#### 产物分块策略 {###chunking-strategy}

你可以通过配置 `build.rollupOptions.output.manualChunks` 来自定义 chunk 分割策略（查看 [Rollup 相应文档](https://rollupjs.org/configuration-options/###output-manualchunks)）。在 Vite 2.8 及更早版本中，默认的策略是将 chunk 分割为 `index` 和 `vendor`。这对一些 SPA 来说是好的策略，但是要对所有应用场景提供一种通用解决方案是非常困难的。从 Vite 2.9 起，`manualChunks` 默认情况下不再被更改。你可以通过在配置文件中添加 `splitVendorChunkPlugin` 来继续使用 “分割 Vendor Chunk” 策略：

```js
// vite.config.js
import { splitVendorChunkPlugin } from 'vite'
export default defineConfig({
  plugins: [splitVendorChunkPlugin()],
})
```

也可以用一个工厂函数 `splitVendorChunk({ cache: SplitVendorChunkCache })` 来提供该策略，在需要与自定义逻辑组合的情况下，`cache.reset()` 需要在 `buildStart` 阶段被调用，以便构建的 watch 模式在这种情况下正常工作。

#### 文件变化时重新构建 {###rebuild-on-files-changes}

你可以使用 `vite build --watch` 来启用 rollup 的监听器。或者，你可以直接通过 `build.watch` 调整底层的 [`WatcherOptions`](https://rollupjs.org/configuration-options/###watch) 选项：

```js
// vite.config.js
export default defineConfig({
  build: {
    watch: {
      // https://rollupjs.org/configuration-options/###watch
    },
  },
})
```

当启用 `--watch` 标志时，对 `vite.config.js` 的改动，以及任何要打包的文件，都将触发重新构建。

#### 多页面应用模式 {###multi-page-app}

假设你有下面这样的项目文件结构

```
├── package.json
├── vite.config.js
├── index.html
├── main.js
└── nested
    ├── index.html
    └── nested.js
```

在开发过程中，简单地导航或链接到 `/nested/` - 将会按预期工作，与正常的静态文件服务器表现一致。

在构建过程中，你只需指定多个 `.html` 文件作为入口点即可：

```js
// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        nested: resolve(__dirname, 'nested/index.html'),
      },
    },
  },
})
```

如果你指定了另一个根目录，请记住，在解析输入路径时，`__dirname` 的值将仍然是 vite.config.js 文件所在的目录。因此，你需要把对应入口文件的 `root` 的路径添加到 `resolve` 的参数中。

#### 库模式 {###library-mode}

当你开发面向浏览器的库时，你可能会将大部分时间花在该库的测试/演示页面上。在 Vite 中你可以使用 `index.html` 获得如丝般顺滑的开发体验。

当这个库要进行发布构建时，请使用 [`build.lib` 配置项](/config/build-options.md###build-lib)，以确保将那些你不想打包进库的依赖进行外部化处理，例如 `vue` 或 `react`：

```js
// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'lib/main.js'),
      name: 'MyLib',
      // the proper extensions will be added
      fileName: 'my-lib',
    },
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: ['vue'],
      output: {
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
})
```

入口文件将包含可以由你的包的用户导入的导出：

```js
// lib/main.js
import Foo from './Foo.vue'
import Bar from './Bar.vue'
export { Foo, Bar }
```

使用如上配置运行 `vite build` 时，将会使用一套面向库的 Rollup 预设，并且将为该库提供两种构建格式：`es` 和 `umd` (可在 `build.lib` 中配置)：

```
$ vite build
building for production...
dist/my-lib.js      0.08 KiB / gzip: 0.07 KiB
dist/my-lib.umd.cjs 0.30 KiB / gzip: 0.16 KiB
```

推荐在你库的 `package.json` 中使用如下格式：

```json
{
  "name": "my-lib",
  "type": "module",
  "files": ["dist"],
  "main": "./dist/my-lib.umd.cjs",
  "module": "./dist/my-lib.js",
  "exports": {
    ".": {
      "import": "./dist/my-lib.js",
      "require": "./dist/my-lib.umd.cjs"
    }
  }
}
```

或者，如果暴露了多个入口起点：

```json
{
  "name": "my-lib",
  "type": "module",
  "files": ["dist"],
  "main": "./dist/my-lib.cjs",
  "module": "./dist/my-lib.js",
  "exports": {
    ".": {
      "import": "./dist/my-lib.js",
      "require": "./dist/my-lib.cjs"
    },
    "./secondary": {
      "import": "./dist/secondary.js",
      "require": "./dist/secondary.cjs"
    }
  }
}
```

::: tip 注意
如果 `package.json` 不包含 `"type": "module"`，Vite 会生成不同的文件后缀名以兼容 Node.js。`.js` 会变为 `.mjs` 而 `.cjs` 会变为 `.js` 。
:::

::: tip 环境变量
在库模式下，所有 `import.meta.env.*` 用法在构建生产时都会被静态替换。但是，`process.env.*` 的用法不会被替换，所以你的库的使用者可以动态地更改它。如果不想允许他们这样做，你可以使用 `define: { 'process.env.NODE_ENV': '"production"' }` 例如静态替换它们。
:::

#### 进阶基础路径选项 {###advanced-base-options}

::: warning
该功能是实验性的，这个 API 可能在未来后续版本中发生变更而不遵循语义化版本号。请在使用它时注意维护 Vite 的版本。
:::

对更高级的使用场景，被部署的资源和公共文件可能想要分为不同的路径，例如使用不同缓存策略的场景。
一个用户可能以三种不同的路径部署下列文件：

- 生成的入口 HTML 文件（可能会在 SSR 中被处理）
- 生成的带有 hash 值的文件（JS、CSS 以及其他文件类型，如图片）
- 拷贝的 [公共文件](assets.md###the-public-directory)

单个静态的 [基础路径](###public-base-path) 在这种场景中就不够用了。Vite 在构建时为更高级的基础路径选项提供了实验性支持，可以使用 `experimental.renderBuiltUrl`。

```ts
experimental: {
  renderBuiltUrl(filename: string, { hostType }: { hostType: 'js' | 'css' | 'html' }) {
    if (hostType === 'js') {
      return { runtime: `window.__toCdnUrl(${JSON.stringify(filename)})` }
    } else {
      return { relative: true }
    }
  }
}
```

如果 hash 后的资源和公共文件没有被部署在一起，可以根据该函数的第二个参数 `context` 上的字段 `type` 分别定义各个资源组的选项：

```ts
experimental: {
  renderBuiltUrl(filename: string, { hostId, hostType, type }: { hostId: string, hostType: 'js' | 'css' | 'html', type: 'public' | 'asset' }) {
    if (type === 'public') {
      return 'https://www.domain.com/' + filename
    }
    else if (path.extname(hostId) === '.js') {
      return { runtime: `window.__assetsPath(${JSON.stringify(filename)})` }
    }
    else {
      return 'https://cdn.domain.com/assets/' + filename
    }
  }
}
```


## 部署静态站点

### 部署静态站点 {###deploying-a-static-site}

本指南建立在以下几个假设基础之上：

- 你正在使用的是默认的构建输出路径（`dist`）。这个路径 [可以通过 `build.outDir` 更改](/config/build-options.md###build-outdir)，在这种情况下，你可以从这篇指南中找到所需的指引。
- 你正在使用 NPM；或者 Yarn 等其他可以运行下面的脚本指令的包管理工具。
- Vite 已作为一个本地开发依赖（dev dependency）安装在你的项目中，并且你已经配置好了如下的 npm scripts：

```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

值得注意的是 `vite preview` 用作预览本地构建，而不应直接作为生产服务器。

::: tip 注意
本篇指南提供了部署 Vite 静态站点的说明。Vite 也对服务端渲染（SSR）有了实验性的支持。SSR 是指支持在 Node 中运行相应应用的前端框架，预渲染成 HTML，最后在客户端激活（hydrate）。查看 [SSR 指南](./ssr) 了解更多细节。另一方面，如果你在寻找与传统服务端框架集成的方式，那么请查看 [后端集成](./backend-integration) 章节。
:::

#### 构建应用 {###building-the-app}

你可以运行 `npm run build` 命令来执行应用的构建。

```bash
$ npm run build
```

默认情况下，构建会输出到 `dist` 文件夹中。你可以部署这个 `dist` 文件夹到任何你喜欢的平台。

##### 本地测试应用 {###testing-the-app-locally}

当你构建完成应用后，你可以通过运行 `npm run preview` 命令，在本地测试该应用。

```bash
$ npm run build
$ npm run preview
```

`vite preview` 命令会在本地启动一个静态 Web 服务器，将 `dist` 文件夹运行在 `http://localhost:4173`。这样在本地环境下查看该构建产物是否正常可用就方便多了。

你可以通过 `--port` 参数来配置服务的运行端口。

```json
{
  "scripts": {
    "preview": "vite preview --port 8080"
  }
}
```

现在 `preview` 命令会将服务器运行在 `http://localhost:8080`。

#### GitHub Pages {###github-pages}

1. 在 `vite.config.js` 中设置正确的 `base`。

   如果你要部署在 `https://<USERNAME>.github.io/` 上，你可以省略 `base` 使其默认为 `'/'`。

   如果你要部署在 `https://<USERNAME>.github.io/<REPO>/` 上，例如你的仓库地址为 `https://github.com/<USERNAME>/<REPO>`，那么请设置 `base` 为 `'/<REPO>/'`。

2. 进入仓库 settings 页面的 GitHub Pages 配置，选择部署来源为“GitHub Actions”，这将引导你创建一个构建和部署项目的工作流程，我们提供了一个安装依赖项和使用 npm 构建的工作流程样本：

   ```yml
   ### 将静态内容部署到 GitHub Pages 的简易工作流程
   name: Deploy static content to Pages

   on:
     ### 仅在推送到默认分支时运行。
     push:
       branches: ['main']

     ### 这个选项可以使你手动在 Action tab 页面触发工作流
     workflow_dispatch:

   ### 设置 GITHUB_TOKEN 的权限，以允许部署到 GitHub Pages。
   permissions:
     contents: read
     pages: write
     id-token: write

   ### 允许一个并发的部署
   concurrency:
     group: 'pages'
     cancel-in-progress: true

   jobs:
     ### 单次部署的工作描述
     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v3
         - name: Set up Node
           uses: actions/setup-node@v3
           with:
             node-version: 18
             cache: 'npm'
         - name: Install dependencies
           run: npm install
         - name: Build
           run: npm run build
         - name: Setup Pages
           uses: actions/configure-pages@v3
         - name: Upload artifact
           uses: actions/upload-pages-artifact@v1
           with:
             ### Upload dist repository
             path: './dist'
         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v1
   ```

#### GitLab Pages 配合 GitLab CI {###gitlab-pages-and-gitlab-ci}

1. 在 `vite.config.js` 中设置正确的 `base`。

   如果你要部署在 `https://<USERNAME or GROUP>.gitlab.io/` 上，你可以省略 `base` 使其默认为 `'/'`。

   如果你要部署在 `https://<USERNAME or GROUP>.gitlab.io/<REPO>/` 上，例如你的仓库地址为 `https://gitlab.com/<USERNAME>/<REPO>`，那么请设置 `base` 为 `'/<REPO>/'`。

2. 在项目根目录创建一个 `.gitlab-ci.yml` 文件，并包含以下内容。它将使得每次你更改内容时都重新构建与部署站点：

   ```yaml
   image: node:16.5.0
   pages:
     stage: deploy
     cache:
       key:
         files:
           - package-lock.json
         prefix: npm
       paths:
         - node_modules/
     script:
       - npm install
       - npm run build
       - cp -a dist/. public/
     artifacts:
       paths:
         - public
     rules:
       - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
   ```

#### Netlify {###netlify}

##### Netlify CLI {###netlify-cli}

1. 安装 [Netlify CLI](https://cli.netlify.com/)。
2. 使用 `ntl init` 创建一个新站点。
3. 使用 `ntl deploy` 来部署。

```bash
### 安装 Netlify CLI
$ npm install -g netlify-cli

### 在 Netlify 中创建一个新站点
$ ntl init

### 部署一个独一无二的预览 URL
$ ntl deploy
```

Netlify CLI 会给你分享一个预览的 URL 来检查部署结果。当你准备好了发布生产版本时，请使用 `prod` 标志：

```bash
### 部署站点到生产环境
$ ntl deploy --prod
```

##### Netlify with Git {###netlify-with-git}

1. 将你的代码推送到 git 仓库（GitHub、GitLab、BitBucket 或是 Azure DevOps 等服务）
2. 在 Netlify 中 [导入该项目](https://app.netlify.com/start)
3. 选择分支，输出目录，如果需要还可以设置环境变量。
4. 点击 **部署**
5. 你的 Vite 应用就部署完成了！

在你的项目被导入和部署后，所有对生产分支以外的其他分支（可能来自合并请求）的后续推送都会生成 [预览部署](https://docs.netlify.com/site-deploys/deploy-previews/)，所有对生产分支（通常是 “main”）都会生成一个 [生产部署](https://docs.netlify.com/site-deploys/overview/###definitions)。

#### Vercel {###vercel}

##### Vercel CLI {###vercel-cli}

1. 安装 [Vercel CLI](https://vercel.com/cli) 并运行 `vercel` 来部署。
2. Vercel 会检测到你正在使用 Vite，并会为你开启相应的正确配置。
3. 你的应用被部署好了！（示例：[vite-vue-template.vercel.app](https://vite-vue-template.vercel.app/)）

```bash
$ npm i -g vercel
$ vercel init vite
Vercel CLI
> Success! Initialized "vite" example in ~/your-folder.
- To deploy, `cd vite` and run `vercel`.
```

##### Vercel for Git {###vercel-for-git}

1. 将你的代码推送到远程仓库（GitHub, GitLab, Bitbucket）
2. [导入你的 Vite 仓库](https://vercel.com/new) 到 Vercel
3. Vercel 会检测到你正在使用 Vite，并会为你的部署开启相应的正确配置。
4. 你的应用被部署好了！（示例：[vite-vue-template.vercel.app](https://vite-vue-template.vercel.app/)）

在你的项目被导入和部署后，所有对分支的后续推送都会生成 [预览部署](https://vercel.com/docs/concepts/deployments/environments###preview)，而所有对生产分支（通常是“main”）的更改都会生成一个 [生产构建](https://vercel.com/docs/concepts/deployments/environments###production)

查看 Vercel 的 [Git 集成](https://vercel.com/docs/concepts/git) 了解更多细节。

#### Cloudflare Pages {###cloudflare-pages}

##### Cloudflare Pages via Wrangler {###cloudflare-pages-via-wrangler}

1. 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/get-started/).
2. 使用 `wrangler login`、通过你的 Cloudflare 账号完成 Wrangler 身份校验。
3. 运行你的构建命令
4. 使用 `npx wrangler pages publish dist` 部署。

```bash
### 安装 Wrangler CLI
$ npm install -g wrangler

### 使用 CLI 工具登录 Cloudflare 账号
$ wrangler login

### 运行构建命令
$ npm run build

### 创建一个新的部署
$ npx wrangler pages publish dist
```

在你的资产上传后，Wrangler 会给你一个预览 URL 来检查你的网站。当你登录到 Cloudflare Pages 仪表板时，你会看到你的新项目。

##### Cloudflare Pages with Git {###cloudflare-pages-with-git}

1. 将你的代码推送到你的 Git 仓库（GitHub, GitLab）
2. 登录 Cloudflare 控制台，在 **Account Home** > **Pages** 下选择你的账号
3. 选择 **Create a new Project** 以及 **Connect Git** 选项
4. 选择你想要部署的 Git 项目，然后点击 **Begin setup**
5. 根据你所选择的 Vite 框架，在构建设置中选择相应的框架预设
6. 记得保存！然后部署吧！
7. 然后你的应用就部署完成了！（例如： `https://<PROJECTNAME>.pages.dev/`）

在你的项目被导入和部署后，所有对该分支的后续推送都会生成一个 [预览部署](https://developers.cloudflare.com/pages/platform/preview-deployments/)，除非你特意在 [控制分支构建](https://developers.cloudflare.com/pages/platform/branch-build-controls/) 的选项中写明不触发。所有对 **生产分支**（通常是 "main"）的更改都会生成一个 **生产构建**。

你也可以添加自定义域名，并自定义各个页面的构建设置。查看 [Cloudflare 页面与 Git 集成](https://developers.cloudflare.com/pages/get-started/###manage-your-site) 了解更多详情。

#### Google Firebase {###google-firebase}

1. 确保已经安装 [firebase-tools](https://www.npmjs.com/package/firebase-tools)。

2. 在项目根目录创建 `firebase.json` 和 `.firebaserc` 两个文件，包含以下内容：

   `firebase.json`:

   ```json
   {
     "hosting": {
       "public": "dist",
       "ignore": [],
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ]
     }
   }
   ```

   `.firebaserc`:

   ```js
   {
     "projects": {
       "default": "<YOUR_FIREBASE_ID>"
     }
   }
   ```

3. 运行 `npm run build` 后，通过 `firebase deploy` 命令部署。

#### Surge {###surge}

1. 首先确保已经安装 [surge](https://www.npmjs.com/package/surge)。

2. 运行 `npm run build`。

3. 运行 `surge dist` 命令部署到 surge。

你也可以通过添加 `surge dist yourdomain.com` 部署到一个 [自定义域名](http://surge.sh/help/adding-a-custom-domain)。

#### Azure 的静态网站应用 {###azure-static-web-apps}

你可以通过微软 Azure 的 [静态网站应用](https://aka.ms/staticwebapps) 服务来快速部署你的 Vite 应用。你只需：

- 注册 Azure 账号并获取一个订阅（subscription）的 key。可以在 [此处快速完成注册](https://azure.microsoft.com/free)。
- 将你的应用代码托管到 [GitHub](https://github.com)。
- 在 [VSCode](https://code.visualstudio.com) 中安装 [SWA 扩展](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurestaticwebapps)。

安装完此扩展后，进入你应用的根目录。打开 SWA 的扩展程序，登录 Azure，并点击 '+'，来创建一个全新的 SWA。系统会提示你指定所需的订阅 key。

按照扩展程序的启动向导，给你的应用程序起个名字，选择框架预设，并指定应用程序的根目录（通常为 `/`）以及构建文件的路径 `/dist`。此向导完成后，会在你的 repo 中的 `.github` 文件夹中创建一个 GitHub Action。

这个 action 致力于部署你的应用程序（可以在仓库的 Actions 标签中，查看相关进度），成功完成后，你可以点击 GitHub 中出现的 “浏览站点” 的按钮，查看你的应用程序。

#### Render {###render}

你可以在 [Render](https://render.com/) 部署你的 Vite 应用。

1. 创建一个 [Render 账号](https://dashboard.render.com/register)

2. 在 [控制台](https://dashboard.render.com/) 页面点击 **New** 按钮并选择 **Static Site**。

3. 链接你的 GitHub/GitLab 账号或使用一个公共仓库

4. 指定一个项目名称和所用分支

   - **构建命令**：`npm run build`
   - **发布目录**：`dist`

5. 点击 **Create Static Site**

   你的应用将会被部署在 `https://<PROJECTNAME>.onrender.com/`。

默认情况下，推送到该指定分支的任何新的 commit 都会自动触发一个新的部署。[Auto-Deploy](https://render.com/docs/deploys###toggling-auto-deploy-for-a-service) 可以在项目设置中部署。

你也可以为你的项目添加一个 [自定义域名](https://render.com/docs/custom-domains)。


## 环境变量与模式

### 环境变量和模式 {###env-variables-and-modes}

#### 环境变量 {###env-variables}

Vite 在一个特殊的 **`import.meta.env`** 对象上暴露环境变量。这里有一些在所有情况下都可以使用的内建变量：

- **`import.meta.env.MODE`**: {string} 应用运行的[模式](###modes)。

- **`import.meta.env.BASE_URL`**: {string} 部署应用时的基本 URL。他由[`base` 配置项](/config/shared-options.md###base)决定。

- **`import.meta.env.PROD`**: {boolean} 应用是否运行在生产环境。

- **`import.meta.env.DEV`**: {boolean} 应用是否运行在开发环境 (永远与 `import.meta.env.PROD`相反)。

- **`import.meta.env.SSR`**: {boolean} 应用是否运行在 [server](./ssr.md###conditional-logic) 上。

##### 生产环境替换 {###production-replacement}

在生产环境中，这些环境变量会在构建时被**静态替换**，因此，在引用它们时请使用完全静态的字符串。动态的 key 将无法生效。例如，动态 key 取值 `import.meta.env[key]` 是无效的。

它还将替换出现在 JavaScript 和 Vue 模板中的字符串。这本应是非常少见的，但也可能是不小心为之的。在这种情况下你可能会看到类似 `Missing Semicolon` 或 `Unexpected token` 等错误，例如当 `"process.env.NODE_ENV"` 被替换为 `""development": "`。有一些方法可以避免这个问题：

- 对于 JavaScript 字符串，你可以使用 unicode 零宽度空格来分割这个字符串，例如： `'import.meta\u200b.env.MODE'`。

- 对于 Vue 模板或其他编译到 JavaScript 字符串的 HTML，你可以使用 [`<wbr>` 标签](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/wbr)，例如：`import.meta.<wbr>env.MODE`。

#### `.env` 文件 {###env-files}

Vite 使用 [dotenv](https://github.com/motdotla/dotenv) 从你的 [环境目录](/config/shared-options.md###envdir) 中的下列文件加载额外的环境变量：

```
.env                ### 所有情况下都会加载
.env.local          ### 所有情况下都会加载，但会被 git 忽略
.env.[mode]         ### 只在指定模式下加载
.env.[mode].local   ### 只在指定模式下加载，但会被 git 忽略
```

:::tip 环境加载优先级

一份用于指定模式的文件（例如 `.env.production`）会比通用形式的优先级更高（例如 `.env`）。

另外，Vite 执行时已经存在的环境变量有最高的优先级，不会被 `.env` 类文件覆盖。例如当运行 `VITE_SOME_KEY=123 vite build` 的时候。

`.env` 类文件会在 Vite 启动一开始时被加载，而改动会在重启服务器后生效。
:::

加载的环境变量也会通过 `import.meta.env` 以字符串形式暴露给客户端源码。

为了防止意外地将一些环境变量泄漏到客户端，只有以 `VITE_` 为前缀的变量才会暴露给经过 vite 处理的代码。例如下面这些环境变量：

```
VITE_SOME_KEY=123
DB_PASSWORD=foobar
```

只有 `VITE_SOME_KEY` 会被暴露为 `import.meta.env.VITE_SOME_KEY` 提供给客户端源码，而 `DB_PASSWORD` 则不会。

```js
console.log(import.meta.env.VITE_SOME_KEY) // 123
console.log(import.meta.env.DB_PASSWORD) // undefined
```

此外，Vite 使用 [dotenv-expand](https://github.com/motdotla/dotenv-expand) 来直接拓展变量。想要了解更多相关语法，请查看 [它们的文档](https://github.com/motdotla/dotenv-expand###what-rules-does-the-expansion-engine-follow)。

请注意，如果想要在环境变量中使用 `$` 符号，则必须使用 `\` 对其进行转义。

```
KEY=123
NEW_KEY1=test$foo   ### test
NEW_KEY2=test\$foo  ### test$foo
NEW_KEY3=test$KEY   ### test123
```

如果你想自定义 env 变量的前缀，请参阅 [envPrefix](/config/shared-options.html###envprefix)。

  :::warning 安全注意事项

- `.env.*.local` 文件应是本地的，可以包含敏感变量。你应该将 `.local` 添加到你的 `.gitignore` 中，以避免它们被 git 检入。

- 由于任何暴露给 Vite 源码的变量最终都将出现在客户端包中，`VITE_*` 变量应该不包含任何敏感信息。
  :::

##### TypeScript 的智能提示 {###intellisense}

默认情况下，Vite 在 [`vite/client.d.ts`](https://github.com/vitejs/vite/blob/main/packages/vite/client.d.ts) 中为 `import.meta.env` 提供了类型定义。随着在 `.env[mode]` 文件中自定义了越来越多的环境变量，你可能想要在代码中获取这些以 `VITE_` 为前缀的用户自定义环境变量的 TypeScript 智能提示。

要想做到这一点，你可以在 `src` 目录下创建一个 `env.d.ts` 文件，接着按下面这样增加 `ImportMetaEnv` 的定义：

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

如果你的代码依赖于浏览器环境的类型，比如 [DOM](https://github.com/microsoft/TypeScript/blob/main/lib/lib.dom.d.ts) 和 [WebWorker](https://github.com/microsoft/TypeScript/blob/main/lib/lib.webworker.d.ts)，你可以在 `tsconfig.json` 中修改 [lib](https://www.typescriptlang.org/tsconfig###lib) 字段来获取类型支持。

```json
{
  "lib": ["WebWorker"]
}
```

#### HTML 环境变量替换 {###html-env-replacement}
Vite 还支持在 HTML 文件中替换环境变量。`import.meta.env` 中的任何属性都可以通过特殊的 `%ENV_NAME%` 语法在 HTML 文件中使用：

```html
<h1>Vite is running in %MODE%</h1>
<p>Using data from %VITE_API_URL%</p>
```

如果环境变量在 `import.meta.env` 中不存在，比如不存在的 `%NON_EXISTENT%`，则会将被忽略而不被替换，这与 JS 中的 `import.meta.env.NON_EXISTENT` 不同，JS 中会被替换为 `undefined`。

#### 模式 {###modes}

默认情况下，开发服务器 (`dev` 命令) 运行在 `development` (开发) 模式，而 `build` 命令则运行在 `production` (生产) 模式。

这意味着当执行 `vite build` 时，它会自动加载 `.env.production` 中可能存在的环境变量：

```
### .env.production
VITE_APP_TITLE=My App
```

在你的应用中，你可以使用 `import.meta.env.VITE_APP_TITLE` 渲染标题。

在某些情况下，若想在 `vite build` 时运行不同的模式来渲染不同的标题，你可以通过传递 `--mode` 选项标志来覆盖命令使用的默认模式。例如，如果你想在 staging （预发布）模式下构建应用：

```bash
vite build --mode staging
```

还需要新建一个 `.env.staging` 文件：

```
### .env.staging
VITE_APP_TITLE=My App (staging)
```

由于 `vite build` 默认运行生产模式构建，你也可以通过使用不同的模式和对应的 `.env` 文件配置来改变它，用以运行开发模式的构建：

```
### .env.testing
NODE_ENV=development
```


## 服务端渲染（SSR）

### 服务端渲染 {###server-side-rendering}

:::tip 注意
SSR 特别指支持在 Node.js 中运行相同应用程序的前端框架（例如 React、Preact、Vue 和 Svelte），将其预渲染成 HTML，最后在客户端进行水合处理。如果你正在寻找与传统服务器端框架的集成，请查看 [后端集成指南](./backend-integration)。

下面的指南还假定你在选择的框架中有使用 SSR 的经验，并且只关注特定于 Vite 的集成细节。
:::

:::warning Low-level API
这是一个底层 API，是为库和框架作者准备的。如果你的目标是构建一个应用程序，请确保优先查看 [Vite SSR 章节](https://github.com/vitejs/awesome-vite###ssr) 中更上层的 SSR 插件和工具。也就是说，大部分应用都是基于 Vite 的底层 API 之上构建的。
:::

:::tip 帮助
如果你有疑问，可以到社区 [Discord 的 Vite ###ssr 频道](https://discord.gg/PkbxgzPhJv)，这里会帮到你。
:::

#### 示例项目 {###example-projects}

Vite 为服务端渲染（SSR）提供了内建支持。这里的 Vite 范例包含了 Vue 3 和 React 的 SSR 设置示例，可以作为本指南的参考：

- [Vue 3](https://github.com/vitejs/vite-plugin-vue/tree/main/playground/ssr-vue)
- [React](https://github.com/vitejs/vite-plugin-react/tree/main/playground/ssr-react)

#### 源码结构 {###source-structure}

一个典型的 SSR 应用应该有如下的源文件结构：

```
- index.html
- server.js ### main application server
- src/
  - main.js          ### 导出环境无关的（通用的）应用代码
  - entry-client.js  ### 将应用挂载到一个 DOM 元素上
  - entry-server.js  ### 使用某框架的 SSR API 渲染该应用
```

`index.html` 将需要引用 `entry-client.js` 并包含一个占位标记供给服务端渲染时注入：

```html
<div id="app"><!--ssr-outlet--></div>
<script type="module" src="/src/entry-client.js"></script>
```

你可以使用任何你喜欢的占位标记来替代 `<!--ssr-outlet-->`，只要它能够被正确替换。

#### 情景逻辑 {###conditional-logic}

如果需要执行 SSR 和客户端间情景逻辑，可以使用：

```js
if (import.meta.env.SSR) {
  // ... 仅在服务端执行的逻辑
}
```

这是在构建过程中被静态替换的，因此它将允许对未使用的条件分支进行摇树优化。

#### 设置开发服务器 {###setting-up-the-dev-server}

在构建 SSR 应用程序时，你可能希望完全控制主服务器，并将 Vite 与生产环境脱钩。因此，建议以中间件模式使用 Vite。下面是一个关于 [express](https://expressjs.com/) 的例子：

**server.js**

```js{15-18}
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import { createServer as createViteServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function createServer() {
  const app = express()

  // 以中间件模式创建 Vite 应用，并将 appType 配置为 'custom'
  // 这将禁用 Vite 自身的 HTML 服务逻辑
  // 并让上级服务器接管控制
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  })

  // 使用 vite 的 Connect 实例作为中间件
  // 如果你使用了自己的 express 路由（express.Router()），你应该使用 router.use
  app.use(vite.middlewares)

  app.use('*', async (req, res) => {
    // 服务 index.html - 下面我们来处理这个问题
  })

  app.listen(5173)
}

createServer()
```

这里 `vite` 是 [ViteDevServer](./api-javascript###vitedevserver) 的一个实例。`vite.middlewares` 是一个 [Connect](https://github.com/senchalabs/connect) 实例，它可以在任何一个兼容 connect 的 Node.js 框架中被用作一个中间件。

下一步是实现 `*` 处理程序供给服务端渲染的 HTML：

```js
app.use('*', async (req, res, next) => {
  const url = req.originalUrl

  try {
    // 1. 读取 index.html
    let template = fs.readFileSync(
      path.resolve(__dirname, 'index.html'),
      'utf-8',
    )

    // 2. 应用 Vite HTML 转换。这将会注入 Vite HMR 客户端，
    //    同时也会从 Vite 插件应用 HTML 转换。
    //    例如：@vitejs/plugin-react 中的 global preambles
    template = await vite.transformIndexHtml(url, template)

    // 3. 加载服务器入口。vite.ssrLoadModule 将自动转换
    //    你的 ESM 源码使之可以在 Node.js 中运行！无需打包
    //    并提供类似 HMR 的根据情况随时失效。
    const { render } = await vite.ssrLoadModule('/src/entry-server.js')

    // 4. 渲染应用的 HTML。这假设 entry-server.js 导出的 `render`
    //    函数调用了适当的 SSR 框架 API。
    //    例如 ReactDOMServer.renderToString()
    const appHtml = await render(url)

    // 5. 注入渲染后的应用程序 HTML 到模板中。
    const html = template.replace(`<!--ssr-outlet-->`, appHtml)

    // 6. 返回渲染后的 HTML。
    res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
  } catch (e) {
    // 如果捕获到了一个错误，让 Vite 来修复该堆栈，这样它就可以映射回
    // 你的实际源码中。
    vite.ssrFixStacktrace(e)
    next(e)
  }
})
```

`package.json` 中的 `dev` 脚本也应该相应地改变，使用服务器脚本：

```diff
  "scripts": {
-   "dev": "vite"
+   "dev": "node server"
  }
```

#### 生产环境构建 {###building-for-production}

为了将 SSR 项目交付生产，我们需要：

1. 正常生成一个客户端构建；
2. 再生成一个 SSR 构建，使其通过 `import()` 直接加载，这样便无需再使用 Vite 的 `ssrLoadModule`；

`package.json` 中的脚本应该看起来像这样：

```json
{
  "scripts": {
    "dev": "node server",
    "build:client": "vite build --outDir dist/client",
    "build:server": "vite build --outDir dist/server --ssr src/entry-server.js"
  }
}
```

注意使用 `--ssr` 标志表明这将会是一个 SSR 构建。同时需要指定 SSR 的入口。

接着，在 `server.js` 中，通过 `process.env.NODE_ENV` 条件分支，需要添加一些用于生产环境的特定逻辑：

- 使用 `dist/client/index.html` 作为模板，而不是根目录的 `index.html`，因为前者包含了到客户端构建的正确资源链接。

- 使用 `import('./dist/server/entry-server.js')` ，而不是 `await vite.ssrLoadModule('/src/entry-server.js')`（前者是 SSR 构建后的最终结果）。

- 将 `vite` 开发服务器的创建和所有使用都移到 dev-only 条件分支后面，然后添加静态文件服务中间件来服务 `dist/client` 中的文件。

可以在此参考 [Vue](https://github.com/vitejs/vite-plugin-vue/tree/main/playground/ssr-vue) 和 [React](https://github.com/vitejs/vite-plugin-react/tree/main/playground/ssr-react) 的设置范例。

#### 生成预加载指令 {###generating-preload-directives}

`vite build` 支持使用 `--ssrManifest` 标志，这将会在构建输出目录中生成一份 `ssr-manifest.json`：

```diff
- "build:client": "vite build --outDir dist/client",
+ "build:client": "vite build --outDir dist/client --ssrManifest",
```

上面的脚本将会为客户端构建生成 `dist/client/ssr-manifest.json`（是的，该 SSR 清单是从客户端构建生成而来，因为我们想要将模块 ID 映射到客户端文件上）。清单包含模块 ID 到它们关联的 chunk 和资源文件的映射。

为了利用该清单，框架需要提供一种方法来收集在服务器渲染调用期间使用到的组件模块 ID。

`@vitejs/plugin-vue` 支持该功能，开箱即用，并会自动注册使用的组件模块 ID 到相关的 Vue SSR 上下文：

```js
// src/entry-server.js
const ctx = {}
const html = await vueServerRenderer.renderToString(app, ctx)
// ctx.modules 现在是一个渲染期间使用的模块 ID 的 Set
```

我们现在需要在 `server.js` 的生产环境分支下读取该清单，并将其传递到 `src/entry-server.js` 导出的 `render` 函数中。这将为我们提供足够的信息，来为异步路由相应的文件渲染预加载指令！查看 [示例代码](https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/src/entry-server.js) 获取完整示例。你还可以利用 [103 Early Hints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/103) 所提供的信息。

#### 预渲染 / SSG {###pre-rendering--ssg}

如果预先知道某些路由所需的路由和数据，我们可以使用与生产环境 SSR 相同的逻辑将这些路由预先渲染到静态 HTML 中。这也被视为一种静态站点生成（SSG）的形式。查看 [示例渲染代码](https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/prerender.js) 获取有效示例。

#### SSR 外部化 {###ssr-externals}

当运行 SSR 时依赖会由 Vite 的 SSR 转换模块系统作外部化。这会同时提速开发与构建。

如果依赖需要被 Vite 的管道转换，例如因为其中使用了未经过转译的 Vite 特性，那么它们可以被添加到 [`ssr.noExternal`](../config/ssr-options.md###ssr-noexternal) 中。

对于采用链接的依赖，它们将默认不会被外部化，这是为了能使其利用 Vite HMR 的优势。如果你不需要这一功效，例如，想要把这些依赖当成非链接情况来测试，你可以将其添加到 [`ssr.external`](../config/ssr-options.md###ssr-external)。

:::warning 使用别名
如果你为某个包配置了一个别名，为了能使 SSR 外部化依赖功能正常工作，你可能想要使用的别名应该指的是实际的 `node_modules` 中的包。[Yarn](https://classic.yarnpkg.com/en/docs/cli/add/###toc-yarn-add-alias) 和 [pnpm](https://pnpm.io/aliases/) 都支持通过 `npm:` 前缀来设置别名。
:::

#### SSR 专有插件逻辑 {###ssr-specific-plugin-logic}

一些框架，如 Vue 或 Svelte，会根据客户端渲染和服务端渲染的区别，将组件编译成不同的格式。可以向以下的插件钩子中，给 Vite 传递额外的 `options` 对象，对象中包含 `ssr` 属性来支持根据情景转换：

- `resolveId`
- `load`
- `transform`

**示例：**

```js
export function mySSRPlugin() {
  return {
    name: 'my-ssr',
    transform(code, id, options) {
      if (options?.ssr) {
        // 执行 ssr 专有转换...
      }
    },
  }
}
```

`load` 和 `transform` 中的 `options` 对象为可选项，rollup 目前并未使用该对象，但将来可能会用额外的元数据来扩展这些钩子函数。

:::tip Note
Vite 2.7 之前的版本，会提示你 `ssr` 参数的位置不应该是 `options` 对象。目前所有主要框架和插件都已对应更新，但你可能还是会发现使用过时 API 的旧文章。
:::

#### SSR 构建目标 {###ssr-target}

SSR 构建的默认目标为 node 环境，但你也可以让服务运行在 Web Worker 上。每个平台的打包条目解析是不同的。你可以将`ssr.target` 设置为 `webworker`，以将目标配置为 Web Worker。

#### SSR 构建产物 {###ssr-bundle}

在某些如 `webworker` 运行时等特殊情况中，你可能想要将你的 SSR 打包成单个 JavaScript 文件。你可以通过设置 `ssr.noExternal` 为 `true` 来启用这个行为。这将会做两件事：

- 将所有依赖视为 `noExternal`（非外部化）
- 若任何 Node.js 内置内容被引入，将抛出一个错误

#### Vite CLI {###vite-cli}

CLI 命令 `$ vite dev` 和 `$ vite preview` 也可以用于 SSR 应用：你可以将你的 SSR 中间件通过 [`configureServer`](/guide/api-plugin###configureserver) 添加到开发服务器、以及通过 [`configurePreviewServer`](/guide/api-plugin###configurepreviewserver) 添加到预览服务器。

:::tip 注意
使用一个后置钩子，使得你的 SSR 中间件在 Vite 的中间件 _之后_ 运行。
:::

#### SSR 格式 {###ssr-format}

默认情况下，Vite 生成的 SSR 打包产物是 ESM 格式。实验性地支持配置 `ssr.format` ，但不推荐这样做。未来围绕 SSR 的开发工作将基于 ESM 格式，并且为了向下兼容，commonjs 仍然可用。如果你的 SSR 项目不能使用 ESM，你可以通过 [Vite v2 外部启发式方法](https://v2.vitejs.dev/guide/ssr.html###ssr-externals) 设置 `legacy.buildSsrCjsExternalHeuristics: true` 生成 CJS 格式的产物。


## 后端集成

### 后端集成 {###backend-integration}

:::tip Note
如果你想使用传统的后端（如 Rails, Laravel）来服务 HTML，但使用 Vite 来服务其他资源，可以查看在 [Awesome Vite](https://github.com/vitejs/awesome-vite###integrations-with-backends) 上的已有的后端集成列表。

如果你需要自定义集成，你可以按照本指南的步骤配置它：
:::

1. 在你的 Vite 配置中配置入口文件和启用创建 `manifest`：

   ```js
   // vite.config.js
   export default defineConfig({
     build: {
       // 在 outDir 中生成 manifest.json
       manifest: true,
       rollupOptions: {
         // 覆盖默认的 .html 入口
         input: '/path/to/main.js'
       }
     }
   })
   ```

   如果你没有禁用 [module preload 的 polyfill](/config/build-options.md###build-polyfillmodulepreload)，你还需在你的入口处添加此 polyfill：

   ```js
   // 在你应用的入口起始处添加此 polyfill
   import 'vite/modulepreload-polyfill'
   ```

2. 在开发环境中，在服务器的 HTML 模板中注入以下内容（用正在运行的本地 URL 替换 `http://localhost:5173`）：

   ```html
   <!-- 如果是在开发环境中 -->
   <script type="module" src="http://localhost:5173/@vite/client"></script>
   <script type="module" src="http://localhost:5173/main.js"></script>
   ```

   为了正确地提供资源，你有两种选项：

   - 确保服务器被配置过，将会拦截代理资源请求给到 Vite 服务器
   - 设置 [`server.origin`](/config/server-options.md###server-origin) 以求生成的资源链接将以服务器 URL 形式被解析而非一个相对路径

   这对于图片等资源的正确加载是必需的。

   如果你正使用 `@vitejs/plugin-react` 配合 React，你还需要在上述脚本前添加下面这个，因为插件不能修改你正在服务的 HTML：

   ```html
   <script type="module">
     import RefreshRuntime from 'http://localhost:5173/@react-refresh'
     RefreshRuntime.injectIntoGlobalHook(window)
     window.$RefreshReg$ = () => {}
     window.$RefreshSig$ = () => (type) => type
     window.__vite_plugin_react_preamble_installed__ = true
   </script>
   ```

3. 在生产环境中：在运行 `vite build` 之后，一个 `manifest.json` 文件将与静态资源文件一同生成。一个示例清单文件会像下面这样：

   ```json
   {
     "main.js": {
       "file": "assets/main.4889e940.js",
       "src": "main.js",
       "isEntry": true,
       "dynamicImports": ["views/foo.js"],
       "css": ["assets/main.b82dbe22.css"],
       "assets": ["assets/asset.0ab0f9cd.png"]
     },
     "views/foo.js": {
       "file": "assets/foo.869aea0d.js",
       "src": "views/foo.js",
       "isDynamicEntry": true,
       "imports": ["_shared.83069a53.js"]
     },
     "_shared.83069a53.js": {
       "file": "assets/shared.83069a53.js"
     }
   }
   ```

   - 清单是一个 `Record<name, chunk>` 结构的对象。
   - 对于 入口 或动态入口 chunk，键是相对于项目根目录的资源路径。
   - 对于非入口 chunk，键是生成文件的名称并加上前缀 `_`。
   - Chunk 将信息包含在其静态和动态导入上（两者都是映射到清单中相应 chunk 的键)，以及任何与之相关的 CSS 和资源文件。

   你可以使用这个文件来渲染链接或者用散列文件名预加载指令（注意：这里的语法只是为了解释，实际使用时请你的服务器模板语言代替）：

   ```html
   <!-- 如果是在生产环境中 -->
   <link rel="stylesheet" href="/assets/{{ manifest['main.js'].css }}" />
   <script type="module" src="/assets/{{ manifest['main.js'].file }}"></script>
   ```


## 比较

### 与其他工具比较 {###comparisons}

#### WMR {###wmr}

Preact 团队的 [WMR](https://github.com/preactjs/wmr) 提供了类似的特性集，而 Vite 2.0 对 Rollup 插件接口的支持正是受到了它的启发。

WMR 主要是为了 [Preact](https://preactjs.com/) 项目而设计，并为其提供了集成度更高的功能，比如预渲染。就使用范围而言，它更加贴合于 Preact 框架，与 Preact 本身一样强调紧凑的大小。如果你正在使用 Preact，那么 WMR 可能会提供更好的体验。

#### @web/dev-server {###web-dev-server}

[@web/dev-server](https://modern-web.dev/docs/dev-server/overview/)（曾经是 `es-dev-server`）是一个伟大的项目，基于 koa 的 Vite 1.0 开发服务器就是受到了它的启发。

`@web/dev-server` 适用范围不是很广。它并未提供官方的框架集成，并且需要为生产构建手动设置 Rollup 配置。

总的来说，与 `@web/dev-server` 相比，Vite 是一个更有主见、集成度更高的工具，旨在提供开箱即用的工作流。话虽如此，但 `@web` 这个项目群包含了许多其他的优秀工具，也可以使 Vite 用户受益。

#### Snowpack {###snowpack}

[Snowpack](https://www.snowpack.dev/) 也是一个与 Vite 十分类似的非构建式原生 ESM 开发服务器。该项目已经不维护了。团队目前正在开发 [Astro](https://astro.build/)，一个由 Vite 驱动的静态站点构建工具。Astro 团队目前是我们生态中非常活跃的成员，他们帮助 Vite 进益良多。

除了不同的实现细节外，这两个项目在技术上比传统工具有很多共同优势。Vite 的依赖预构建也受到了 Snowpack v1（现在是 [`esinstall`](https://github.com/snowpackjs/snowpack/tree/main/esinstall)）的启发。若想了解 Vite 同这两个项目之间的一些主要区别，可以查看 [Vite v2 比较指南](https://v2.vitejs.dev/guide/comparisons)。


## 故障排除

### 故障排除 {###troubleshooting}

> 你还可以查看 [Rollup 的故障排除指南](https://rollupjs.org/troubleshooting/) 了解更多。

如果这里的建议并未帮助到你，请将你的问题发送到 [GitHub 讨论区](https://github.com/vitejs/vite/discussions) 或 [Vite Land Discord](https://chat.vitejs.dev) 的 `###help` 频道。

#### CLI {###cli}

##### `Error: Cannot find module 'C:\foo\bar&baz\vite\bin\vite.js'` {###error-cannot-find-module-cfoobarbazvitebinvitejs}

你的项目文件夹路径中可能包含了符号 `&`，这在 Windows 上无法与 `npm` 配合正常工作 ([npm/cmd-shim###45](https://github.com/npm/cmd-shim/issues/45))。

你可以选择以下两种修改方式：

- 切换另一种包管理工具（例如 `pnpm` 或 `yarn`）
- 从你的项目路径中移除符号 `&`

#### 开发服务器 {###dev-server}

##### 请求始终停滞 {###requests-are-stalled-forever}

如果你使用的是 Linux，文件描述符限制和 inotify 限制可能会导致这个问题。由于 Vite 不会打包大多数文件，浏览器可能会请求许多文件，而相应地需要许多文件描述符，因此超过了限制。

要解决这个问题：

- 使用 `ulimit` 增加文件描述符的限制

  ```shell
  ### 查看当前限制值
  $ ulimit -Sn
  ### （暂时）更改限制值
  $ ulimit -Sn 10000 ### 你可能也需要更改硬性限制值
  ### 重启你的浏览器
  ```

- 通过 `sysctl` 提升下列 inotify 相关的限制

  ```shell
  ### 查看当前限制值
  $ sysctl fs.inotify
  ### （暂时）更改限制值
  $ sudo sysctl fs.inotify.max_queued_events=16384
  $ sudo sysctl fs.inotify.max_user_instances=8192
  $ sudo sysctl fs.inotify.max_user_watches=524288
  ```

如果通过以上步骤仍不起作用，可以尝试在以下文件中添加 `DefaultLimitNOFILE=65536` 配置。

- /etc/systemd/system.conf
- /etc/systemd/user.conf

对于 Ubuntu Linux 操作系统，你可能需要添加一行 `* - nofile 65536` 到文件 `/etc/security/limits.conf` 之中，而不是更新 systemd 配置文件。

请注意，这些配置会持久作用，但需要 **重新启动**。

##### 网络请求停止加载 {###network-requests-stop-loading}

使用自签名SSL证书时，Chrome 会忽略所有缓存指令并重新加载内容。而 Vite 依赖于这些缓存指令。

要解决此问题，请使用受信任的SSL证书。

请查看：[缓存问题](https://helpx.adobe.com/mt/experience-manager/kb/cache-problems-on-chrome-with-SSL-certificate-errors.html) 和相关的 [Chrome issue](https://bugs.chromium.org/p/chromium/issues/detail?id=110649###c8)

###### macOS

您可以使用以下命令通过 CLI 安装受信任的证书：

```
security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/login.keychain-db your-cert.cer
```

或者，通过将其导入 Keychain Access 应用程序并将您的证书的信任更新为“始终信任”。

##### 431 Request Header Fields Too Large {###_431-request-header-fields-too-large}

当服务器或 WebSocket 服务收到一个较大的 HTTP 头，该请求可能会被遗落并且会显示下面这样的警告。

> Server responded with status code 431. See https://vitejs.dev/guide/troubleshooting.html###_431-request-header-fields-too-large.

这是由于 Node.js 限制请求头大小，以减轻 [CVE-2018-12121](https://www.cve.org/CVERecord?id=CVE-2018-12121) 的影响。

要避免这个问题，请尝试减小请求头大小。举个例子，如果 cookie 太长，请删除它。或者你可以使用 [`--max-http-header-size`](https://nodejs.org/api/cli.html###--max-http-header-sizesize) 来更改最大请求头大小。

#### HMR {###hmr}

##### Vite 检测到文件变化，但 HMR 不工作 {###vite-detects-a-file-change-but-the-hmr-is-not-working}

你可能导入了一个拥有不同大小写的文件，例如，存在 `src/foo.js` 文件而 `src/bar.js` 导入了它：

```js
import './Foo.js' // 应该为 './foo.js'
```

相关 issue：[###964](https://github.com/vitejs/vite/issues/964)

##### Vite 没有检测到文件变化 {###vite-does-not-detect-a-file-change}

如果你正在 WSL2 中运行 Vite，Vite 无法在某些场景下监听文件变化。请查看 [`server.watch` 选项](/config/server-options.md###server-watch) 的描述。

##### 完全重新加载了，而不是 HMR {###a-full-reload-happens-instead-of-hmr}

如果 HMR 不是由 Vite 或一个插件处理的，那么将进行完全的重新加载。

同时如果有依赖环，也会发生完全重载。要解决这个问题，请先尝试解决依赖循环。

##### 控制台中大量热更新 {###high-number-of-hmr-updates-in-console}

这可能是由循环依赖引起的。要解决这个问题，请先尝试解决依赖循环。

#### 构建 {###build}

##### 构建产物因为 CORS 错误无法工作 {###built-file-does-not-work-because-of-cors-error}

如果导出的 HTML 文件是通过 `file` 协议打开的，那么其中的 script 将不会运行，且报告下列错误。

> Access to script at 'file:///foo/bar.js' from origin 'null' has been blocked by CORS policy: Cross origin requests are only supported for protocol schemes: http, data, isolated-app, chrome-extension, chrome, https, chrome-untrusted.

> Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at file:///foo/bar.js. (Reason: CORS request not http).

请查看 [释因：CORS 请求不是 HTTP 请求 - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors/CORSRequestNotHttp) 了解为什么会发生这种情况的更多信息。

你需要通过 `http` 协议访问该文件。最简单的办法就是使用 `npx vite preview`。

#### 优化依赖 {###optimize-dependencies}

##### 链接本地包时过期预构建依赖项 {###outdated-pre-bundled-deps-when-linking-to-a-local-package}

在 Vite 中通过一个哈希值来决定优化后的依赖项是否有效，这个值取决于包锁定的内容、应用于依赖项的补丁以及 Vite 配置文件中影响 node_modules 打包的选项。这意味着，当使用像 [npm overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json###overrides) 这样的功能覆盖依赖项时，Vite 将检测到，并在下一次服务器启动时重新打包您的依赖项。当您使用像 [npm link](https://docs.npmjs.com/cli/v9/commands/npm-link) 这样的功能时，Vite 不会使依赖项无效。如果您链接或取消链接一个依赖项，那么您需要使用 `vite --force` 在下一次服务器启动时强制重新预构建。我们建议使用 overrides，它们现在被每个包管理器所支持（还可以参见 [pnpm overrides](https://pnpm.io/package_json###pnpmoverrides) 和 [yarn resolutions](https://yarnpkg.com/configuration/manifest/###resolutions)）。

#### 其他 {###others}

##### Module externalized for browser compatibility {###module-externalized-for-browser-compatibility}

当你在浏览器中使用一个 Node.js 模块时，Vite 会输出以下警告：

> Module "fs" has been externalized for browser compatibility. Cannot access "fs.readFile" in client code.

这是因为 Vite 不会自动 polyfill Node.js 的内建模块。

我们推荐你不要在浏览器中使用 Node.js 模块以减小包体积，尽管你可以为其手动添加 polyfill。如果该模块是被某个第三方库（这里意为某个在浏览器中使用的库）导入的，则建议向对应库提交一个 issue。

##### 出现 Syntax Error 或 Type Error {###syntax-error-type-error-happens}

Vite 无法处理、也不支持仅可在非严格模式（sloppy mode）下运行的代码。这是因为 Vite 使用了 ESM 并且始终在 ESM 中使用 [严格模式](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)。

例如，你可能会看到以下错误。

> [ERROR] With statements cannot be used with the "esm" output format due to strict mode

> TypeError: Cannot create property 'foo' on boolean 'false'

如果这些代码是在依赖中被使用的，你应该使用 [`patch-package`](https://github.com/ds300/patch-package)（或者 [`yarn patch`](https://yarnpkg.com/cli/patch)、[`pnpm patch`](https://pnpm.io/cli/patch) 工具）来做短期补丁处理。

##### 浏览器扩展程序 {###browser-extensions}

一些浏览器扩展程序（例如 ad-blockers 广告拦截器），可能会阻止 Vite 客户端向 Vite 开发服务器发送请求。在这种情况下，你可能会看到一个空白屏且没有错误日志。如果遇到这类问题，请尝试禁用扩展程序。


## 从 v3 迁移

### 从 v3 迁移 {###migration-from-v3}

#### Rollup 3 {###rollup-3}

Vite 现在正式启用 [Rollup 3](https://github.com/vitejs/vite/issues/9870)，这使得我们可以简化 Vite 内部的资源处理并同时拥有许多改进。详情请查看 [Rollup 3 版本记录](https://github.com/rollup/rollup/releases/tag/v3.0.0)。

Rollup 3 尽最大可能兼容了 Rollup 2。如果你在项目中使用了自定义的 [`rollupOptions`](../config/build-options.md###rollup-options) 并（升级后）遇到了问题，请先查看 [Rollup 迁移指南](https://rollupjs.org/migration/) 来更新升级你的配置。

#### 现代浏览器基准线变化 {###modern-browser-baseline-change}

当前对于现代浏览器的构建目标及现调整为了默认 `safari14` 以求更广的 ES2020 兼容性（从 `safari13` 升级）。这意味着现代化构建现在可以使用 [`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)，同时 [空值合并运算符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing) 将不再被转译。如果你需要支持更旧版本的浏览器，你可以照常添加 [`@vitejs/plugin-legacy`](https://github.com/vitejs/vite/tree/main/packages/plugin-legacy)。

#### 其他一般性变化 {###general-changes}

##### 编码 {###encoding}

构建的默认字符集现在是 utf8（查看 [###10753](https://github.com/vitejs/vite/issues/10753) 了解更多细节）。

##### 以字符串形式导入 CSS {###importing-css-as-a-string}

在过往的 Vite 3 之中，以默认导入形式导入一个 `.css` 文件的可能会造成对 CSS 的双重加载。

```ts
import cssString from './global.css'
```

这种双重加载出现的原因是 `.css` 文件是将会被释放（emit）到最终产物的，并且很可能 CSS 字符串将会在应用代码中被使用到，就比如被框架运行时注入的时候。对于现在的 Vite 4，`.css` 默认导出 [已经被废弃](https://github.com/vitejs/vite/issues/11094)。在这种情况下你将需要使用 `?inline` 这个查询参数后缀，而这时将不会将导入的 `.css` 样式文件释放到最终产物。

```ts
import stuff from './global.css?inline'
```

##### 默认情况下的生产构建 {###production-builds-by-default}

不管所传递的 `--mode` 是什么，`vite build` 总是构建生产版本。之前，若将 `mode` 改为 `production` 之外的模式会构建开发版本，如果现在希望用于开发构建，可以在 `.env.{mode}` 文件中设置 `NODE_ENV=development`。

在本次变动中，如果 `process.env.NODE_ENV` 已经被定义，`vite dev` 和 `vite build` 将不再覆盖它。所以如果在构建前设置了 `process.env.NODE_ENV = 'development'`，将会构建开发版本。这在并行执行多个构建或开发服务器时提供了更多的控制权。

请参阅更新后的 [`mode` 文档](/guide/env-and-mode.md###modes) 了解更多详细信息。

##### 环境变量 {###environment-variables}

Vite 现在使用 `dotenv` 16 和 `dotenv-expand` 9（之前是 `dotenv` 14 和 `dotenv-expand` 5）如果你有一个包含 `###` 或者 `` ` `` 的值，你将需要将它们以双引号包裹起来。

```diff
-VITE_APP=ab###cd`ef
+VITE_APP="ab###cd`ef"
```

了解更多详情，请查看 [`dotenv`](https://github.com/motdotla/dotenv/blob/master/CHANGELOG.md) 和 [`dotenv-expand` 更新日志](https://github.com/motdotla/dotenv-expand/blob/master/CHANGELOG.md)。

#### 进阶 {###advanced}

下列改动仅会影响到插件/工具的作者：

- [[###11036] feat(client)!: remove never implemented hot.decline](https://github.com/vitejs/vite/issues/11036)
  - 使用 `hot.invalidate` 来代替
- [[###9669] feat: align object interface for `transformIndexHtml` hook](https://github.com/vitejs/vite/issues/9669)
  - 使用 `order` 来代替 `enforce`

此外，还有其他一些只影响少数用户的破坏性变化。

- [[###11101] feat(ssr)!: remove dedupe and mode support for CJS](https://github.com/vitejs/vite/pull/11101)
  - 您应该迁移到 SSR 的默认 ESM 模式，CJS SSR 支持可能会在下一个 Vite 主要版本删除。
- [[###10475] feat: handle static assets in case-sensitive manner](https://github.com/vitejs/vite/pull/10475)
  - 您的项目不应该依赖于会被不同操作系统忽略大小写的文件名。
- [[###10996] fix!: make `NODE_ENV` more predictable](https://github.com/vitejs/vite/pull/10996)
  - 有关此更改的解释，请参阅 PR。
- [[###10903] refactor(types)!: remove facade type files](https://github.com/vitejs/vite/pull/10903)

#### 从 v2 迁移 {###migration-from-v2}

请先查看之前 Vite v3 文档中的 [Migration from v2 Guide](https://cn.vitejs.dev/guide/migration-from-v2.html) 了解迁移到 v3 所需要的更改，然后再继续执行本页提到的相关更改。

# API

## 插件 API

### 插件 API {###plugin-api}

Vite 插件扩展了设计出色的 Rollup 接口，带有一些 Vite 独有的配置项。因此，你只需要编写一个 Vite 插件，就可以同时为开发环境和生产环境工作。

**推荐在阅读下面的章节之前，首先阅读下 [Rollup 插件文档](https://rollupjs.org/plugin-development/)**

#### 致插件创作者 {###authoring-a-plugin}

Vite 努力秉承开箱即用的原则，因此在创作一款新插件前，请确保已经阅读过 [Vite 的功能指南](/guide/features)，避免重复劳作。同时还应查看社区是否存在可用插件，包括 [兼容 Rollup 的插件](https://github.com/rollup/awesome) 以及 [Vite 的专属插件](https://github.com/vitejs/awesome-vite###plugins)。

当创作插件时，你可以在 `vite.config.js` 中直接使用它。没必要直接为它创建一个新的 package。当你发现某个插件在你项目中很有用时，可以考虑 [在社区中](https://chat.vitejs.dev) 将其与他人分享。

::: tip
在学习、调试或创作插件时，我们建议在你的项目中引入 [vite-plugin-inspect](https://github.com/antfu/vite-plugin-inspect)。 它可以帮助你检查 Vite 插件的中间状态。安装后，你可以访问 `localhost:5173/__inspect/` 来检查你项目的模块和栈信息。请查阅 [vite-plugin-inspect 文档](https://github.com/antfu/vite-plugin-inspect) 中的安装说明。
![vite-plugin-inspect](/images/vite-plugin-inspect.png)
:::

#### 约定 {###conventions}

如果插件不使用 Vite 特有的钩子，可以作为 [兼容 Rollup 的插件](###rollup-plugin-compatibility) 来实现，推荐使用 [Rollup 插件名称约定](https://rollupjs.org/plugin-development/###conventions)。

- Rollup 插件应该有一个带 `rollup-plugin-` 前缀、语义清晰的名称。
- 在 package.json 中包含 `rollup-plugin` 和 `vite-plugin` 关键字。

这样，插件也可以用于纯 Rollup 或基于 WMR 的项目。

对于 Vite 专属的插件：

- Vite 插件应该有一个带 `vite-plugin-` 前缀、语义清晰的名称。
- 在 package.json 中包含 `vite-plugin` 关键字。
- 在插件文档增加一部分关于为什么本插件是一个 Vite 专属插件的详细说明（如，本插件使用了 Vite 特有的插件钩子）。

如果你的插件只适用于特定的框架，它的名字应该遵循以下前缀格式：

- `vite-plugin-vue-` 前缀作为 Vue 插件
- `vite-plugin-react-` 前缀作为 React 插件
- `vite-plugin-svelte-` 前缀作为 Svelte 插件

更多详情参见 [虚拟模块的相关内容](###virtual-modules-convention).

#### 插件配置 {###plugins-config}

用户会将插件添加到项目的 `devDependencies` 中并使用数组形式的 `plugins` 选项配置它们。

```js
// vite.config.js
import vitePlugin from 'vite-plugin-feature'
import rollupPlugin from 'rollup-plugin-feature'

export default defineConfig({
  plugins: [vitePlugin(), rollupPlugin()],
})
```

假值的插件将被忽略，可以用来轻松地启用或停用插件。

`plugins` 也可以接受将多个插件作为单个元素的预设。这对于使用多个插件实现的复杂特性（如框架集成）很有用。该数组将在内部被扁平化（flatten）。

```js
// 框架插件
import frameworkRefresh from 'vite-plugin-framework-refresh'
import frameworkDevtools from 'vite-plugin-framework-devtools'

export default function framework(config) {
  return [frameworkRefresh(config), frameworkDevTools(config)]
}
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import framework from 'vite-plugin-framework'

export default defineConfig({
  plugins: [framework()],
})
```

#### 简单示例 {###simple-examples}

:::tip
通常的惯例是创建一个 Vite/Rollup 插件作为一个返回实际插件对象的工厂函数。该函数可以接受允许用户自定义插件行为的选项。
:::

##### 转换自定义文件类型 {###transforming-custom-file-types}

```js
const fileRegex = /\.(my-file-ext)$/

export default function myPlugin() {
  return {
    name: 'transform-file',

    transform(src, id) {
      if (fileRegex.test(id)) {
        return {
          code: compileFileToJS(src),
          map: null // 如果可行将提供 source map
        }
      }
    },
  }
}
```

##### 引入一个虚拟文件 {###importing-a-virtual-file}

请在 [下一小节中](###virtual-modules-convention) 中查看示例：

#### 虚拟模块相关说明 {###virtual-modules-convention}

虚拟模块是一种很实用的模式，使你可以对使用 ESM 语法的源文件传入一些编译时信息。

```js
export default function myPlugin() {
  const virtualModuleId = 'virtual:my-module'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'my-plugin', // 必须的，将会在 warning 和 error 中显示
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export const msg = "from virtual module"`
      }
    },
  }
}
```

这使得可以在 JavaScript 中引入这些模块：

```js
import { msg } from 'virtual:my-module'

console.log(msg)
```

虚拟模块在 Vite（以及 Rollup）中都以 `virtual:` 为前缀，作为面向用户路径的一种约定。如果可能的话，插件名应该被用作命名空间，以避免与生态系统中的其他插件发生冲突。举个例子，`vite-plugin-posts` 可以要求用户导入一个 `virtual:posts` 或者 `virtual:posts/helpers` 虚拟模块来获得编译时信息。在内部，使用了虚拟模块的插件在解析时应该将模块 ID 加上前缀 `\0`，这一约定来自 rollup 生态。这避免了其他插件尝试处理这个 ID（比如 node 解析），而例如 sourcemap 这些核心功能可以利用这一信息来区别虚拟模块和正常文件。`\0` 在导入 URL 中不是一个被允许的字符，因此我们需要在导入分析时替换掉它们。一个虚拟 ID 为 `\0{id}` 在浏览器中开发时，最终会被编码为 `/@id/__x00__{id}`。这个 id 会被解码回进入插件处理管线前的样子，因此这对插件钩子的代码是不可见的。

请注意，直接从真实文件派生出来的模块，就像单文件组件中的脚本模块（如.vue 或 .svelte SFC）不需要遵循这个约定。SFC 通常在处理时生成一组子模块，但这些模块中的代码可以映射回文件系统。对这些子模块使用 `\0` 会使 sourcemap 无法正常工作。

#### 通用钩子 {###universal-hooks}

在开发中，Vite 开发服务器会创建一个插件容器来调用 [Rollup 构建钩子](https://rollupjs.org/plugin-development/###build-hooks)，与 Rollup 如出一辙。

以下钩子在服务器启动时被调用：

- [`options`](https://rollupjs.org/plugin-development/###options)
- [`buildStart`](https://rollupjs.org/plugin-development/###buildstart)

以下钩子会在每个传入模块请求时被调用：

- [`resolveId`](https://rollupjs.org/plugin-development/###resolveid)
- [`load`](https://rollupjs.org/plugin-development/###load)
- [`transform`](https://rollupjs.org/plugin-development/###transform)

它们还有一个扩展的 `options` 参数，包含其他特定于 Vite 的属性。你可以在 [SSR 文档](/guide/ssr###ssr-specific-plugin-logic) 中查阅更多内容。

以下钩子在服务器关闭时被调用：

- [`buildEnd`](https://rollupjs.org/plugin-development/###buildend)
- [`closeBundle`](https://rollupjs.org/plugin-development/###closebundle)

请注意 [`moduleParsed`](https://rollupjs.org/plugin-development/###moduleparsed) 钩子在开发中是 **不会** 被调用的，因为 Vite 为了性能会避免完整的 AST 解析。

[Output Generation Hooks](https://rollupjs.org/plugin-development/###output-generation-hooks)（除了 `closeBundle`) 在开发中是 **不会** 被调用的。你可以认为 Vite 的开发服务器只调用了 `rollup.rollup()` 而没有调用 `bundle.generate()`。

#### Vite 独有钩子 {###vite-specific-hooks}

Vite 插件也可以提供钩子来服务于特定的 Vite 目标。这些钩子会被 Rollup 忽略。

##### `config` {###config}

- **类型：** `(config: UserConfig, env: { mode: string, command: string }) => UserConfig | null | void`
- **种类：** `async`, `sequential`

  在解析 Vite 配置前调用。钩子接收原始用户配置（命令行选项指定的会与配置文件合并）和一个描述配置环境的变量，包含正在使用的 `mode` 和 `command`。它可以返回一个将被深度合并到现有配置中的部分配置对象，或者直接改变配置（如果默认的合并不能达到预期的结果）。

  **示例：**

  ```js
  // 返回部分配置（推荐）
  const partialConfigPlugin = () => ({
    name: 'return-partial',
    config: () => ({
      resolve: {
        alias: {
          foo: 'bar',
        },
      },
    }),
  })

  // 直接改变配置（应仅在合并不起作用时使用）
  const mutateConfigPlugin = () => ({
    name: 'mutate-config',
    config(config, { command }) {
      if (command === 'build') {
        config.root = 'foo'
      }
    },
  })
  ```

  ::: warning 注意
  用户插件在运行这个钩子之前会被解析，因此在 `config` 钩子中注入其他插件不会有任何效果。
  :::

##### `configResolved` {###configresolved}

- **类型：** `(config: ResolvedConfig) => void | Promise<void>`
- **种类：** `async`, `parallel`

  在解析 Vite 配置后调用。使用这个钩子读取和存储最终解析的配置。当插件需要根据运行的命令做一些不同的事情时，它也很有用。

  **示例：**

  ```js
  const examplePlugin = () => {
    let config

    return {
      name: 'read-config',

      configResolved(resolvedConfig) {
        // 存储最终解析的配置
        config = resolvedConfig
      },

      // 在其他钩子中使用存储的配置
      transform(code, id) {
        if (config.command === 'serve') {
          // dev: 由开发服务器调用的插件
        } else {
          // build: 由 Rollup 调用的插件
        }
      },
    }
  }
  ```

  注意，在开发环境下，`command` 的值为 `serve`（在 CLI 中，`vite` 和 `vite dev` 是 `vite serve` 的别名）。

##### `configureServer` {###configureserver}

- **类型：** `(server: ViteDevServer) => (() => void) | void | Promise<(() => void) | void>`
- **种类：** `async`, `sequential`
- **此外请看** [ViteDevServer](./api-javascript###vitedevserver)

  是用于配置开发服务器的钩子。最常见的用例是在内部 [connect](https://github.com/senchalabs/connect) 应用程序中添加自定义中间件:

  ```js
  const myPlugin = () => ({
    name: 'configure-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // 自定义请求处理...
      })
    },
  })
  ```

  **注入后置中间件**

  `configureServer` 钩子将在内部中间件被安装前调用，所以自定义的中间件将会默认会比内部中间件早运行。如果你想注入一个在内部中间件 **之后** 运行的中间件，你可以从 `configureServer` 返回一个函数，将会在内部中间件安装后被调用：

  ```js
  const myPlugin = () => ({
    name: 'configure-server',
    configureServer(server) {
      // 返回一个在内部中间件安装后
      // 被调用的后置钩子
      return () => {
        server.middlewares.use((req, res, next) => {
          // 自定义请求处理...
        })
      }
    },
  })
  ```

  **存储服务器访问**

  在某些情况下，其他插件钩子可能需要访问开发服务器实例（例如访问 websocket 服务器、文件系统监视程序或模块图）。这个钩子也可以用来存储服务器实例以供其他钩子访问:

  ```js
  const myPlugin = () => {
    let server
    return {
      name: 'configure-server',
      configureServer(_server) {
        server = _server
      },
      transform(code, id) {
        if (server) {
          // 使用 server...
        }
      },
    }
  }
  ```

  注意 `configureServer` 在运行生产版本时不会被调用，所以其他钩子需要防范它缺失。

##### `configurePreviewServer` {###configurepreviewserver}

- **类型：** `(server: PreviewServerForHook) => (() => void) | void | Promise<(() => void) | void>`
- **种类：** `async`, `sequential`
- **参见：** [PreviewServerForHook](./api-javascript###previewserverforhook)

  与 [`configureServer`](/guide/api-plugin.html###configureserver) 相同，但用于预览服务器。`configurePreviewServer` 这个钩子与 `configureServer` 类似，也是在其他中间件安装前被调用。如果你想要在其他中间件 **之后** 安装一个插件，你可以从 `configurePreviewServer` 返回一个函数，它将会在内部中间件被安装之后再调用：

  ```js
  const myPlugin = () => ({
    name: 'configure-preview-server',
    configurePreviewServer(server) {
      // 返回一个钩子，会在其他中间件安装完成后调用
      return () => {
        server.middlewares.use((req, res, next) => {
          // 自定义处理请求 ...
        })
      }
    },
  })
  ```

##### `transformIndexHtml` {###transformindexhtml}

- **类型：** `IndexHtmlTransformHook | { order?: 'pre' | 'post', handler: IndexHtmlTransformHook }`
- **种类：** `async`, `sequential`

  转换 `index.html` 的专用钩子。钩子接收当前的 HTML 字符串和转换上下文。上下文在开发期间暴露[`ViteDevServer`](./api-javascript###vitedevserver)实例，在构建期间暴露 Rollup 输出的包。

  这个钩子可以是异步的，并且可以返回以下其中之一:

  - 经过转换的 HTML 字符串
  - 注入到现有 HTML 中的标签描述符对象数组（`{ tag, attrs, children }`）。每个标签也可以指定它应该被注入到哪里（默认是在 `<head>` 之前）
  - 一个包含 `{ html, tags }` 的对象

  **基础示例：**

  ```js
  const htmlPlugin = () => {
    return {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html.replace(
          /<title>(.*?)<\/title>/,
          `<title>Title replaced!</title>`,
        )
      },
    }
  }
  ```

  **完整钩子签名：**

  ```ts
  type IndexHtmlTransformHook = (
    html: string,
    ctx: {
      path: string
      filename: string
      server?: ViteDevServer
      bundle?: import('rollup').OutputBundle
      chunk?: import('rollup').OutputChunk
    },
  ) =>
    | IndexHtmlTransformResult
    | void
    | Promise<IndexHtmlTransformResult | void>

  type IndexHtmlTransformResult =
    | string
    | HtmlTagDescriptor[]
    | {
        html: string
        tags: HtmlTagDescriptor[]
      }

  interface HtmlTagDescriptor {
    tag: string
    attrs?: Record<string, string>
    children?: string | HtmlTagDescriptor[]
    /**
     * 默认： 'head-prepend'
     */
    injectTo?: 'head' | 'body' | 'head-prepend' | 'body-prepend'
  }
  ```

##### `handleHotUpdate` {###handlehotupdate}

- **类型：** `(ctx: HmrContext) => Array<ModuleNode> | void | Promise<Array<ModuleNode> | void>`

  执行自定义 HMR 更新处理。钩子接收一个带有以下签名的上下文对象：

  ```ts
  interface HmrContext {
    file: string
    timestamp: number
    modules: Array<ModuleNode>
    read: () => string | Promise<string>
    server: ViteDevServer
  }
  ```

  - `modules` 是受更改文件影响的模块数组。它是一个数组，因为单个文件可能映射到多个服务模块（例如 Vue 单文件组件）。

  - `read` 这是一个异步读函数，它返回文件的内容。之所以这样做，是因为在某些系统上，文件更改的回调函数可能会在编辑器完成文件更新之前过快地触发，并 `fs.readFile` 直接会返回空内容。传入的 `read` 函数规范了这种行为。

  钩子可以选择:

  - 过滤和缩小受影响的模块列表，使 HMR 更准确。

  - 返回一个空数组，并通过向客户端发送自定义事件来执行完整的自定义 HMR 处理:

    ```js
    handleHotUpdate({ server }) {
      server.ws.send({
        type: 'custom',
        event: 'special-update',
        data: {}
      })
      return []
    }
    ```

    客户端代码应该使用 [HMR API](./api-hmr) 注册相应的处理器（这应该被相同插件的 `transform` 钩子注入）：

    ```js
    if (import.meta.hot) {
      import.meta.hot.on('special-update', (data) => {
        // 执行自定义更新
      })
    }
    ```

#### 插件顺序 {###plugin-ordering}

一个 Vite 插件可以额外指定一个 `enforce` 属性（类似于 webpack 加载器）来调整它的应用顺序。`enforce` 的值可以是`pre` 或 `post`。解析后的插件将按照以下顺序排列：

- Alias
- 带有 `enforce: 'pre'` 的用户插件
- Vite 核心插件
- 没有 enforce 值的用户插件
- Vite 构建用的插件
- 带有 `enforce: 'post'` 的用户插件
- Vite 后置构建插件（最小化，manifest，报告）

#### 情景应用 {###conditional-application}

默认情况下插件在开发（serve）和构建（build）模式中都会调用。如果插件只需要在预览或构建期间有条件地应用，请使用 `apply` 属性指明它们仅在 `'build'` 或 `'serve'` 模式时调用：

```js
function myPlugin() {
  return {
    name: 'build-only',
    apply: 'build' // 或 'serve'
  }
}
```

同时，还可以使用函数来进行更精准的控制：

```js
apply(config, { command }) {
  // 非 SSR 情况下的 build
  return command === 'build' && !config.build.ssr
}
```

#### Rollup 插件兼容性 {###rollup-plugin-compatibility}

相当数量的 Rollup 插件将直接作为 Vite 插件工作（例如：`@rollup/plugin-alias` 或 `@rollup/plugin-json`），但并不是所有的，因为有些插件钩子在非构建式的开发服务器上下文中没有意义。

一般来说，只要 Rollup 插件符合以下标准，它就应该像 Vite 插件一样工作：

- 没有使用 [`moduleParsed`](https://rollupjs.org/plugin-development/###moduleparsed) 钩子。
- 它在打包钩子和输出钩子之间没有很强的耦合。

如果一个 Rollup 插件只在构建阶段有意义，则在 `build.rollupOptions.plugins` 下指定即可。它的工作原理与 Vite 插件的 `enforce: 'post'` 和 `apply: 'build'` 相同。

你也可以用 Vite 独有的属性来扩展现有的 Rollup 插件:

```js
// vite.config.js
import example from 'rollup-plugin-example'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    {
      ...example(),
      enforce: 'post',
      apply: 'build',
    },
  ],
})
```

查看 [Vite Rollup 插件](https://vite-rollup-plugins.patak.dev) 获取兼容的官方 Rollup 插件列表及其使用指南。

#### 路径规范化 {###path-normalization}

Vite 对路径进行了规范化处理，在解析路径时使用 POSIX 分隔符（ / ），同时保留了 Windows 中的卷名。而另一方面，Rollup 在默认情况下保持解析的路径不变，因此解析的路径在 Windows 中会使用 win32 分隔符（ \\ ）。然而，Rollup 插件会使用 `@rollup/pluginutils` 内部的 [`normalizePath` 工具函数](https://github.com/rollup/plugins/tree/master/packages/pluginutils###normalizepath)，它在执行比较之前将分隔符转换为 POSIX。所以意味着当这些插件在 Vite 中使用时，`include` 和 `exclude` 两个配置模式，以及与已解析路径比较相似的路径会正常工作。

所以对于 Vite 插件来说，在将路径与已解析的路径进行比较时，首先规范化路径以使用 POSIX 分隔符是很重要的。从 `vite` 模块中也导出了一个等效的 `normalizePath` 工具函数。

```js
import { normalizePath } from 'vite'

normalizePath('foo\\bar') // 'foo/bar'
normalizePath('foo/bar') // 'foo/bar'
```

#### 过滤与 include/exclude 模式 {###filtering-include-exclude-pattern}

Vite 暴露了 [`@rollup/pluginutils` 的 `createFilter`](https://github.com/rollup/plugins/tree/master/packages/pluginutils###createfilter) 函数，以支持 Vite 独有插件和集成使用标准的 include/exclude 过滤模式，Vite 核心自身也正在使用它。

#### 客户端与服务端间通信 {###client-server-communication}

从 Vite 2.9 开始，我们为插件提供了一些实用工具，以帮助处理与客户端的通信。

##### 服务端到客户端 {###server-to-client}

在插件一侧，我们可以使用 `server.ws.send` 去给所有客户端广播事件：

```js
// vite.config.js
export default defineConfig({
  plugins: [
    {
      // ...
      configureServer(server) {
        // 示例：等待客户端连接后再发送消息
        server.ws.on('connection', () => {
          server.ws.send('my:greetings', { msg: 'hello' })
        })
      },
    },
  ],
})
```

::: tip 注意
我们建议总是给你的事件名称 **添加前缀**，以避免与其他插件冲突。
:::

在客户端侧，使用 [`hot.on`](/guide/api-hmr.html###hot-on-event-cb) 去监听事件：

```ts
// client side
if (import.meta.hot) {
  import.meta.hot.on('my:greetings', (data) => {
    console.log(data.msg) // hello
  })
}
```

##### 客户端到服务端 {###client-to-server}

为了从客户端向服务端发送事件，我们可以使用 [`hot.send`](/guide/api-hmr.html###hot-send-event-payload)：

```ts
// client side
if (import.meta.hot) {
  import.meta.hot.send('my:from-client', { msg: 'Hey!' })
}
```

然后使用 `server.ws.on` 并在服务端监听这些事件：

```js
// vite.config.js
export default defineConfig({
  plugins: [
    {
      // ...
      configureServer(server) {
        server.ws.on('my:from-client', (data, client) => {
          console.log('Message from client:', data.msg) // Hey!
          // reply only to the client (if needed)
          client.send('my:ack', { msg: 'Hi! I got your message!' })
        })
      },
    },
  ],
})
```

##### 自定义事件的 TypeScript 类型定义指南 {###typeScript-for-custom-events}

可以通过扩展 `CustomEventMap` 这个 interface 来为自定义事件标注类型：

```ts
// events.d.ts
import 'vite/types/customEvent'

declare module 'vite/types/customEvent' {
  interface CustomEventMap {
    'custom:foo': { msg: string }
    // 'event-key': payload
  }
}
```


## HMR API

### HMR API {###hmr-api}

:::tip 注意
这里是客户端 HMR API。若要在插件中处理 HMR 更新，详见 [handleHotUpdate](./api-plugin###handlehotupdate)。

手动 HMR API 主要用于框架和工具作者。作为最终用户，HMR 可能已经在特定于框架的启动器模板中为你处理过了。
:::

Vite 通过特殊的 `import.meta.hot` 对象暴露手动 HMR API。

```ts
interface ImportMeta {
  readonly hot?: ViteHotContext
}

type ModuleNamespace = Record<string, any> & {
  [Symbol.toStringTag]: 'Module'
}

interface ViteHotContext {
  readonly data: any

  accept(): void
  accept(cb: (mod: ModuleNamespace | undefined) => void): void
  accept(dep: string, cb: (mod: ModuleNamespace | undefined) => void): void
  accept(
    deps: readonly string[],
    cb: (mods: Array<ModuleNamespace | undefined>) => void,
  ): void

  dispose(cb: (data: any) => void): void
  prune(cb: (data: any) => void): void
  invalidate(message?: string): void

  // `InferCustomEventPayload` provides types for built-in Vite events
  on<T extends string>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void,
  ): void
  send<T extends string>(event: T, data?: InferCustomEventPayload<T>): void
}
```

#### 必需的条件守卫 {###required-conditional-guard}

首先，请确保用一个条件语句守护所有 HMR API 的使用，这样代码就可以在生产环境中被 tree-shaking 优化：

```js
if (import.meta.hot) {
  // HMR 代码
}
```

#### TypeScript 的智能提示 {###intellisense-for-typescript}
Vite 在 [`vite/client.d.ts`](https://github.com/vitejs/vite/blob/main/packages/vite/client.d.ts) 中为 `import.meta.hot` 提供了类型定义。你可以在 `src` 目录中创建一个 `env.d.ts`，以便 TypeScript 获取类型定义：

```ts
/// <reference types="vite/client" />
```

#### `hot.accept(cb)` {###hot-accept-cb}

要接收模块自身，应使用 `import.meta.hot.accept`，参数为接收已更新模块的回调函数：

```js
export const count = 1

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      // newModule is undefined when SyntaxError happened
      console.log('updated: count is now ', newModule.count)
    }
  })
}
```

“接受” 热更新的模块被认为是 **HMR 边界**。

Vite 的 HMR 实际上并不替换最初导入的模块：如果 HMR 边界模块从某个依赖重新导出其导入，则它应负责更新这些重新导出的模块（这些导出必须使用 `let`）。此外，从边界模块向上的导入者将不会收到更新。这种简化的 HMR 实现对于大多数开发用例来说已经足够了，同时允许我们跳过生成代理模块的昂贵工作。

Vite 要求这个函数的调用在源代码中显示为 `import.meta.hot.accept(`（对空格敏感），这样模块才能接受更新。这是 Vite 为使模块支持 HMR 而进行的静态分析的一个要求。

#### `hot.accept(deps, cb)` {###hot-accept-deps-cb}

模块也可以接受直接依赖项的更新，而无需重新加载自身：

```js
import { foo } from './foo.js'

foo()

if (import.meta.hot) {
  import.meta.hot.accept('./foo.js', (newFoo) => {
    // 回调函数接收到更新后的'./foo.js' 模块
    newFoo?.foo()
  })

  // 也可以接受一个依赖模块的数组：
  import.meta.hot.accept(
    ['./foo.js', './bar.js'],
    ([newFooModule, newBarModule]) => {
      // 只有当所更新的模块非空时，回调函数接收一个数组
      // 如果更新不成功（例如语法错误），则该数组为空
    }
  )
}
```

#### `hot.dispose(cb)` {###hot-dispose-cb}

一个接收自身的模块或一个期望被其他模块接收的模块可以使用 `hot.dispose` 来清除任何由其更新副本产生的持久副作用：

```js
function setupSideEffect() {}

setupSideEffect()

if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    // 清理副作用
  })
}
```

#### `hot.prune(cb)` {###hot-prune-cb}

注册一个回调，当模块在页面上不再被导入时调用。与 `hot.dispose` 相比，如果源代码更新时自行清理了副作用，你只需要在模块从页面上被删除时，使用此方法进行清理。Vite 目前在 `.css` 导入上使用此方法。

```js
function setupOrReuseSideEffect() {}

setupOrReuseSideEffect()

if (import.meta.hot) {
  import.meta.hot.prune((data) => {
    // 清理副作用
  })
}
```

#### `hot.data` {###hot-data}

`import.meta.hot.data` 对象在同一个更新模块的不同实例之间持久化。它可以用于将信息从模块的前一个版本传递到下一个版本。

#### `hot.decline()` {###hot-decline}

目前是一个空操作并暂留用于向后兼容。若有新的用途设计可能在未来会发生变更。要指明某模块是不可热更新的，请使用 `hot.invalidate()`。

#### `hot.invalidate(message?: string)` {###hot-invalidate}

一个接收自身的模块可以在运行时意识到它不能处理 HMR 更新，因此需要将更新强制传递给导入者。通过调用 `import.meta.hot.invalidate()`，HMR 服务将使调用方的导入失效，就像调用方不是接收自身的一样。这会同时在浏览器控制台和命令行中打印出一条信息，你可以传入这条信息，对发生失效的原因给予一些上下文。

请注意，你应该总是调用 `import.meta.hot.accept`，即使你打算随后立即调用 `invalidate`，否则 HMR 客户端将不会监听未来对接收自身模块的更改。为了清楚地表达你的意图，我们建议在 `accept` 回调中调用 `invalidate`，例如：

```js
import.meta.hot.accept((module) => {
  // 你可以使用新的模块实例来决定是否使其失效。
  if (cannotHandleUpdate(module)) {
    import.meta.hot.invalidate()
  }
})
```

#### `hot.on(event, cb)` {###hot-onevent-cb}

监听自定义 HMR 事件。

以下 HMR 事件由 Vite 自动触发：

- `'vite:beforeUpdate'` 当更新即将被应用时（例如，一个模块将被替换）
- `'vite:afterUpdate'` 当更新已经被应用时（例如，一个模块已被替换）
- `'vite:beforeFullReload'` 当完整的重载即将发生时
- `'vite:beforePrune'` 当不再需要的模块即将被剔除时
- `'vite:invalidate'` 当使用 `import.meta.hot.invalidate()` 使一个模块失效时
- `'vite:error'` 当发生错误时（例如，语法错误）

自定义 HMR 事件可以由插件发送。更多细节详见 [handleHotUpdate](./api-plugin###handleHotUpdate)。

#### `hot.send(event, data)` {####hot-send-event-data}

发送自定义事件到 Vite 开发服务器。

如果在连接前调用，数据会先被缓存、等到连接建立好后再发送。

查看 [客户端与服务器的数据交互](/guide/api-plugin.html###client-server-communication) 一节获取更多细节。


## JavaScript API

### JavaScript API {###javascript-api}

Vite 的 JavaScript API 是完全类型化的，我们推荐使用 TypeScript 或者在 VS Code 中启用 JS 类型检查来利用智能提示和类型校验。

#### `createServer` {###createserver}

**类型签名：**

```ts
async function createServer(inlineConfig?: InlineConfig): Promise<ViteDevServer>
```

**使用示例：**

```js
import { fileURLToPath } from 'url'
import { createServer } from 'vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

;(async () => {
  const server = await createServer({
    // 任何合法的用户配置选项，加上 `mode` 和 `configFile`
    configFile: false,
    root: __dirname,
    server: {
      port: 1337,
    },
  })
  await server.listen()

  server.printUrls()
})()
```

::: tip 注意
当在同一个 Node.js 进程中使用 `createServer` 和 `build` 时，两个函数都依赖于 `process.env.NODE_ENV` 才可正常工作，而这个环境变量又依赖于 `mode` 配置项。为了避免行为冲突，请在这两个 API 传入参数 `development` 字段中设置 `process.env.NODE_ENV` 或者 `mode` 配置项，或者你也可以生成另一个子进程，分别运行这两个 API。
:::

#### `InlineConfig` {###inlineconfig}

`InlineConfig` 接口扩展了 `UserConfig` 并添加了以下属性：

- `configFile`：指明要使用的配置文件。如果没有设置，Vite 将尝试从项目根目录自动解析。设置为 `false` 可以禁用自动解析功能。
- `envFile`：设置为 `false` 时，则禁用 `.env` 文件。

#### `ResolvedConfig` {###resolvedconfig}

`ResolvedConfig` 接口和 `UserConfig` 有完全相同的属性，期望多数属性是已经解析完成且不为 undefined 的。它同样包括下面这样的工具方法：

- `config.assetsInclude`：一个函数，用来检查一个 `id` 是否被考虑为是一个资源。
- `config.logger`：Vite 内部的日志对象。

#### `ViteDevServer` {###vitedevserver}

```ts
interface ViteDevServer {
  /**
   * 被解析的 Vite 配置对象
   */
  config: ResolvedConfig
  /**
   * 一个 connect 应用实例
   * - 可以用于将自定义中间件附加到开发服务器。
   * - 还可以用作自定义http服务器的处理函数。
      或作为中间件用于任何 connect 风格的 Node.js 框架。
   *
   * https://github.com/senchalabs/connect###use-middleware
   */
  middlewares: Connect.Server
  /**
   * 本机 node http 服务器实例
   */
  httpServer: http.Server | null
  /**
   * chokidar 监听器实例
   * https://github.com/paulmillr/chokidar###api
   */
  watcher: FSWatcher
  /**
   * web socket 服务器，带有 `send(payload)` 方法。
   */
  ws: WebSocketServer
  /**
   * Rollup 插件容器，可以针对给定文件运行插件钩子。
   */
  pluginContainer: PluginContainer
  /**
   * 跟踪导入关系、url 到文件映射和 hmr 状态的模块图。
   */
  moduleGraph: ModuleGraph
  /**
   * Vite CLI 会打印出来的被解析的 URL。在中间件模式下、或是
   * 在 `server.listen` 调用之前会是 null
   */
  resolvedUrls: ResolvedServerUrls | null
  /**
   * 编程式地解析、加载和转换一个 URL 并获得
   * 还没有进入 HTTP 请求管道中的结果
   */
  transformRequest(
    url: string,
    options?: TransformOptions,
  ): Promise<TransformResult | null>
  /**
   * 应用 Vite 内建 HTML 转换和任意插件 HTML 转换
   */
  transformIndexHtml(url: string, html: string): Promise<string>
  /**
   * 加载一个给定的 URL 作为 SSR 的实例化模块
   */
  ssrLoadModule(
    url: string,
    options?: { fixStacktrace?: boolean },
  ): Promise<Record<string, any>>
  /**
   * 解决 ssr 错误堆栈信息
   */
  ssrFixStacktrace(e: Error): void
  /**
   * 触发模块图中某个模块的 HMR。你可以使用 `server.moduleGraph`
   * API 来检索要重新加载的模块。如果 `hmr` 是 `false`，则不进行任何操作
   */
  reloadModule(module: ModuleNode): Promise<void>
  /**
   * 启动服务器
   */
  listen(port?: number, isRestart?: boolean): Promise<ViteDevServer>
  /**
   * 重启服务器
   *
   * @param forceOptimize - 强制优化器打包，和命令行内使用 --force 一致
   */
  restart(forceOptimize?: boolean): Promise<void>
  /**
   * 停止服务器
   */
  close(): Promise<void>
}
```

#### `build` {###build}

**类型校验：**

```ts
async function build(
  inlineConfig?: InlineConfig,
): Promise<RollupOutput | RollupOutput[]>
```

**使用示例：**

```js
import path from 'path'
import { fileURLToPath } from 'url'
import { build } from 'vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

;(async () => {
  await build({
    root: path.resolve(__dirname, './project'),
    base: '/foo/',
    build: {
      rollupOptions: {
        // ...
      },
    },
  })
})()
```

#### `preview` {###preview}

**类型签名：**

```ts
async function preview(inlineConfig?: InlineConfig): Promise<PreviewServer>
```

**示例用法：**

```js
import { preview } from 'vite'
;(async () => {
  const previewServer = await preview({
    // 任何有效的用户配置项，将加上 `mode` 和 `configFile`
    preview: {
      port: 8080,
      open: true,
    },
  })

  previewServer.printUrls()
})()
```

#### `PreviewServer`

```ts
interface PreviewServer extends PreviewServerForHook {
  resolvedUrls: ResolvedServerUrls
}
```

#### `PreviewServerForHook`

```ts
interface PreviewServerForHook {
  /**
   * 解析后的 vite 配置对象
   */
  config: ResolvedConfig
  /**
   * 一个 connect 应用实例。
   * - 可用作将自定义中间件附加到预览服务器上。
   * - 还可用作自定义 HTTP 服务器的处理函数
   *   或作为任何 connect 风格的 Node.js 框架的中间件
   *
   * https://github.com/senchalabs/connect###use-middleware
   */
  middlewares: Connect.Server
  /**
   * 原生 Node http 服务器实例
   */
  httpServer: http.Server
  /**
   * Vite 在 CLI 中输出的解析后的 URL
   */
  resolvedUrls: ResolvedServerUrls | null
  /**
   * 打印服务器 URL
   */
  printUrls(): void
}
```

#### `resolveConfig` {###resolveconfig}

**类型校验：**

```ts
async function resolveConfig(
  inlineConfig: InlineConfig,
  command: 'build' | 'serve',
  defaultMode = 'development',
): Promise<ResolvedConfig>
```

该 `command` 值在开发环境（即 CLI 命令 `vite`、`vite dev` 和 `vite serve`） 为 `serve`。

#### `mergeConfig`

**类型签名：**

```ts
function mergeConfig(
  defaults: Record<string, any>,
  overrides: Record<string, any>,
  isRoot = true,
): Record<string, any>
```

深度合并两份配置。`isRoot` 代表着 Vite 配置被合并的层级。举个例子，如果你是要合并两个 `build` 选项请设为 `false`。

#### `searchForWorkspaceRoot`

**类型签名：**

```ts
function searchForWorkspaceRoot(
  current: string,
  root = searchForPackageRoot(current),
): string
```

**相关内容：** [server.fs.allow](/config/server-options.md###server-fs-allow)

如果当前工作空间满足以下条件，则搜索它的根目录，否则它将回退到 `root`：

- `package.json` 中包含 `workspaces` 字段
- 包含以下文件之一：
  - `lerna.json`
  - `pnpm-workspace.yaml`

#### `loadEnv`

**类型签名：**

```ts
function loadEnv(
  mode: string,
  envDir: string,
  prefixes: string | string[] = 'VITE_',
): Record<string, string>
```

**相关内容：** [`.env` Files](./env-and-mode.md###env-files)

加载 `envDir` 中的 `.env` 文件。默认情况下只有前缀为 `VITE_` 会被加载，除非更改了 `prefixes` 配置。

#### `normalizePath`

**类型签名：**

```ts
function normalizePath(id: string): string
```

**相关内容：** [路径规范化](./api-plugin.md###path-normalization)

规范化路径，以便在 Vite 插件之间互操作。

#### `transformWithEsbuild`

**类型签名：**

```ts
async function transformWithEsbuild(
  code: string,
  filename: string,
  options?: EsbuildTransformOptions,
  inMap?: object,
): Promise<ESBuildTransformResult>
```

通过 esbuild 转换 JavaScript 或 TypeScript 文件。对于更想要匹配 Vite 内部 esbuild 转换的插件很有用。

#### `loadConfigFromFile`

**类型签名：**

```ts
async function loadConfigFromFile(
  configEnv: ConfigEnv,
  configFile?: string,
  configRoot: string = process.cwd(),
  logLevel?: LogLevel,
): Promise<{
  path: string
  config: UserConfig
  dependencies: string[]
} | null>
```

手动通过 esbuild 加载一份 Vite 配置。


## 配置参考

### 配置 Vite {###configuring-vite}

当以命令行方式运行 `vite` 时，Vite 会自动解析 [项目根目录](/guide/###index-html-and-project-root) 下名为 `vite.config.js` 的文件。

最基础的配置文件是这样的：

```js
// vite.config.js
export default {
  // 配置选项
}
```

注意：即使项目没有在 `package.json` 中开启 `type: "module"`，Vite 也支持在配置文件中使用 ESM 语法。这种情况下，配置文件会在被加载前自动进行预处理。

你可以显式地通过 `--config` 命令行选项指定一个配置文件（相对于 `cwd` 路径进行解析）

```bash
vite --config my-config.js
```

#### 配置智能提示 {###config-intellisense}

因为 Vite 本身附带 TypeScript 类型，所以你可以通过 IDE 和 jsdoc 的配合来实现智能提示：

```js
/** @type {import('vite').UserConfig} */
export default {
  // ...
}
```

另外你可以使用 `defineConfig` 工具函数，这样不用 jsdoc 注解也可以获取类型提示：

```js
import { defineConfig } from 'vite'

export default defineConfig({
  // ...
})
```

Vite 也直接支持 TS 配置文件。你可以在 `vite.config.ts` 中使用 `defineConfig` 工具函数。

#### 情景配置 {###conditional-config}

如果配置文件需要基于（`dev`/`serve` 或 `build`）命令或者不同的 [模式](/guide/env-and-mode) 来决定选项，亦或者是一个 SSR 构建（`ssrBuild`），则可以选择导出这样一个函数：

```js
export default defineConfig(({ command, mode, ssrBuild }) => {
  if (command === 'serve') {
    return {
      // dev 独有配置
    }
  } else {
    // command === 'build'
    return {
      // build 独有配置
    }
  }
})
```

需要注意的是，在 Vite 的 API 中，在开发环境下 `command` 的值为 `serve`（在 CLI 中， `vite dev` 和 `vite serve` 是 `vite` 的别名），而在生产环境下为 `build`（`vite build`）。

`ssrBuild` 仍是实验性的。它只在构建过程中可用，而不是一个更通用的 `ssr` 标志，因为在开发过程中，我们唯一的服务器会共享处理 SSR 和非 SSR 请求的配置。某些工具可能没有区分浏览器和 SSR 两种构建目标的命令，那么这个值可能是 `undefined`，因此需要采用显式的比较表达式。

#### 异步配置 {###async-config}

如果配置需要调用一个异步函数，也可以转而导出一个异步函数：

```js
export default defineConfig(async ({ command, mode }) => {
  const data = await asyncFunction()
  return {
    // vite 配置
  }
})
```

#### 在配置中使用环境变量 {###using-environment-variables-in-config}

环境变量通常可以从 `process.env` 获得。

注意 Vite 默认是不加载 `.env` 文件的，因为这些文件需要在执行完 Vite 配置后才能确定加载哪一个，举个例子，`root` 和 `envDir` 选项会影响加载行为。不过当你的确需要时，你可以使用 Vite 导出的 `loadEnv` 函数来加载指定的 `.env` 文件。

```js
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ command, mode }) => {
  // 根据当前工作目录中的 `mode` 加载 .env 文件
  // 设置第三个参数为 '' 来加载所有环境变量，而不管是否有 `VITE_` 前缀。
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // vite 配置
    define: {
      __APP_ENV__: env.APP_ENV,
    },
  }
})
```
