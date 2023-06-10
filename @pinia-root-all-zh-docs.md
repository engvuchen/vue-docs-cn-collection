# 介绍

## Pinia 是什么？

### 简介 %{#introduction}%

<VueSchoolLink
  href="https://vueschool.io/lessons/introduction-to-pinia"
  title="Get started with Pinia"
/>

Pinia [起始](https://github.com/vuejs/pinia/commit/06aeef54e2cad66696063c62829dac74e15fd19e)于 2019 年 11 月左右的一次实验，其目的是设计一个拥有[组合式 API](https://github.com/vuejs/composition-api) 的 Vue 状态管理库。从那时起，我们就倾向于同时支持 Vue 2 和 Vue 3，并且不强制要求开发者使用组合式 API，我们的初心至今没有改变。除了**安装**和 **SSR** 两章之外，其余章节中提到的 API 均支持 Vue 2 和 Vue 3。虽然本文档主要是面向 Vue 3 的用户，但在必要时会标注出 Vue 2 的内容，因此 Vue 2 和 Vue 3 的用户都可以阅读本文档。

#### 为什么你应该使用 Pinia？%{#why-should-i-use-pinia}%

Pinia 是 Vue 的专属状态管理库，它允许你跨组件或页面共享状态。如果你熟悉组合式 API 的话，你可能会认为可以通过一行简单的 `export const state = reactive({})` 来共享一个全局状态。对于单页应用来说确实可以，但如果应用在服务器端渲染，这可能会使你的应用暴露出一些安全漏洞。 而如果使用 Pinia，即使在小型单页应用中，你也可以获得如下功能：

- Devtools 支持
  - 追踪 actions、mutations 的时间线
  - 在组件中展示它们所用到的 Store
  - 让调试更容易的 Time travel
- 热更新
  - 不必重载页面即可修改 Store
  - 开发时可保持当前的 State
- 插件：可通过插件扩展 Pinia 功能
- 为 JS 开发者提供适当的 TypeScript 支持以及**自动补全**功能。
- 支持服务端渲染

#### 基础示例 %{#basic-example}%

下面就是 pinia API 的基本用法 (为继续阅读本简介请确保你已阅读过了[开始](https://pinia.vuejs.org/zh/getting-started)章节)。你可以先创建一个 Store：

```js
// stores/counter.js
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => {
    return { count: 0 }
  },
  // 也可以这样定义
  // state: () => ({ count: 0 })
  actions: {
    increment() {
      this.count++
    },
  },
})
```

然后你就可以在一个组件中使用该 store 了：

```vue
<script setup>
import { useCounterStore } from '@/stores/counter'
const counter = useCounterStore()
counter.count++
// 自动补全！ ✨
counter.$patch({ count: counter.count + 1 })
// 或使用 action 代替
counter.increment()
</script>
<template>
  <!-- 直接从 store 中访问 state -->
  <div>Current Count: {{ counter.count }}</div>
</template>
```

为实现更多高级用法，你甚至可以使用一个函数 (与组件 `setup()` 类似) 来定义一个 Store：

```js
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  function increment() {
    count.value++
  }

  return { count, increment }
})
```

如果你还不熟悉 setup() 函数和组合式 API，别担心，Pinia 也提供了一组类似 Vuex 的 [映射 state 的辅助函数](https://vuex.vuejs.org/zh/guide/state.html#mapstate-辅助函数)。你可以用和之前一样的方式来定义 Store，然后通过 `mapStores()`、`mapState()` 或 `mapActions()` 访问：

```js {22,24,28}
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++
    },
  },
})

const useUserStore = defineStore('user', {
  // ...
})

export default defineComponent({
  computed: {
    // 其他计算属性
    // ...
    // 允许访问 this.counterStore 和 this.userStore
    ...mapStores(useCounterStore, useUserStore)
    // 允许读取 this.count 和 this.double
    ...mapState(useCounterStore, ['count', 'double']),
  },
  methods: {
    // 允许读取 this.increment()
    ...mapActions(useCounterStore, ['increment']),
  },
})
```

你将会在核心概念部分了解到更多关于每个**映射辅助函数**的信息。

#### 为什么取名 *Pinia*？%{#why-pinia}%

Pinia (发音为 `/piːnjʌ/`，类似英文中的 “peenya”) 是最接近有效包名 piña (西班牙语中的 *pineapple*，即“菠萝”) 的词。 菠萝花实际上是一组各自独立的花朵，它们结合在一起，由此形成一个多重的水果。 与 Store 类似，每一个都是独立诞生的，但最终它们都是相互联系的。 它(菠萝)也是一种原产于南美洲的美味热带水果。

#### 更真实的示例 %{#a-more-realistic-example}%

这是一个更完整的 Pinia API 示例，在 JavaScript 中也使用了类型提示。对于某些开发者来说，可能足以在不进一步阅读的情况下直接开始阅读本节内容，但我们仍然建议你先继续阅读文档的其余部分，甚至跳过此示例，在阅读完所有**核心概念**之后再回来。

```js
import { defineStore } from 'pinia'

export const useTodos = defineStore('todos', {
  state: () => ({
    /** @type {{ text: string, id: number, isFinished: boolean }[]} */
    todos: [],
    /** @type {'all' | 'finished' | 'unfinished'} */
    filter: 'all',
    // 类型将自动推断为 number
    nextId: 0,
  }),
  getters: {
    finishedTodos(state) {
      // 自动补全！ ✨
      return state.todos.filter((todo) => todo.isFinished)
    },
    unfinishedTodos(state) {
      return state.todos.filter((todo) => !todo.isFinished)
    },
    /**
     * @returns {{ text: string, id: number, isFinished: boolean }[]}
     */
    filteredTodos(state) {
      if (this.filter === 'finished') {
        // 调用其他带有自动补全的 getters ✨
        return this.finishedTodos
      } else if (this.filter === 'unfinished') {
        return this.unfinishedTodos
      }
      return this.todos
    },
  },
  actions: {
    // 接受任何数量的参数，返回一个 Promise 或不返回
    addTodo(text) {
      // 你可以直接变更该状态
      this.todos.push({ text, id: this.nextId++, isFinished: false })
    },
  },
})
```

#### 对比 Vuex %{#comparison-with-vuex}%

Pinia 起源于一次探索 Vuex 下一个迭代的实验，因此结合了 Vuex 5 核心团队讨论中的许多想法。最后，我们意识到 Pinia 已经实现了我们在 Vuex 5 中想要的大部分功能，所以决定将其作为新的推荐方案来代替 Vuex。

与 Vuex 相比，Pinia 不仅提供了一个更简单的 API，也提供了符合组合式 API 风格的 API，最重要的是，搭配 TypeScript 一起使用时有非常可靠的类型推断支持。

##### RFC %{#rfcs}%

最初，Pinia 没有经过任何 RFC 的流程。我基于自己开发应用的经验，同时通过阅读其他人的代码，为使用 Pinia 的用户工作，以及在 Discord 上回答问题等方式验证了一些想法。
这些经历使我产出了这样一个可用的解决方案，并适应了各种场景和应用规模。我会一直在保持其核心 API 不变的情况下发布新版本，同时不断优化本库。

现在 Pinia 已经成为推荐的状态管理解决方案，它和 Vue 生态系统中的其他核心库一样，都要经过 RFC 流程，它的 API 也已经进入稳定状态。

##### 对比 Vuex 3.x/4.x %{#comparison-with-vuex-3-x-4-x}%

> Vuex 3.x 只适配 Vue 2，而 Vuex 4.x 是适配 Vue 3 的。

Pinia API 与 Vuex(<=4) 也有很多不同，即：

- *mutation* 已被弃用。它们经常被认为是**极其冗余的**。它们初衷是带来 devtools 的集成方案，但这已不再是一个问题了。
- 无需要创建自定义的复杂包装器来支持 TypeScript，一切都可标注类型，API 的设计方式是尽可能地利用 TS 类型推理。
- 无过多的魔法字符串注入，只需要导入函数并调用它们，然后享受自动补全的乐趣就好。
- 无需要动态添加 Store，它们默认都是动态的，甚至你可能都不会注意到这点。注意，你仍然可以在任何时候手动使用一个 Store 来注册它，但因为它是自动的，所以你不需要担心它。
- 不再有嵌套结构的**模块**。你仍然可以通过导入和使用另一个 Store 来隐含地嵌套 stores 空间。虽然 Pinia 从设计上提供的是一个扁平的结构，但仍然能够在 Store 之间进行交叉组合。**你甚至可以让 Stores 有循环依赖关系**。
- 不再有**可命名的模块**。考虑到 Store 的扁平架构，Store 的命名取决于它们的定义方式，你甚至可以说所有 Store 都应该命名。

关于如何将现有 Vuex(<=4) 的项目转化为使用 Pinia 的更多详细说明，请参阅 [Vuex 迁移指南](https://pinia.vuejs.org/zh/cookbook/migration-vuex)。


## 开始

#### 安装 %{#installation}%

用你喜欢的包管理器安装 `pinia`：

```bash
yarn add pinia
### 或者使用 npm
npm install pinia
```

:::tip
如果你的应用使用的 Vue 版本低于 2.7，你还需要安装组合式 API 包：`@vue/composition-api`。如果你使用的是 Nuxt，你应该参考[这篇指南](https://pinia.vuejs.org/zh/ssr/nuxt)。
:::

如果你正在使用 Vue CLI，你可以试试这个[**非官方插件**](https://github.com/wobsoriano/vue-cli-plugin-pinia)。

创建一个 pinia 实例 (根 store) 并将其传递给应用：

```js {2,5-6,8}
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.mount('#app')
```

如果你使用的是 Vue 2，你还需要安装一个插件，并在应用的根部注入创建的 `pinia`：

```js {1,3-4,12}
import { createPinia, PiniaVuePlugin } from 'pinia'

Vue.use(PiniaVuePlugin)
const pinia = createPinia()

new Vue({
  el: '#app',
  // 其他配置...
  // ...
  // 请注意，同一个`pinia'实例
  // 可以在同一个页面的多个 Vue 应用中使用。 
  pinia,
})
```

这样才能提供 devtools 的支持。在 Vue 3 中，一些功能仍然不被支持，如 time traveling 和编辑，这是因为 vue-devtools 还没有相关的 API，但 devtools 也有很多针对 Vue 3 的专属功能，而且就开发者的体验来说，Vue 3 整体上要好得多。在 Vue 2 中，Pinia 使用的是 Vuex 的现有接口 (因此不能与 Vuex 一起使用) 。

#### Store 是什么？%{#what-is-a-store}%

Store (如 Pinia) 是一个保存状态和业务逻辑的实体，它并不与你的组件树绑定。换句话说，**它承载着全局状态**。它有点像一个永远存在的组件，每个组件都可以读取和写入它。它有**三个概念**，[state](https://pinia.vuejs.org/zh/core-concepts/state)、[getter](https://pinia.vuejs.org/zh/core-concepts/getters) 和 [action](https://pinia.vuejs.org/zh/core-concepts/actions)，我们可以假设这些概念相当于组件中的 `data`、 `computed` 和 `methods`。

#### 应该在什么时候使用 Store? %{#when-should-i-use-a-store}%

一个 Store 应该包含可以在整个应用中访问的数据。这包括在许多地方使用的数据，例如显示在导航栏中的用户信息，以及需要通过页面保存的数据，例如一个非常复杂的多步骤表单。

另一方面，你应该避免在 Store 中引入那些原本可以在组件中保存的本地数据，例如，一个元素在页面中的可见性。

并非所有的应用都需要访问全局状态，但如果你的应用确实需要一个全局状态，那 Pinia 将使你的开发过程更轻松。

# 核心概念

## 定义 Store

### 定义 Store %{#defining-a-store}%

<VueSchoolLink
  href="https://vueschool.io/lessons/define-your-first-pinia-store"
  title="Learn how to define and use stores in Pinia"
/>

在深入研究核心概念之前，我们得知道 Store 是用 `defineStore()` 定义的，它的第一个参数要求是一个**独一无二的**名字：

```js
import { defineStore } from 'pinia'

// 你可以对 `defineStore()` 的返回值进行任意命名，但最好使用 store 的名字，同时以 `use` 开头且以 `Store` 结尾。(比如 `useUserStore`，`useCartStore`，`useProductStore`)
// 第一个参数是你的应用中 Store 的唯一 ID。
export const useAlertsStore = defineStore('alerts', {
  // 其他配置...
})
```

这个**名字** ，也被用作 *id* ，是必须传入的， Pinia 将用它来连接 store 和 devtools。为了养成习惯性的用法，将返回的函数命名为 *use...* 是一个符合组合式函数风格的约定。

`defineStore()` 的第二个参数可接受两类值：Setup 函数或 Option 对象。

#### Option Store %{#option-stores}%

与 Vue 的选项式 API 类似，我们也可以传入一个带有 `state`、`actions` 与 `getters` 属性的 Option 对象

```js {2-10}
export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++
    },
  },
})
```

你可以认为 `state` 是 store 的数据 (`data`)，`getters` 是 store 的计算属性 (`computed`)，而 `actions` 则是方法 (`methods`)。

为方便上手使用，Option Store 应尽可能直观简单。

#### Setup Store %{#setup-stores}%

也存在另一种定义 store 的可用语法。与 Vue 组合式 API 的 [setup 函数](https://cn.vuejs.org/api/composition-api-setup.html) 相似，我们可以传入一个函数，该函数定义了一些响应式属性和方法，并且返回一个带有我们想暴露出去的属性和方法的对象。

```js
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  function increment() {
    count.value++
  }

  return { count, increment }
})
```

在 *Setup Store* 中：

- `ref()` 就是 `state` 属性
- `computed()` 就是 `getters`
- `function()` 就是 `actions`

Setup store 比 [Option Store](https://pinia.vuejs.org/zh/core-concepts/#option-stores) 带来了更多的灵活性，因为你可以在一个 store 内创建侦听器，并自由地使用任何[组合式函数](https://cn.vuejs.org/guide/reusability/composables.html#composables)。不过，请记住，使用组合式函数会让 [SSR](https://pinia.vuejs.org/zh/cookbook/composables) 变得更加复杂。

#### 你应该选用哪种语法？ %{#what-syntax-should-i-pick}%

和[在 Vue 中如何选择组合式 API 与选项式 API](https://cn.vuejs.org/guide/introduction.html#which-to-choose) 一样，选择你觉得最舒服的那一个就好。如果你还不确定，可以先试试 [Option Store](https://pinia.vuejs.org/zh/core-concepts/#option-stores)。

#### 使用 Store %{#using-the-store}%

虽然我们前面定义了一个 store，但在我们使用 `<script setup>` 调用 `useStore()`(或者使用 `setup()` 函数，**像所有的组件那样**) 之前，store 实例是不会被创建的：

```vue
<script setup>
import { useCounterStore } from '@/stores/counter'
// 可以在组件中的任意位置访问 `store` 变量 ✨
const store = useCounterStore()
</script>
```

你可以定义任意多的 store，但为了让使用 pinia 的益处最大化(比如允许构建工具自动进行代码分割以及 TypeScript 推断)，**你应该在不同的文件中去定义 store**。

如果你还不会使用 `setup` 组件，[你也可以通过**映射辅助函数**来使用 Pinia](https://pinia.vuejs.org/zh/cookbook/options-api)。

一旦 store 被实例化，你可以直接访问在 store 的 `state`、`getters` 和 `actions` 中定义的任何属性。我们将在后续章节继续了解这些细节，目前自动补全将帮助你使用相关属性。

请注意，`store` 是一个用 `reactive` 包装的对象，这意味着不需要在 getters 后面写 `.value`，就像 `setup` 中的 `props` 一样，**如果你写了，我们也不能解构它**：

```vue
<script setup>
const store = useCounterStore()
// ❌ 这将不起作用，因为它破坏了响应性
// 这就和直接解构 `props` 一样
const { name, doubleCount } = store // [!code warning]
name // 将始终是 "Eduardo" // [!code warning]
doubleCount // 将始终是 0 // [!code warning]
setTimeout(() => {
  store.increment()
}, 1000)
// ✅ 这样写是响应式的
// 💡 当然你也可以直接使用 `store.doubleCount`
const doubleValue = computed(() => store.doubleCount)
</script>
```

为了从 store 中提取属性时保持其响应性，你需要使用 `storeToRefs()`。它将为每一个响应式属性创建引用。当你只使用 store 的状态而不调用任何 action 时，它会非常有用。请注意，你可以直接从 store 中解构 action，因为它们也被绑定到 store 上：

```vue
<script setup>
import { storeToRefs } from 'pinia'
const store = useCounterStore()
// `name` 和 `doubleCount` 是响应式的 ref
// 同时通过插件添加的属性也会被提取为 ref
// 并且会跳过所有的 action 或非响应式 (不是 ref 或 reactive) 的属性
const { name, doubleCount } = storeToRefs(store)
// 作为 action 的 increment 可以直接解构
const { increment } = store
</script>
```


## State

### State %{#state}%

<VueSchoolLink
  href="https://vueschool.io/lessons/access-state-from-a-pinia-store"
  title="Learn all about state in Pinia"
/>

在大多数情况下，state 都是你的 store 的核心。人们通常会先定义能代表他们 APP 的 state。在 Pinia 中，state 被定义为一个返回初始状态的函数。这使得 Pinia 可以同时支持服务端和客户端。

```js
import { defineStore } from 'pinia'

const useStore = defineStore('storeId', {
  // 为了完整类型推理，推荐使用箭头函数
  state: () => {
    return {
      // 所有这些属性都将自动推断出它们的类型
      count: 0,
      name: 'Eduardo',
      isAdmin: true,
      items: [],
      hasChanged: true,
    }
  },
})
```

:::tip
如果你使用的是 Vue 2，你在 `state` 中创建的数据与 Vue 实例中的  `data` 遵循同样的规则，即 state 对象必须是清晰的，当你想向其**添加新属性**时，你需要调用 `Vue.set()` 。**参考：[Vue#data](https://v2.cn.vuejs.org/v2/api/#data)**。
:::

#### TypeScript %{#typescript}%

你并不需要做太多努力就能使你的 state 兼容 TS。 Pinia 会自动推断出你的 state 的类型，但在一些情况下，你得用一些方法来帮它一把。

```ts
const useStore = defineStore('storeId', {
  state: () => {
    return {
      // 用于初始化空列表
      userList: [] as UserInfo[],
      // 用于尚未加载的数据
      user: null as UserInfo | null,
    }
  },
})

interface UserInfo {
  name: string
  age: number
}
```

如果你愿意，你可以用一个接口定义 state，并添加 `state()` 的返回值的类型。

```ts
interface State {
  userList: UserInfo[]
  user: UserInfo | null
}

const useStore = defineStore('storeId', {
  state: (): State => {
    return {
      userList: [],
      user: null,
    }
  },
})

interface UserInfo {
  name: string
  age: number
}
```

#### 访问 `state` %{#accessing-the-state}%

默认情况下，你可以通过 `store` 实例访问 state，直接对其进行读写。

```js
const store = useStore()

store.count++
```

#### 重置 state %{#resetting-the-state}%

你可以通过调用 store 的 `$reset()` 方法将 state 重置为初始值。

```js
const store = useStore()

store.$reset()
```

##### 使用选项式 API 的用法 %{#usage-with-the-options-api}%

<VueSchoolLink
  href="https://vueschool.io/lessons/access-pinia-state-in-the-options-api"
  title="Access Pinia State via the Options API"
/>

在下面的例子中，你可以假设相关 store 已经创建了：

```js
// 示例文件路径：
// ./src/stores/counter.js

import { defineStore } from 'pinia'

const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
  }),
})
```

如果你不能使用组合式 API，但你可以使用 `computed`，`methods`，...，那你可以使用 `mapState()` 辅助函数将 state 属性映射为只读的计算属性：

```js
import { mapState } from 'pinia'
import { useCounterStore } from '../stores/counter'

export default {
  computed: {
    // 可以访问组件中的 this.count
    // 与从 store.count 中读取的数据相同
    ...mapState(useCounterStore, ['count'])
    // 与上述相同，但将其注册为 this.myOwnName
    ...mapState(useCounterStore, {
      myOwnName: 'count',
      // 你也可以写一个函数来获得对 store 的访问权
      double: store => store.count * 2,
      // 它可以访问 `this`，但它没有标注类型...
      magicValue(store) {
        return store.someGetter + this.count + this.double
      },
    }),
  },
}
```

###### 可修改的 state %{#modifiable-state}%

如果你想修改这些 state 属性 (例如，如果你有一个表单)，你可以使用 `mapWritableState()` 作为代替。但注意你不能像 `mapState()` 那样传递一个函数：

```js
import { mapWritableState } from 'pinia'
import { useCounterStore } from '../stores/counter'

export default {
  computed: {
    // 可以访问组件中的 this.count，并允许设置它。
    // this.count++
    // 与从 store.count 中读取的数据相同
    ...mapWritableState(useCounterStore, ['count'])
    // 与上述相同，但将其注册为 this.myOwnName
    ...mapWritableState(useCounterStore, {
      myOwnName: 'count',
    }),
  },
}
```

:::tip
对于像数组这样的集合，你并不一定需要使用 `mapWritableState()`，`mapState()` 也允许你调用集合上的方法，除非你想用 `cartItems = []` 替换整个数组。
:::

#### 变更 state %{#mutating-the-state}%

<!-- TODO: disable this with `strictMode` -->

除了用 `store.count++` 直接改变 store，你还可以调用 `$patch` 方法。它允许你用一个 `state` 的补丁对象在同一时间更改多个属性：

```js
store.$patch({
  count: store.count + 1,
  age: 120,
  name: 'DIO',
})
```

不过，用这种语法的话，有些变更真的很难实现或者很耗时：任何集合的修改（例如，向数组中添加、移除一个元素或是做 `splice` 操作）都需要你创建一个新的集合。因此，`$patch` 方法也接受一个函数来组合这种难以用补丁对象实现的变更。

```js
store.$patch((state) => {
  state.items.push({ name: 'shoes', quantity: 1 })
  state.hasChanged = true
})
```

<!-- TODO: disable this with `strictMode`, `{ noDirectPatch: true }` -->

两种变更 store 方法的主要区别是，`$patch()` 允许你将多个变更归入 devtools 的同一个条目中。同时请注意，**直接修改 `state`，`$patch()` 也会出现在 devtools 中**，而且可以进行 time travel (在 Vue 3 中还没有)。

#### 替换 `state` %{#replacing-the-state}%

你**不能完全替换掉** store 的 state，因为那样会破坏其响应性。但是，你可以 *patch* 它。

```js
// 这实际上并没有替换`$state`
store.$state = { count: 24 }
// 在它内部调用 `$patch()`：
store.$patch({ count: 24 })
```

你也可以通过变更 `pinia` 实例的 `state` 来设置整个应用的初始 state。这常用于 [SSR 中的激活过程](https://pinia.vuejs.org/zh/ssr#state-hydration)。

```js
pinia.state.value = {}
```

#### 订阅 state %{#subscribing-to-the-state}%

类似于 Vuex 的 [subscribe 方法](https://vuex.vuejs.org/zh/api/index.html#subscribe)，你可以通过 store 的 `$subscribe()` 方法侦听 state 及其变化。比起普通的 `watch()`，使用 `$subscribe()` 的好处是 *subscriptions* 在 *patch* 后只触发一次 (例如，当使用上面的函数版本时)。

```js
cartStore.$subscribe((mutation, state) => {
  // import { MutationType } from 'pinia'
  mutation.type // 'direct' | 'patch object' | 'patch function'
  // 和 cartStore.$id 一样
  mutation.storeId // 'cart'
  // 只有 mutation.type === 'patch object'的情况下才可用
  mutation.payload // 传递给 cartStore.$patch() 的补丁对象。

  // 每当状态发生变化时，将整个 state 持久化到本地存储。
  localStorage.setItem('cart', JSON.stringify(state))
})
```

默认情况下，*state subscription* 会被绑定到添加它们的组件上 (如果 store 在组件的 `setup()` 里面)。这意味着，当该组件被卸载时，它们将被自动删除。如果你想在组件卸载后依旧保留它们，请将 `{ detached: true }` 作为第二个参数，以将 *state subscription* 从当前组件中*分离*：

```vue
<script setup>
const someStore = useSomeStore()
// 此订阅器即便在组件卸载之后仍会被保留
someStore.$subscribe(callback, { detached: true })
</script>
```

:::tip
你可以在 `pinia` 实例上使用 `watch()` 函数侦听整个 state。

```js
watch(
  pinia.state,
  (state) => {
    // 每当状态发生变化时，将整个 state 持久化到本地存储。
    localStorage.setItem('piniaState', JSON.stringify(state))
  },
  { deep: true }
)
```

:::


## Getter

### Getter %{#getters}%

<VueSchoolLink
  href="https://vueschool.io/lessons/getters-in-pinia"
  title="Learn all about getters in Pinia"
/>

Getter 完全等同于 store 的 state 的[计算值](https://cn.vuejs.org/guide/essentials/computed.html)。可以通过 `defineStore()` 中的 `getters` 属性来定义它们。**推荐**使用箭头函数，并且它将接收 `state` 作为第一个参数：

```js
export const useStore = defineStore('main', {
  state: () => ({
    count: 0,
  }),
  getters: {
    doubleCount: (state) => state.count * 2,
  },
})
```

大多数时候，getter 仅依赖 state，不过，有时它们也可能会使用其他 getter。因此，即使在使用常规函数定义 getter 时，我们也可以通过 `this` 访问到**整个 store 实例**，**但(在 TypeScript 中)必须定义返回类型**。这是为了避免 TypeScript 的已知缺陷，**不过这不影响用箭头函数定义的 getter，也不会影响不使用 `this` 的 getter**。

```ts
export const useStore = defineStore('main', {
  state: () => ({
    count: 0,
  }),
  getters: {
    // 自动推断出返回类型是一个 number
    doubleCount(state) {
      return state.count * 2
    },
    // 返回类型**必须**明确设置
    doublePlusOne(): number {
      // 整个 store 的 自动补全和类型标注 ✨
      return this.doubleCount + 1
    },
  },
})
```

然后你可以直接访问 store 实例上的 getter 了：

```vue
<script setup>
import { useCounterStore } from './counterStore'
const store = useCounterStore()
</script>
<template>
  <p>Double count is {{ store.doubleCount }}</p>
</template>
```

#### 访问其他 getter %{#accessing-other-getters}%

与计算属性一样，你也可以组合多个 getter。通过 `this`，你可以访问到其他任何 getter。即使你没有使用 TypeScript，你也可以用 [JSDoc](https://jsdoc.app/tags-returns.html) 来让你的 IDE 提示类型。

```js
export const useStore = defineStore('main', {
  state: () => ({
    count: 0,
  }),
  getters: {
    // 类型是自动推断出来的，因为我们没有使用 `this`
    doubleCount: (state) => state.count * 2,
    // 这里我们需要自己添加类型(在 JS 中使用 JSDoc)
    // 可以用 this 来引用 getter
    /**
     * 返回 count 的值乘以 2 加 1
     *
     * @returns {number}
     */
    doubleCountPlusOne() {
      // 自动补全 ✨
      return this.doubleCount + 1
    },
  },
})
```

#### 向 getter 传递参数 %{#passing-arguments-to-getters}%

*Getter* 只是幕后的**计算**属性，所以不可以向它们传递任何参数。不过，你可以从 *getter* 返回一个函数，该函数可以接受任意参数：

```js
export const useStore = defineStore('main', {
  getters: {
    getUserById: (state) => {
      return (userId) => state.users.find((user) => user.id === userId)
    },
  },
})
```

并在组件中使用：

```vue
<script setup>
import { useUserListStore } from './store'
const userList = useUserListStore()
const { getUserById } = storeToRefs(userList)
// 请注意，你需要使用 `getUserById.value` 来访问
// <script setup> 中的函数
</script>

<template>
  <p>User 2: {{ getUserById(2) }}</p>
</template>
```

请注意，当你这样做时，**getter 将不再被缓存**，它们只是一个被你调用的函数。不过，你可以在 getter 本身中缓存一些结果，虽然这种做法并不常见，但有证明表明它的性能会更好：

```js
export const useStore = defineStore('main', {
  getters: {
    getActiveUserById(state) {
      const activeUsers = state.users.filter((user) => user.active)
      return (userId) => activeUsers.find((user) => user.id === userId)
    },
  },
})
```

#### 访问其他 store 的 getter %{#accessing-other-stores-getters}%

想要使用另一个 store 的 getter 的话，那就直接在 *getter* 内使用就好：

```js
import { useOtherStore } from './other-store'

export const useStore = defineStore('main', {
  state: () => ({
    // ...
  }),
  getters: {
    otherGetter(state) {
      const otherStore = useOtherStore()
      return state.localData + otherStore.data
    },
  },
})
```

#### 使用 `setup()` 时的用法 %{#usage-with-setup}%

作为 store 的一个属性，你可以直接访问任何 getter(与 state 属性完全一样)：

```vue
<script setup>
const store = useCounterStore()
store.count = 3
store.doubleCount // 6
</script>
```

#### 使用选项式 API 的用法 %{#usage-with-the-options-api}%

<VueSchoolLink
  href="https://vueschool.io/lessons/access-pinia-getters-in-the-options-api"
  title="Access Pinia Getters via the Options API"
/>

在下面的例子中，你可以假设相关的 store 已经创建了：

```js
// 示例文件路径：
// ./src/stores/counter.js

import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
  }),
  getters: {
    doubleCount(state) {
      return state.count * 2
    },
  },
})
```

##### 使用 `setup()` %{#with-setup}%

虽然并不是每个开发者都会使用组合式 API，但 `setup()` 钩子依旧可以使 Pinia 在选项式 API 中更易用。并且不需要额外的映射辅助函数！

```vue
<script>
import { useCounterStore } from '../stores/counter'

export default defineComponent({
  setup() {
    const counterStore = useCounterStore()

    return { counterStore }
  },
  computed: {
    quadrupleCounter() {
      return this.counterStore.doubleCount * 2
    },
  },
})
</script>
```

这在将组件从选项式 API 迁移到组合式 API 时很有用，但**应该只是一个迁移步骤**，始终尽量不要在同一组件中混合两种 API 样式。

##### 不使用 `setup()` %{#without-setup}%

你可以使用[前一节的 state](https://pinia.vuejs.org/zh/core-concepts/state#options-api) 中的 `mapState()` 函数来将其映射为 getters：

```js
import { mapState } from 'pinia'
import { useCounterStore } from '../stores/counter'

export default {
  computed: {
    // 允许在组件中访问 this.doubleCount
    // 与从 store.doubleCount 中读取的相同
    ...mapState(useCounterStore, ['doubleCount']),
    // 与上述相同，但将其注册为 this.myOwnName
    ...mapState(useCounterStore, {
      myOwnName: 'doubleCount',
      // 你也可以写一个函数来获得对 store 的访问权
      double: store => store.doubleCount,
    }),
  },
}
```


## Action

### Action %{#actions}%

<VueSchoolLink
  href="https://vueschool.io/lessons/synchronous-and-asynchronous-actions-in-pinia"
  title="Learn all about actions in Pinia"
/>

Action 相当于组件中的 [method](https://v3.vuejs.org/guide/data-methods.html#methods)。它们可以通过 `defineStore()` 中的 `actions` 属性来定义，**并且它们也是定义业务逻辑的完美选择。**

```js
export const useCounterStore = defineStore('main', {
  state: () => ({
    count: 0,
  }),
  actions: {
    increment() {
      this.count++
    },
    randomizeCounter() {
      this.count = Math.round(100 * Math.random())
    },
  },
})
```

类似 [getter](https://pinia.vuejs.org/zh/core-concepts/getters)，action 也可通过 `this` 访问**整个 store 实例**，并支持**完整的类型标注(以及自动补全✨)**。**不同的是，`action` 可以是异步的**，你可以在它们里面 `await` 调用任何 API，以及其他 action！下面是一个使用 [Mande](https://github.com/posva/mande) 的例子。请注意，你使用什么库并不重要，只要你得到的是一个`Promise`，你甚至可以 (在浏览器中) 使用原生 `fetch` 函数：

```js
import { mande } from 'mande'

const api = mande('/api/users')

export const useUsers = defineStore('users', {
  state: () => ({
    userData: null,
    // ...
  }),

  actions: {
    async registerUser(login, password) {
      try {
        this.userData = await api.post({ login, password })
        showTooltip(`Welcome back ${this.userData.name}!`)
      } catch (error) {
        showTooltip(error)
        // 让表单组件显示错误
        return error
      }
    },
  },
})
```

你也完全可以自由地设置任何你想要的参数以及返回任何结果。当调用 action 时，一切类型也都是可以被自动推断出来的。

Action 可以像函数或者通常意义上的方法一样被调用：

```vue
<script setup>
const store = useCounterStore()
// 将 action 作为 store 的方法进行调用
store.randomizeCounter()
</script>
<template>
  <!-- 即使在模板中也可以 -->
  <button @click="store.randomizeCounter()">Randomize</button>
</template>
```

#### 访问其他 store 的 action %{#accessing-other-stores-actions}%

想要使用另一个 store 的话，那你直接在 *action* 中调用就好了：

```js
import { useAuthStore } from './auth-store'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    preferences: null,
    // ...
  }),
  actions: {
    async fetchUserPreferences() {
      const auth = useAuthStore()
      if (auth.isAuthenticated) {
        this.preferences = await fetchPreferences()
      } else {
        throw new Error('User must be authenticated')
      }
    },
  },
})
```

#### 使用选项式 API 的用法 %{#usage-with-the-options-api}%

<VueSchoolLink
  href="https://vueschool.io/lessons/access-pinia-actions-in-the-options-api"
  title="Access Pinia Getters via the Options API"
/>

在下面的例子中，你可以假设相关的 store 已经创建了：

```js
// 示例文件路径：
// ./src/stores/counter.js

import { defineStore } from 'pinia'

const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  actions: {
    increment() {
      this.count++
    }
  }
})
```

##### 使用 `setup()` %{#with-setup}%

虽然并不是每个开发者都会使用组合式 API，但 `setup()` 钩子依旧可以使 Pinia 在选项式 API 中更易用。并且不需要额外的映射辅助函数!

```vue
<script>
import { useCounterStore } from '../stores/counter'
export default defineComponent({
  setup() {
    const counterStore = useCounterStore()
    return { counterStore }
  },
  methods: {
    incrementAndPrint() {
      this.counterStore.increment()
      console.log('New Count:', this.counterStore.count)
    },
  },
})
</script>
```

##### 不使用 `setup()` %{#without-setup}%

如果你不喜欢使用组合式 API，你也可以使用 `mapActions()` 辅助函数将 action 属性映射为你组件中的方法。

```js
import { mapActions } from 'pinia'
import { useCounterStore } from '../stores/counter'

export default {
  methods: {
    // 访问组件内的 this.increment()
    // 与从 store.increment() 调用相同
    ...mapActions(useCounterStore, ['increment'])
    // 与上述相同，但将其注册为this.myOwnName()
    ...mapActions(useCounterStore, { myOwnName: 'increment' }),
  },
}
```

#### 订阅 action %{#subscribing-to-actions}%

你可以通过 `store.$onAction()` 来监听 action 和它们的结果。传递给它的回调函数会在 action 本身之前执行。`after` 表示在 promise 解决之后，允许你在 action 解决后执行一个回调函数。同样地，`onError` 允许你在 action 抛出错误或 reject 时执行一个回调函数。这些函数对于追踪运行时错误非常有用，类似于[Vue docs 中的这个提示](https://v3.vuejs.org/guide/tooling/deployment.html#tracking-runtime-errors)。

这里有一个例子，在运行 action 之前以及 action resolve/reject 之后打印日志记录。

```js
const unsubscribe = someStore.$onAction(
  ({
    name, // action 名称
    store, // store 实例，类似 `someStore`
    args, // 传递给 action 的参数数组
    after, // 在 action 返回或解决后的钩子
    onError, // action 抛出或拒绝的钩子
  }) => {
    // 为这个特定的 action 调用提供一个共享变量
    const startTime = Date.now()
    // 这将在执行 "store "的 action 之前触发。
    console.log(`Start "${name}" with params [${args.join(', ')}].`)

    // 这将在 action 成功并完全运行后触发。
    // 它等待着任何返回的 promise
    after((result) => {
      console.log(
        `Finished "${name}" after ${
          Date.now() - startTime
        }ms.\nResult: ${result}.`
      )
    })

    // 如果 action 抛出或返回一个拒绝的 promise，这将触发
    onError((error) => {
      console.warn(
        `Failed "${name}" after ${Date.now() - startTime}ms.\nError: ${error}.`
      )
    })
  }
)

// 手动删除监听器
unsubscribe()
```

默认情况下，*action 订阅器*会被绑定到添加它们的组件上(如果 store 在组件的 `setup()` 内)。这意味着，当该组件被卸载时，它们将被自动删除。如果你想在组件卸载后依旧保留它们，请将 `true` 作为第二个参数传递给 *action 订阅器*，以便将其从当前组件中分离：

```vue
<script setup>
const someStore = useSomeStore()
// 此订阅器即便在组件卸载之后仍会被保留
someStore.$onAction(callback, true)
</script>
```


## 插件

### 插件 %{#plugins}%

由于有了底层 API 的支持，Pinia store 现在完全支持扩展。以下是你可以扩展的内容：

- 为 store 添加新的属性
- 定义 store 时增加新的选项
- 为 store 增加新的方法
- 包装现有的方法
- 改变甚至取消 action
- 实现副作用，如[本地存储](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- **仅**应用插件于特定 store

插件是通过 `pinia.use()` 添加到 pinia 实例的。最简单的例子是通过返回一个对象将一个静态属性添加到所有 store。

```js
import { createPinia } from 'pinia'

// 创建的每个 store 中都会添加一个名为 `secret` 的属性。
// 在安装此插件后，插件可以保存在不同的文件中
function SecretPiniaPlugin() {
  return { secret: 'the cake is a lie' }
}

const pinia = createPinia()
// 将该插件交给 Pinia
pinia.use(SecretPiniaPlugin)

// 在另一个文件中
const store = useStore()
store.secret // 'the cake is a lie'
```

这对添加全局对象很有用，如路由器、modal 或 toast 管理器。

#### 简介 %{#introduction}%

Pinia 插件是一个函数，可以选择性地返回要添加到 store 的属性。它接收一个可选参数，即 *context*。

```js
export function myPiniaPlugin(context) {
  context.pinia // 用 `createPinia()` 创建的 pinia。 
  context.app // 用 `createApp()` 创建的当前应用(仅 Vue 3)。
  context.store // 该插件想扩展的 store
  context.options // 定义传给 `defineStore()` 的 store 的可选对象。
  // ...
}
```

然后用 `pinia.use()` 将这个函数传给 `pinia`：

```js
pinia.use(myPiniaPlugin)
```

插件只会应用于**在 `pinia` 传递给应用后**创建的 store，否则它们不会生效。

#### 扩展 Store %{#augmenting-a-store}%

你可以直接通过在一个插件中返回包含特定属性的对象来为每个 store 都添加上特定属性：

```js
pinia.use(() => ({ hello: 'world' }))
```

你也可以直接在 `store` 上设置该属性，但**可以的话，请使用返回对象的方法，这样它们就能被 devtools 自动追踪到**：

```js
pinia.use(({ store }) => {
  store.hello = 'world'
})
```

任何由插件返回的属性都会被 devtools 自动追踪，所以如果你想在 devtools 中调试 `hello` 属性，为了使 devtools 能追踪到 `hello`，请确保**在 dev 模式下**将其添加到 `store._customProperties` 中：

```js
// 上文示例
pinia.use(({ store }) => {
  store.hello = 'world'
  // 确保你的构建工具能处理这个问题，webpack 和 vite 在默认情况下应该能处理。
  if (process.env.NODE_ENV === 'development') {
    // 添加你在 store 中设置的键值
    store._customProperties.add('hello')
  }
})
```

值得注意的是，每个 store 都被 [`reactive`](https://cn.vuejs.org/api/reactivity-core.html#reactive)包装过，所以可以自动解包任何它所包含的 Ref(`ref()`、`computed()`...)。

```js
const sharedRef = ref('shared')
pinia.use(({ store }) => {
  // 每个 store 都有单独的 `hello` 属性
  store.hello = ref('secret')
  // 它会被自动解包
  store.hello // 'secret'

  // 所有的 store 都在共享 `shared` 属性的值
  store.shared = sharedRef
  store.shared // 'shared'
})
```

这就是在没有 `.value` 的情况下你依旧可以访问所有计算属性的原因，也是它们为什么是响应式的原因。

##### 添加新的 state %{#adding-new-state}%

如果你想给 store 添加新的 state 属性或者在服务端渲染的激活过程中使用的属性，**你必须同时在两个地方添加它**。。

- 在 `store` 上，然后你才可以用 `store.myState` 访问它。
- 在 `store.$state` 上，然后你才可以在 devtools 中使用它，并且，**在 SSR 时被正确序列化(serialized)**。

除此之外，你肯定也会使用 `ref()`(或其他响应式 API)，以便在不同的读取中共享相同的值：

```js
import { toRef, ref } from 'vue'

pinia.use(({ store }) => {
  // 为了正确地处理 SSR，我们需要确保我们没有重写任何一个 
  // 现有的值
  if (!Object.prototype.hasOwnProperty(store.$state, 'hasError')) {
    // 在插件中定义 hasError，因此每个 store 都有各自的
    // hasError 状态
    const hasError = ref(false)
    // 在 `$state` 上设置变量，允许它在 SSR 期间被序列化。
    store.$state.hasError = hasError
  }
  // 我们需要将 ref 从 state 转移到 store
  // 这样的话,两种方式：store.hasError 和 store.$state.hasError 都可以访问
  // 并且共享的是同一个变量
  // 查看 https://cn.vuejs.org/api/reactivity-utilities.html#toref
  store.hasError = toRef(store.$state, 'hasError')

  // 在这种情况下，最好不要返回 `hasError`
  // 因为它将被显示在 devtools 的 `state` 部分
  // 如果我们返回它，devtools 将显示两次。
})
```

需要注意的是，在一个插件中， state 变更或添加(包括调用 `store.$patch()`)都是发生在 store 被激活之前，**因此不会触发任何订阅函数**。

:::warning
如果你使用的是 **Vue 2**，Pinia 与 Vue 一样，受限于[相同的响应式限制](https://v2.cn.vuejs.org/v2/guide/reactivity.html#检测变化的注意事项)。在创建新的 state 属性时,如 `secret` 和 `hasError`，你需要使用 `Vue.set()` (Vue 2.7) 或者 `@vue/composition-api` 的 `set()` (Vue < 2.7)。

```js
import { set, toRef } from '@vue/composition-api'
pinia.use(({ store }) => {
  if (!Object.prototype.hasOwnProperty(store.$state, 'hello')) {
    const secretRef = ref('secret')
    // 如果这些数据是要在 SSR 过程中使用的
    // 你应该将其设置在 `$state' 属性上
    // 这样它就会被序列化并在激活过程中被接收
    set(store.$state, 'secret', secretRef)
    // 直接在 store 里设置，这样你就可以访问它了。
    // 两种方式都可以：`store.$state.secret` / `store.secret`。
    set(store, 'secret', secretRef)
    store.secret // 'secret'
  }
})
```

:::

#### 添加新的外部属性 %{#adding-new-external-properties}%

当添加外部属性、第三方库的类实例或非响应式的简单值时，你应该先用 `markRaw()` 来包装一下它，再将它传给 pinia。下面是一个在每个 store 中添加路由器的例子：

```js
import { markRaw } from 'vue'
// 根据你的路由器的位置来调整
import { router } from './router'

pinia.use(({ store }) => {
  store.router = markRaw(router)
})
```

#### 在插件中调用 `$subscribe` %{#calling-subscribe-inside-plugins}%

你也可以在插件中使用 [store.$subscribe](https://pinia.vuejs.org/zh/core-concepts/state#subscribing-to-the-state) 和 [store.$onAction](https://pinia.vuejs.org/zh/core-concepts/actions#subscribing-to-actions) 。

```ts
pinia.use(({ store }) => {
  store.$subscribe(() => {
    // 响应 store 变化
  })
  store.$onAction(() => {
    // 响应 store actions
  })
})
```

#### 添加新的选项 %{#adding-new-options}%

在定义 store 时，可以创建新的选项，以便在插件中使用它们。例如，你可以创建一个 `debounce` 选项，允许你让任何 action 实现防抖。

```js
defineStore('search', {
  actions: {
    searchContacts() {
      // ...
    },
  },

  // 这将在后面被一个插件读取
  debounce: {
    // 让 action searchContacts 防抖 300ms
    searchContacts: 300,
  },
})
```

然后，该插件可以读取该选项来包装 action，并替换原始 action：

```js
// 使用任意防抖库
import debounce from 'lodash/debounce'

pinia.use(({ options, store }) => {
  if (options.debounce) {
    // 我们正在用新的 action 来覆盖这些 action
    return Object.keys(options.debounce).reduce((debouncedActions, action) => {
      debouncedActions[action] = debounce(
        store[action],
        options.debounce[action]
      )
      return debouncedActions
    }, {})
  }
})
```

注意，在使用 setup 语法时，自定义选项作为第 3 个参数传递：

```js
defineStore(
  'search',
  () => {
    // ...
  },
  {
    // 这将在后面被一个插件读取
    debounce: {
      // 让 action searchContacts 防抖 300ms
      searchContacts: 300,
    },
  }
)
```

#### TypeScript

上述一切功能都有类型支持，所以你永远不需要使用 `any` 或 `@ts-ignore`。

##### 标注插件类型 %{#typing-plugins}%

一个 Pinia 插件可按如下方式实现类型标注：

```ts
import { PiniaPluginContext } from 'pinia'

export function myPiniaPlugin(context: PiniaPluginContext) {
  // ...
}
```

##### 为新的 store 属性添加类型 %{#typing-new-store-properties}%

当在 store 中添加新的属性时，你也应该扩展 `PiniaCustomProperties` 接口。

```ts
import 'pinia'

declare module 'pinia' {
  export interface PiniaCustomProperties {
    // 通过使用一个 setter，我们可以允许字符串和引用。
    set hello(value: string | Ref<string>)
    get hello(): string

    // 你也可以定义更简单的值
    simpleNumber: number

    // 添加路由(#adding-new-external-properties)
    router: Router
  }
}
```

然后，就可以安全地写入和读取它了：

```ts
pinia.use(({ store }) => {
  store.hello = 'Hola'
  store.hello = ref('Hola')

  store.simpleNumber = Math.random()
  // @ts-expect-error: we haven't typed this correctly
  store.simpleNumber = ref(Math.random())
})
```

`PiniaCustomProperties` 是一个通用类型，允许你引用 store 的属性。思考一下这个例子，如果把初始选项复制成 `$options`(这只对 option store 有效)，如何标注类型：

```ts
pinia.use(({ options }) => ({ $options: options }))
```

我们可以通过使用 `PiniaCustomProperties` 的4种通用类型来标注类型：

```ts
import 'pinia'

declare module 'pinia' {
  export interface PiniaCustomProperties<Id, S, G, A> {
    $options: {
      id: Id
      state?: () => S
      getters?: G
      actions?: A
    }
  }
}
```

:::tip
当在泛型中扩展类型时，它们的名字必须**与源代码中完全一样**。`Id` 不能被命名为 `id` 或 `I` ，`S` 不能被命名为 `State`。下面是每个字母代表的含义：

- S: State
- G: Getters
- A: Actions
- SS: Setup Store / Store

:::

##### 为新的 state 添加类型 %{#typing-new-state}%

当添加新的 state 属性(包括 `store` 和 `store.$state` )时，你需要将类型添加到 `PiniaCustomStateProperties` 中。与 `PiniaCustomProperties` 不同的是，它只接收 `State` 泛型：

```ts
import 'pinia'

declare module 'pinia' {
  export interface PiniaCustomStateProperties<S> {
    hello: string
  }
}
```

##### 为新的定义选项添加类型 %{#typing-new-creation-options}%

当为 `defineStore()` 创建新选项时，你应该扩展 `DefineStoreOptionsBase`。与 `PiniaCustomProperties` 不同的是，它只暴露了两个泛型：State 和 Store 类型，允许你限制定义选项的可用类型。例如，你可以使用 action 的名称：

```ts
import 'pinia'

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    // 任意 action 都允许定义一个防抖的毫秒数
    debounce?: Partial<Record<keyof StoreActions<Store>, number>>
  }
}
```

:::tip
还有一个可以从一个 store 类型中提取 *getter* 的 `StoreGetters` 类型。你也可以且**只可以**通过扩展 `DefineStoreOptions` 或 `DefineSetupStoreOptions` 类型来扩展 *setup store* 或 *option store* 的选项。
:::

#### Nuxt.js %{#nuxt-js}%

当[在 Nuxt 中使用 pinia](https://pinia.vuejs.org/zh/ssr/nuxt) 时，你必须先创建一个 [Nuxt 插件](https://nuxtjs.org/docs/2.x/directory-structure/plugins)。这样你才能访问到 `pinia` 实例：

```ts
// plugins/myPiniaPlugin.js
import { PiniaPluginContext } from 'pinia'
import { Plugin } from '@nuxt/types'

function MyPiniaPlugin({ store }: PiniaPluginContext) {
  store.$subscribe((mutation) => {
    // 响应 store 变更
    console.log(`[🍍 ${mutation.storeId}]: ${mutation.type}.`)
  })

  // 请注意，如果你使用的是 TS，则必须添加类型。
  return { creationTime: new Date() }
}

const myPlugin: Plugin = ({ $pinia }) => {
  $pinia.use(MyPiniaPlugin)
}

export default myPlugin
```

注意上面的例子使用的是 TypeScript。如果你使用的是 `.js` 文件，你必须删除类型标注 `PiniaPluginContext` 和 `Plugin` 以及它们的导入语句。


## 组件外的 Store

### 在组件外使用 store %{#using-a-store-outside-of-a-component}%

Pinia store 依靠 `pinia` 实例在所有调用中共享同一个 store 实例。大多数时候，只需调用你定义的 `useStore()` 函数，完全开箱即用。例如，在 `setup()` 中，你不需要再做任何事情。但在组件之外，情况就有点不同了。
实际上，`useStore()` 给你的 `app` 自动注入了 `pinia` 实例。这意味着，如果 `pinia` 实例不能自动注入，你必须手动提供给 `useStore()` 函数。
你可以根据不同的应用，以不同的方式解决这个问题。

#### 单页面应用 %{#single-page-applications}%

如果你不做任何 SSR(服务器端渲染)，在用 `app.use(pinia)` 安装 pinia 插件后，对 `useStore()` 的任何调用都会正常执行：

```js
import { useUserStore } from '@/stores/user'
import { createApp } from 'vue'
import App from './App.vue'

// ❌  失败，因为它是在创建 pinia 之前被调用的
const userStore = useUserStore()

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)

// ✅ 成功，因为 pinia 实例现在激活了
const userStore = useUserStore()
```

为确保 pinia 实例被激活，最简单的方法就是将 `useStore()` 的调用放在 pinia 安
装后才会执行的函数中。

让我们来看看这个在 Vue Router 的导航守卫中使用 store 的例子。

```js
import { createRouter } from 'vue-router'
const router = createRouter({
  // ...
})

// ❌ 由于引入顺序的问题，这将失败
const store = useStore()

router.beforeEach((to, from, next) => {
  // 我们想要在这里使用 store
  if (store.isLoggedIn) next()
  else next('/login')
})

router.beforeEach((to) => {
  // ✅ 这样做是可行的，因为路由器是在其被安装之后开始导航的，
  // 而此时 Pinia 也已经被安装。
  const store = useStore()

  if (to.meta.requiresAuth && !store.isLoggedIn) return '/login'
})
```

#### 服务端渲染应用 %{#ssr-apps}%

当处理服务端渲染时，你将必须把 `pinia` 实例传递给 `useStore()`。这可以防止 pinia 在不同的应用实例之间共享全局状态。

在[SSR 指南](https://pinia.vuejs.org/zh/ssr/index)中有一整节专门讨论这个问题，这里只是一个简短的解释。

# 服务端渲染 (SSR)

## Vue 与 Vite

### 服务端渲染 (SSR) %{#server-side-rendering-ssr}%

:::tip
如果你使用的是 **Nuxt.js**，你需要阅读的是[**这些说明文档**](https://pinia.vuejs.org/zh/ssr/nuxt)。
:::

只要你只在 `setup` 函数、`getter` 和 `action` 的顶部调用你定义的 `useStore()` 函数，那么使用 Pinia 创建 store 对于 SSR 来说应该是开箱即用的：

```vue
<script setup>
// 这是可行的，
// 因为 pinia 知道在 `setup` 中运行的是什么程序。
const main = useMainStore()
</script>
```

#### 在 `setup()` 外部使用 store %{#using-the-store-outside-of-setup}%

如果你需要在其他地方使用 store，你需要将[原本被传递给应用](https://pinia.vuejs.org/zh/ssr/#install-the-plugin) 的 `pinia` 实例传递给 `useStore()` 函数：

```js
const pinia = createPinia()
const app = createApp(App)

app.use(router)
app.use(pinia)

router.beforeEach((to) => {
  // ✅这会正常工作，因为它确保了正确的 store 被用于
  // 当前正在运行的应用
  const main = useMainStore(pinia)

  if (to.meta.requiresAuth && !main.isLoggedIn) return '/login'
})
```

Pinia 会将自己作为 `$pinia` 添加到你的应用中，所以你可以在 `serverPrefetch()` 等函数中使用它。

```js
export default {
  serverPrefetch() {
    const store = useStore(this.$pinia)
  },
}
```

#### State 激活 %{#state-hydration}%

为了激活初始 state，你需要确保 rootState 包含在 HTML 中的某个地方，以便 Pinia 稍后能够接收到它。根据你服务端所渲染的内容，**为了安全你应该转义 state**。我们推荐 Nuxt.js 目前使用的 [@nuxt/devalue](https://github.com/nuxt-contrib/devalue)：

```js
import devalue from '@nuxt/devalue'
import { createPinia } from 'pinia'
// 检索服务端的 rootState
const pinia = createPinia()
const app = createApp(App)
app.use(router)
app.use(pinia)

// 渲染页面后，rootState 被建立，
// 可以直接在 `pinia.state.value`上读取。

// 序列化，转义(如果 state 的内容可以被用户改变，这点就非常重要，几乎都是这样的)
// 并将其放置在页面的某处
// 例如，作为一个全局变量。
devalue(pinia.state.value)
```

根据你服务端所渲染的内容，你将设置一个**初始状态**变量，该变量将在 HTML 中被序列化。你还应该保护自己免受 XSS 攻击。例如，在 [vite-ssr](https://github.com/frandiox/vite-ssr)中你可以使用[`transformState` 选项](https://github.com/frandiox/vite-ssr#state-serialization) 以及 `@nuxt/devalue`：

```js
import devalue from '@nuxt/devalue'

export default viteSSR(
  App,
  {
    routes,
    transformState(state) {
      return import.meta.env.SSR ? devalue(state) : state
    },
  },
  ({ initialState }) => {
    // ...
    if (import.meta.env.SSR) {
      // 序列化并设置为 window.__INITIAL_STATE__
      initialState.pinia = pinia.state.value
    } else {
      // 在客户端，我们恢复 state
      pinia.state.value = initialState.pinia
    }
  }
)
```

你可以根据你的需要使用 `@nuxt/devalue` 的[其他替代品](https://github.com/nuxt-contrib/devalue#see-also)，例如，你也可以用 `JSON.stringify()`/`JSON.parse()` 来序列化和解析你的 state，**这样你可以把性能提高很多。**

也可以根据你的环境调整这个策略。但确保在客户端调用任何 `useStore()` 函数之前，激活 pinia 的 state。例如，如果我们将 state 序列化为一个 `<script>` 标签，并在客户端通过 `window.__pinia` 全局访问它，我们可以这样写：

```js
const pinia = createPinia()
const app = createApp(App)
app.use(pinia)

// 必须由用户设置
if (isClient) {
  pinia.state.value = JSON.parse(window.__pinia)
}
```


## Nuxt.js

### Nuxt.js %{#nuxt-js}%

搭配 [Nuxt.js](https://nuxtjs.org/) 的 Pinia 更易用，因为 Nuxt 处理了很多与**服务器端渲染**有关的事情。例如，**你不需要关心序列化或 XSS 攻击**。Pinia 既支持 Nuxt Bridge 和 Nuxt 3，也支持纯 Nuxt 2，[见下文](https://pinia.vuejs.org/zh/ssr/nuxt.html#nuxt-2-without-bridge)。

#### 安装 %{#installation}%

```bash
yarn add pinia @pinia/nuxt
### 或者使用 npm
npm install pinia @pinia/nuxt
```

:::tip 
如果你正在使用 npm，你可能会遇到 *ERESOLVE unable to resolve dependency tree* 错误。如果那样的话，将以下内容添加到 `package.json` 中：

```js
"overrides": { 
  "vue": "latest"
}
```
:::

我们提供了一个 *module* 来为你处理一切，你只需要在 `nuxt.config.js` 文件的 `modules` 中添加它。

```js
// nuxt.config.js
export default defineNuxtConfig({
  // ... 其他配置
  modules: [
    // ...
    '@pinia/nuxt',
  ],
})
```

这样配置就完成了，正常使用 store 就好啦!

#### 在 `setup()` 外部使用 store %{#using-the-store-outside-of-setup}%

如果你想在 `setup()` 外部使用一个 store，记得把 `pinia` 对象传给 `useStore()`。我们会把它添加到[上下文](https://nuxtjs.org/docs/2.x/internals-glossary/context)中，然后你就可以在 `asyncData()` 和 `fetch()` 中访问它了：

```js
import { useStore } from '~/stores/myStore'

export default {
  asyncData({ $pinia }) {
    const store = useStore($pinia)
  },
}
```

与 `onServerPrefetch()` 一样，如果你想在 `asyncData()` 中调用一个存储动作，你不需要做任何特别的事情。

```vue
<script setup>
const store = useStore()
const { data } = await useAsyncData('user', () => store.fetchUser())
</script>
```

#### 自动引入 %{#auto-imports}%

默认情况下，`@pinia/nuxt` 会暴露一个自动引入的方法：`usePinia()`，它类似于 `getActivePinia()`，但在 Nuxt 中效果更好。你可以添加自动引入来减轻你的开发工作：

```js
// nuxt.config.js
export default defineNuxtConfig({
  // ... 其他配置
  modules: [
    // ...
    [
      '@pinia/nuxt',
      {
        autoImports: [
          // 自动引入 `defineStore()`
          'defineStore',
          // 自动引入 `defineStore()` 并重命名为 `definePiniaStore()`
          ['defineStore', 'definePiniaStore'],
        ],
      },
    ],
  ],
})
```

#### 纯 Nuxt 2 %{#nuxt-2-without-bridge}%

`@pinia/nuxt` v0.2.1 之前的版本中，Pinia 都支持 Nuxt 2。请确保在安装 `pinia` 的同时也安装 [`@nuxtjs/composition-api`](https://composition-api.nuxtjs.org/)：

```bash
yarn add pinia @pinia/nuxt@0.2.1 @nuxtjs/composition-api
### 使用 npm
npm install pinia @pinia/nuxt@0.2.1 @nuxtjs/composition-api
```

我们提供了一个 *module* 来为你处理一切工作，你只需要在 `nuxt.config.js` 文件的 `buildModules` 中添加它。

```js
// nuxt.config.js
export default {
  // ... 其他配置
  buildModules: [
    // 仅支持 Nuxt 2:
    // https://composition-api.nuxtjs.org/getting-started/setup#quick-start
    '@nuxtjs/composition-api/module',
    '@pinia/nuxt',
  ],
}
```

##### TypeScript %{#typescript}%

如果你使用的是 Nuxt 2 (`@pinia/nuxt` < 0.3.0) 搭配 TypeScript，并且有 `jsconfig.json`，你应该为 `context.pinia` 引入类型：

```json
{
  "types": [
    // ...
    "@pinia/nuxt"
  ]
}
```

这也将确保你可以使用自动补全😉。

#### Pinia 搭配 Vuex 使用 %{#using-pinia-alongside-vuex}%

建议**避免同时使用 Pinia 和 Vuex**，但如果你确实需要同时使用，你需要告诉 Pinia 不要禁用它：

```js
// nuxt.config.js
export default {
  buildModules: [
    '@nuxtjs/composition-api/module',
    ['@pinia/nuxt', { disableVuex: false }],
  ],
  // ... 其他配置
}
```

# 手册

## 目录

### 手册 %{#cookbook}%

- [从 Vuex ≤4 迁移](https://pinia.vuejs.org/zh/cookbook/migration-vuex)。用于转换 Vuex ≤4 项目的迁移指南。
- [HMR](https://pinia.vuejs.org/zh/cookbook/hot-module-replacement)：如何激活热更新并改善开发者体验。
- [测试 Stores (WIP)](https://pinia.vuejs.org/zh/cookbook/testing): 如何对 Store 进行单元测试并在组件单元测试中模拟它们。
- [Composing Stores](https://pinia.vuejs.org/zh/cookbook/composing-stores): 如何交叉使用多个 store，例如在购物车 store 中使用用户 store。
- [选项式 API](https://pinia.vuejs.org/zh/cookbook/options-api): 如何在 `setup()` 外部使用 Pinia 而不使用组合式 API。
- [从 0.0.7 迁移](https://pinia.vuejs.org/zh/cookbook/migration-0-0-7)。迁移指南，比更新日志有更多的例子。


## 从 Vuex ≤4 迁移

### 从 Vuex ≤4 迁移 %{#migrating-from-vuex-≤4}%

虽然 Vuex 和 Pinia store 的结构不同，但很多逻辑都可以复用。本指南的作用是帮助你完成迁移，并指出一些可能出现的常见问题。

#### 准备 %{#preparation}%

首先，按照[入门指南](https://pinia.vuejs.org/zh/getting-started)安装 Pinia。

#### 重构 store 的模块 %{#restructuring-modules-to-stores}%

Vuex 有一个概念，带有多个模块的单一 store。这些模块可以被命名，甚至可以互相嵌套。

将这个概念过渡到 Pinia 最简单的方法是，你以前使用的每个模块现在都是一个 *store*。每个 store 都需要一个 `id`，类似于 Vuex 中的命名空间。这意味着每个 store 都有命名空间的设计。嵌套模块也可以成为自己的 store。互相依赖的 store 可以直接导入其他 store。

你的 Vuex 模块如何重构为 Pinia store，完全取决于你，不过这里有一个示例：

```bash
### Vuex 示例(假设是命名模块)。
src
└── store
    ├── index.js           ### 初始化 Vuex，导入模块
    └── modules
        ├── module1.js     ### 命名模块 'module1'
        └── nested
            ├── index.js   ### 命名模块 'nested'，导入 module2 与 module3
            ├── module2.js ### 命名模块 'nested/module2'
            └── module3.js ### 命名模块 'nested/module3'

### Pinia 示例，注意 ID 与之前的命名模块相匹配
src
└── stores
    ├── index.js          ### (可选) 初始化 Pinia，不必导入 store
    ├── module1.js        ### 'module1' id
    ├── nested-module2.js ### 'nested/module2' id
    ├── nested-module3.js ### 'nested/module3' id
    └── nested.js         ### 'nested' id
```

这为 store 创建了一个扁平的结构，但也保留了和之前等价的 `id` 命名方式。如果你在根 store (在 Vuex 的 `store/index.js` 文件中)中有一些 state/getter/action/mutation，你可以创建一个名为 `root` 的 store，来保存它们。

Pinia 的目录一般被命名为 `stores` 而不是 `store`。这是为了强调 Pinia 可以使用多个 store，而不是 Vuex 的单一 store。

对于大型项目，你可能希望逐个模块进行转换，而不是一次性全部转换。其实在迁移过程中，你可以同时使用 Pinia 和 Vuex。这样也完全可以正常工作，这也是将 Pinia 目录命名为 `stores` 的另一个原因。

#### 转换单个模块 %{#converting-a-single-module}%

下面有一个完整的例子，介绍了将 Vuex 模块转换为 Pinia store 的完整过程，请看下面的逐步指南。Pinia 的例子使用了一个 option store，因为其结构与 Vuex 最为相似。

```ts
// 'auth/user' 命名空间中的 Vuex 模块
import { Module } from 'vuex'
import { api } from '@/api'
import { RootState } from '@/types' // 如果需要使用 Vuex 的类型便需要引入

interface State {
  firstName: string
  lastName: string
  userId: number | null
}

const storeModule: Module<State, RootState> = {
  namespaced: true,
  state: {
    firstName: '',
    lastName: '',
    userId: null
  },
  getters: {
    firstName: (state) => state.firstName,
    fullName: (state) => `${state.firstName} ${state.lastName}`,
    loggedIn: (state) => state.userId !== null,
    // 与其他模块的一些状态相结合
    fullUserDetails: (state, getters, rootState, rootGetters) => {
      return {
        ...state,
        fullName: getters.fullName,
        // 读取另一个名为 `auth` 模块的 state
        ...rootState.auth.preferences,
        // 读取嵌套于 `auth` 模块的 `email` 模块的 getter
        ...rootGetters['auth/email'].details
      }
    }
  },
  actions: {
    async loadUser ({ state, commit }, id: number) {
      if (state.userId !== null) throw new Error('Already logged in')
      const res = await api.user.load(id)
      commit('updateUser', res)
    }
  },
  mutations: {
    updateUser (state, payload) {
      state.firstName = payload.firstName
      state.lastName = payload.lastName
      state.userId = payload.userId
    },
    clearUser (state) {
      state.firstName = ''
      state.lastName = ''
      state.userId = null
    }
  }
}

export default storeModule
```

```ts
// Pinia Store
import { defineStore } from 'pinia'
import { useAuthPreferencesStore } from './auth-preferences'
import { useAuthEmailStore } from './auth-email'
import vuexStore from '@/store' // 逐步转换，见 fullUserDetails

interface State {
  firstName: string
  lastName: string
  userId: number | null
}

export const useAuthUserStore = defineStore('auth/user', {
  // 转换为函数
  state: (): State => ({
    firstName: '',
    lastName: '',
    userId: null
  }),
  getters: {
    // 不在需要 firstName getter，移除
    fullName: (state) => `${state.firstName} ${state.lastName}`,
    loggedIn: (state) => state.userId !== null,
    // 由于使用了 `this`，必须定义一个返回类型
    fullUserDetails (state): FullUserDetails {
      // 导入其他 store
      const authPreferencesStore = useAuthPreferencesStore()
      const authEmailStore = useAuthEmailStore()
      return {
        ...state,
        // `this` 上的其他 getter
        fullName: this.fullName,
        ...authPreferencesStore.$state,
        ...authEmailStore.details
      }

      // 如果其他模块仍在 Vuex 中，可替代为
      // return {
      //   ...state,
      //   fullName: this.fullName,
      //   ...vuexStore.state.auth.preferences,
      //   ...vuexStore.getters['auth/email'].details
      // }
    }
  },
  actions: {
    //没有作为第一个参数的上下文，用 `this` 代替
    async loadUser (id: number) {
      if (this.userId !== null) throw new Error('Already logged in')
      const res = await api.user.load(id)
      this.updateUser(res)
    },
    // mutation 现在可以成为 action 了，不再用 `state` 作为第一个参数，而是用 `this`。
    updateUser (payload) {
      this.firstName = payload.firstName
      this.lastName = payload.lastName
      this.userId = payload.userId
    },
    // 使用 `$reset` 可以轻松重置 state
    clearUser () {
      this.$reset()
    }
  }
})
```

让我们把上述内容分解成几个步骤：

1. 为 store 添加一个必要的 `id`，你可以让它与之前的命名保持相同。
2. 如果 `state` 不是一个函数的话 将它转换为一个函数。
3. 转换 `getters`
    1. 删除任何返回同名 state 的 getters (例如： `firstName: (state) => state.firstName`)，这些都不是必需的，因为你可以直接从 store 实例中访问任何状态。
    2. 如果你需要访问其他的 getter，可通过 `this` 访问它们，而不是第二个参数。记住，如果你使用 `this`，而且你不得不使用一个普通函数，而不是一个箭头函数，那么由于 TS 的限制，你需要指定一个返回类型，更多细节请阅读[这篇文档](https://pinia.vuejs.org/zh/core-concepts/getters#accessing-other-getters)
    3. 如果使用 `rootState` 或 `rootGetters` 参数，可以直接导入其他 store 来替代它们，或者如果它们仍然存在于 Vuex ，则直接从 Vuex 中访问它们。
4. 转换 `actions`
    1. 从每个 action 中删除第一个 `context` 参数。所有的东西都应该直接从 `this` 中访问。
    2. 如果使用其他 store，要么直接导入，要么与 getters 一样，在 Vuex 上访问。
5. 转换 `mutations`
    1. Mutation 已经被弃用了。它们可以被转换为 `action`，或者你可以在你的组件中直接赋值给 store (例如：`userStore.firstName = 'First'`)
    2. 如果你想将它转换为 action，删除第一个 `state` 参数，用 `this` 代替任何赋值操作中的 `state`。
    3. 一个常见的 mutation 是将 state 重置为初始 state。而这就是 store 的 `$reset` 方法的内置功能。注意，这个功能只存在于 option stores。

正如你所看到的，你的大部分代码都可以被重复使用。如果有什么遗漏，类型安全也应该可以帮助你确定需要修改的地方。

#### 组件内的使用 %{#usage-inside-components}%

现在你的 Vuex 模块已经被转换为 Pinia store，但其他使用该模块的组件或文件也需要更新。

如果你以前使用的是 Vuex 的 `map` 辅助函数，可以看看[不使用 setup() 的用法指南](https://pinia.vuejs.org/zh/cookbook/options-api)，因为这些辅助函数大多都是可以复用的。

如果你以前使用的是 `useStore`，那么就直接导入新 store 并访问其上的 state。比如说：

```ts
// Vuex
import { defineComponent, computed } from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
  setup () {
    const store = useStore()

    const firstName = computed(() => store.state.auth.user.firstName)
    const fullName = computed(() => store.getters['auth/user/fullName'])

    return {
      firstName,
      fullName
    }
  }
})
```

```ts
// Pinia
import { defineComponent, computed } from 'vue'
import { useAuthUserStore } from '@/stores/auth-user'

export default defineComponent({
  setup () {
    const authUserStore = useAuthUserStore()

    const firstName = computed(() => authUserStore.firstName)
    const fullName = computed(() => authUserStore.fullName)

    return {
      // 你也可以在你的组件中通过返回 store 来访问整个 store
      authUserStore,
      firstName,
      fullName
    }
  }
})
```

#### 组件外的使用 %{#usage-outside-components}%

只要你注意**不在函数外使用 store**，单独更新组件外的用法应该很简单。下面是一个在 Vue Router 导航守卫中使用 store 的例子：

```ts
// Vuex
import vuexStore from '@/store'

router.beforeEach((to, from, next) => {
  if (vuexStore.getters['auth/user/loggedIn']) next()
  else next('/login')
})
```

```ts
// Pinia
import { useAuthUserStore } from '@/stores/auth-user'

router.beforeEach((to, from, next) => {
  // 必须再函数内部使用
  const authUserStore = useAuthUserStore()
  if (authUserStore.loggedIn) next()
  else next('/login')
})
```

更多细节可在[这里](https://pinia.vuejs.org/zh/core-concepts/outside-component-usage)找到。

#### Vuex 高级用法 %{#advanced-vuex-usage}%

如果你的 Vuex store 使用了它所提供的一些更高级的功能，也有一些关于如何在 Pinia 中实现同样效果的指导。其中一些要点已经包含在这个[对比总结](https://pinia.vuejs.org/zh/introduction#comparison-with-vuex-3-x-4-x)里了。

##### 动态模块 %{#dynamic-modules}%

在 Pinia 中不需要动态注册模块。store 设计之初就是动态的，只有在需要时才会被注册。如果一个 store 从未被使用过，它就永远不会被 “注册”。

##### 热更新 %{#hot-module-replacement}%

支持 HMR，但需要一些修改，见[HMR 指南](https://pinia.vuejs.org/zh/cookbook/hot-module-replacement)。

##### 插件 %{#plugins}%

如果你使用的是一个公共的 Vuex 插件，那么请检查是否有一个 Pinia 版的替代品。如果没有，你就需要自己写一个，或者评估一下是否还有必要使用这个插件。

如果你已经写了一个自己的插件，那么你完全可以更新它来适配 pinia，参考[插件指南](https://pinia.vuejs.org/zh/core-concepts/plugins)。


## 热更新

### HMR (Hot Module Replacement) %{#hmr-hot-module-replacement}%

Pinia 支持热更新，所以你可以编辑你的 store，并直接在你的应用中与它们互动，而不需要重新加载页面，允许你保持当前的 state、并添加甚至删除 state、action 和 getter。

目前，只有 [Vite](https://vitejs.dev/) 被官方支持，不过任何实现 `import.meta.hot` 规范的构建工具都应该能正常工作。(例外的是，[webpack](https://webpack.js.org/api/module-variables/#importmetawebpackhot) 似乎使用的是 `import.meta.webpackHot` 而不是 `import.meta.hot` )
你只需要在任何 store 声明旁边添加这段代码。比方说，你有三个 store：`auth.js`、 `cart.js` 和 `chat.js`, 你必须在每个 **store 声明**后都添加(和调整)这段代码。

```js
// auth.js
import { defineStore, acceptHMRUpdate } from 'pinia'

const useAuth = defineStore('auth', {
  // 配置...
})

// 确保传递正确的 store 声明，本例中为 `useAuth`
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuth, import.meta.hot))
}
```


## 测试

### store 测试 %{#testing-stores}%

从设计上来说，许多地方都会使用 store，所以可能比正常情况更难测试。但幸运的是，这不一定是真的。在测试 store 时，我们需要注意三件事：

- `pinia` 实例：没有它，store 不能正常工作
- `actions`：大多数时候，它们包含了 store 最复杂的逻辑。如果它们默认就可以被 mocked，那不是很好吗？
- 插件：如果你依赖插件，你也必须为测试安装它们

根据测试的内容和方式，我们需要以不同的方式来处理这三个问题：

- [store 测试](https://pinia.vuejs.org/zh/cookbook/testing.html#testing-stores)
  - [对 store 单元测试](https://pinia.vuejs.org/zh/cookbook/testing.html#unit-testing-a-store)
  - [对组件单元测试](https://pinia.vuejs.org/zh/cookbook/testing.html#unit-testing-components)
    - [初始 state](https://pinia.vuejs.org/zh/cookbook/testing.html#initial-state)
    - [自定义 action 的行为](https://pinia.vuejs.org/zh/cookbook/testing.html#customizing-behavior-of-actions)
    - [指定 createSpy 函数](https://pinia.vuejs.org/zh/cookbook/testing.html#specifying-the-creespy-function)
    - [Mocking getters](https://pinia.vuejs.org/zh/cookbook/testing.html#mocking-getters)
    - [Pinia 插件](https://pinia.vuejs.org/zh/cookbook/testing.html#pinia-plugins)
  - [端到端测试](https://pinia.vuejs.org/zh/cookbook/testing.html#e2e-tests)
  - [对组件单元测试(Vue 2)](https://pinia.vuejs.org/zh/cookbook/testing.html#unit-test-components-vue-2)

#### 对 store 进行单元测试 %{#unit-testing-a-store}%

要对一个 store 进行单元测试，最重要的是创建一个 `pinia` 实例：

```js
// stores/counter.spec.ts
import { setActivePinia, createPinia } from 'pinia'
import { useCounter } from '../src/stores/counter'

describe('Counter Store', () => {
  beforeEach(() => {
    // 创建一个新 pinia，并使其处于激活状态，这样它就会被任何 useStore() 调用自动接收
    // 而不需要手动传递：
    // `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('increments', () => {
    const counter = useCounter()
    expect(counter.n).toBe(0)
    counter.increment()
    expect(counter.n).toBe(1)
  })

  it('increments by amount', () => {
    const counter = useCounter()
    counter.increment(10)
    expect(counter.n).toBe(10)
  })
})
```

如果你有使用任何 store 的插件，有一件重要的事情需要了解：**在 `pinia` 被安装在一个应用之后，插件才会被使用**。可以通过创建一个空的或假的应用来解决这个问题：

```js
import { setActivePinia, createPinia } from 'pinia'
import { createApp } from 'vue'
import { somePlugin } from '../src/stores/plugin'

// 和前面一样的代码...

// 测试前你不需要创建应用
const app = createApp({})
beforeEach(() => {
  const pinia = createPinia().use(somePlugin)
  app.use(pinia)
  setActivePinia(pinia)
})
```

#### 对组件单元测试 %{#unit-testing-components}%

这可以通过 `createTestingPinia()` 实现，它会返回一个仅用于帮助对组件单元测试的 pinia 实例。

从安装 `@pinia/testing` 开始：

```shell
npm i -D @pinia/testing
```

确保挂在组件时，在你的测试中创建一个用于测试的 pinia 实例：

```js
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
// 引入任何你想要测试的 store
import { useSomeStore } from '@/stores/myStore'

const wrapper = mount(Counter, {
  global: {
    plugins: [createTestingPinia()],
  },
})

const store = useSomeStore() // // 使用 pinia 的测试实例!

// 可直接操作 state
store.name = 'my new name'
// 也可以通过 patch 来完成
store.$patch({ name: 'new name' })
expect(store.name).toBe('new name')

// action 默认是存根的(stubbed)，意味着它们默认不执行其代码。
// 请看下面的内容来定制这一行为。
store.someAction()

expect(store.someAction).toHaveBeenCalledTimes(1)
expect(store.someAction).toHaveBeenLastCalledWith()
```

请注意，如果你使用的是 Vue 2，`@vue/test-utils` 需要一个[轻微不同的配置](https://pinia.vuejs.org/zh/cookbook/testing.html#unit-test-components-vue-2)。

##### 初始 State %{#initial-state}%

在创建测试 Pinia 时，你可以通过传递一个 `initialState` 对象来设置**所有 store 的初始状态**。这个对象将被 pinia 的测试实例用于创建 store 时 *patch* store。比方说，你想初始化这个 store 的状态：

```ts
import { defineStore } from 'pinia'

const useCounterStore = defineStore('counter', {
  state: () => ({ n: 0 }),
  // ...
})
```

由于 store 的名字是 *"counter"*，所以你需要传递相应的对象给 `initialState`：

```ts
// 在测试中的某处
const wrapper = mount(Counter, {
  global: {
    plugins: [
      createTestingPinia({
        initialState: {
          counter: { n: 20 }, //从 20 开始计数，而不是 0
        },
      }),
    ],
  },
})

const store = useSomeStore() // 使用 pinia 的测试实例!
store.n // 20
```

##### 自定义 action 的行为 %{#customizing-behavior-of-actions}%

除非另有指示，`createTestingPinia` 会存根 (stub) 出所有的 store action。这样可以让你独立测试你的组件和 store。

如果你想恢复这种行为，并在测试中正常执行 action，请在调用 `createTestingPinia` 时指定 `stubActions: false`：

```js
const wrapper = mount(Counter, {
  global: {
    plugins: [createTestingPinia({ stubActions: false })],
  },
})

const store = useSomeStore()

// 现在，这个调用将由 store 定义的实现执行。
store.someAction()

// ...但它仍然被一个 spy 包装着，所以你可以检查调用
expect(store.someAction).toHaveBeenCalledTimes(1)
```

##### 指定 createSpy 函数 %{#specifying-the-createspy-function}%

当使用 Jest，或 vitest 且设置 `globals: true` 时，`createTestingPinia` 会自动使用现有测试框架 (`jest.fn` 或 `vitest.fn`) 的 spy 函数存根 (stub) action。如果你使用的是不同的框架，你需要提供一个 [createSpy](https://pinia.vuejs.org/zh/zh/api/interfaces/pinia_testing.TestingOptions.html#createspy) 选项：

```js
import sinon from 'sinon'

createTestingPinia({
  createSpy: sinon.spy, // 使用 sinon's spy 包装 action
})
```

你可以在[测试包的测试源码](https://github.com/vuejs/pinia/blob/v2/packages/testing/src/testing.spec.ts)中找到更多的例子。

##### Mocking getters %{#mocking-getters}%

默认情况下，任何 getter 都会像常规用法一样进行计算，但你可以通过将 getter 设置为任何你想要的值来手动强制计算：

```ts
import { defineStore } from 'pinia'
import { createTestingPinia } from '@pinia/testing'

const useCounter = defineStore('counter', {
  state: () => ({ n: 1 }),
  getters: {
    double: (state) => state.n * 2,
  },
})

const pinia = createTestingPinia()
const counter = useCounter(pinia)

counter.double = 3 // 🪄 getter 仅在测试中可被重写

// 设置为 undefined，以重置默认行为
// @ts-expect-error: usually it's a number
counter.double = undefined
counter.double // 2 (=1 x 2)
```

##### Pinia 插件 %{#pinia-plugins}%

如果你有使用任何 pinia 插件，确保在调用 `createTestingPinia()` 时传入它们，这样它们就会被正确加载。**不要使用 `testingPinia.use(MyPlugin)`** 来加载它们，而应该像正常的 pinia 那样：

```js
import { createTestingPinia } from '@pinia/testing'
import { somePlugin } from '../src/stores/plugin'

// 某些测试
const wrapper = mount(Counter, {
  global: {
    plugins: [
      createTestingPinia({
        stubActions: false,
        plugins: [somePlugin],
      }),
    ],
  },
})
```

#### 端到端测试 %{#e2e-tests}%

对于 pinia，你不需要为端到端测试修改任何代码，这就是端到端测试的含义！也许你想测试 HTTP 请求，但这已经超出了本指南的范围😄。

#### 对组件单元测试(Vue 2) %{#unit-test-components-vue-2}%

当你使用的是 [Vue Test Utils 1](https://v1.test-utils.vuejs.org/zh/) 时，请将 Pinia 安装在 `localVue` 上：

```js
import { PiniaVuePlugin } from 'pinia'
import { createLocalVue, mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

const localVue = createLocalVue()
localVue.use(PiniaVuePlugin)

const wrapper = mount(Counter, {
  localVue,
  pinia: createTestingPinia(),
})

const store = useSomeStore() // 使用 pinia 的测试实例！
```


## 不使用 setup() 的用法

### 不使用 `setup()` 的用法 %{#usage-without-setup}%

即使你没有使用组合式 API，也可以使用 Pinia(如果你使用 Vue 2，你仍然需要安装 `@vue/composition-api` 插件)。虽然我们推荐你试着学习一下组合式 API，但对你和你的团队来说目前可能还不是时候，你可能正在迁移一个应用，或者有其他原因。你可以试试下面几个函数：

- [mapStores](https://pinia.vuejs.org/zh/cookbook/options-api.html#giving-access-to-the-whole-store)
- [mapState](https://pinia.vuejs.org/zh/core-concepts/state#usage-with-the-options-api)
- [mapWritableState](https://pinia.vuejs.org/zh/core-concepts/state#modifiable-state)
- ⚠️ [mapGetters](https://pinia.vuejs.org/zh/core-concepts/getters#without-setup) (只是为了迁移方便，请用 `mapState()` 代替)
- [mapActions](https://pinia.vuejs.org/zh/core-concepts/actions#without-setup)

#### 给予整个 store 的访问权 %{#giving-access-to-the-whole-store}%

如果你需要访问 store 里的大部分内容，映射 store 的每一个属性可能太麻烦。你可以试试用 `mapStores()` 来访问整个 store：

```js
import { mapStores } from 'pinia'

// 给出具有以下 id 的两个 store
const useUserStore = defineStore('user', {
  // ...
})
const useCartStore = defineStore('cart', {
  // ...
})

export default {
  computed: {
    // 注意，我们不是在传递一个数组，而是一个接一个的 store。
    // 可以 id+'Store' 的形式访问每个 store 。
    ...mapStores(useCartStore, useUserStore)
  },

  methods: {
    async buyStuff() {
      // 可以在任何地方使用他们！
      if (this.userStore.isAuthenticated()) {
        await this.cartStore.buy()
        this.$router.push('/purchased')
      }
    },
  },
}
```

默认情况下，Pinia 会在每个 store 的 `id` 后面加上 `"Store"` 的后缀。你可以通过调用 `setMapStoreSuffix()` 来自定义：

```js
import { createPinia, setMapStoreSuffix } from 'pinia'

// 完全删除后缀：this.user, this.cart
setMapStoreSuffix('')
// this.user_store, this.cart_store (没关系，我不会批评你的)
setMapStoreSuffix('_store')
export const pinia = createPinia()
```

#### TypeScript %{#typescript}%

默认情况下，所有映射辅助函数都支持自动补全，你不需要做任何事情。如果你调用 `setMapStoreSuffix()` 修改了 `"Store"` 的后缀，你还需要在 TS 文件或 `global.d.ts` 文件的某个地方添加它。最方便的地方就是你调用 `setMapStoreSuffix()` 的地方：

```ts
import { createPinia, setMapStoreSuffix } from 'pinia'

setMapStoreSuffix('') // 完全删除后缀
export const pinia = createPinia()

declare module 'pinia' {
  export interface MapStoresCustomization {
    // 设置成和上面一样的值
    suffix: ''
  }
}
```

:::warning
如果你使用的是 TypeScript 声明文件(如 `global.d.ts`)，请确保在文件顶部 `import 'pinia'`，以暴露所有现有类型。
:::


## 组合式 Stores

### 组合式 Store %{#composing-stores}%

组合式 store 是可以相互使用，Pinia 当然也支持它。但有一个规则需要遵循：

如果**两个或更多的 store 相互使用**，它们不可以通过 *getters* 或 *actions* 创建一个无限循环。它们也不可以**同时**在它们的 setup 函数中直接互相读取对方的 state：

```js
const useX = defineStore('x', () => {
  const y = useY()

  // ❌ 这是不可以的，因为 y 也试图读取 x.name
  y.name

  function doSomething() {
    // ✅ 读取 computed 或 action 中的 y 属性
    const yName = y.name
    // ...
  }

  return {
    name: ref('I am X'),
  }
})

const useY = defineStore('y', () => {
  const x = useX()

  // ❌ 这是不可以的，因为 x 也试图读取 y.name
  x.name

  function doSomething() {
    // ✅ 读取 computed 或 action 中的 x 属性
    const xName = x.name
    // ...
  }

  return {
    name: ref('I am Y'),
  }
})
```

#### 嵌套 store %{#nested-stores}%

注意，如果一个 store 使用另一个 store，你可以直接导入并在 *actions* 和 *getters* 中调用 `useStore()` 函数。然后你就可以像在 Vue 组件中那样使用 store。参考[共享 Getter](https://pinia.vuejs.org/zh/cookbook/composing-stores.html#shared-getters) 和[共享 Action](https://pinia.vuejs.org/zh/cookbook/composing-stores.html#shared-actions)。

对于 *setup store* ，你直接使用 store 函数**顶部**的一个 store：

```ts
import { useUserStore } from './user'

export const useCartStore = defineStore('cart', () => {
  const user = useUserStore()
  const list = ref([])

  const summary = computed(() => {
    return `Hi ${user.name}, you have ${list.value.length} items in your cart. It costs ${price.value}.`
  })

  function purchase() {
    return apiPurchase(user.id, this.list)
  }

  return { summary, purchase }
})
```

#### 共享 Getter %{#shared-getters}%

你可以直接在一个 *getter* 中调用 `useOtherStore()`：

```js
import { defineStore } from 'pinia'
import { useUserStore } from './user'

export const useCartStore = defineStore('cart', {
  getters: {
    summary(state) {
      const user = useUserStore()

      return `Hi ${user.name}, you have ${state.list.length} items in your cart. It costs ${state.price}.`
    },
  },
})
```

#### 共享 Actions %{#shared-actions}%

*actions* 也一样：

```js
import { defineStore } from 'pinia'
import { useUserStore } from './user'

export const useCartStore = defineStore('cart', {
  actions: {
    async orderCart() {
      const user = useUserStore()

      try {
        await apiOrderCart(user.token, this.items)
        // 其他 action
        this.emptyCart()
      } catch (err) {
        displayError(err)
      }
    },
  },
})
```


## 从 v0/v1 迁移至 v2

### 从 0.x (v1) 迁移至 v2 %{#migrating-from-0-x-v1-to-v2}%

从 `2.0.0-rc.4` 版本开始，pinia 同时支持 Vue 2 和 Vue 3！这意味着，v2 版本的所有更新，将会让 Vue 2 和 Vue 3 的用户都受益。如果你使用的是 Vue 3，这对你来说没有任何改变，因为你已经在使用 rc 版本，你可以查看[发布日志](https://github.com/vuejs/pinia/blob/v2/packages/pinia/CHANGELOG.md)来了解所有更新的详细解释。如果你使用的不是 Vue 3，**那这个指南是为你准备的**!

#### 弃用 %{#deprecations}%

让我们来看看你需要对你的代码做出的所有修改。首先，为了解所有弃用，确保你已经在运行最新的 0.x 版本：

```shell
npm i 'pinia@^0.x.x'
### 或者使用 yarn
yarn add 'pinia@^0.x.x'
```

如果你正在使用 ESLint，可以考虑使用[这个插件](https://github.com/gund/eslint-plugin-deprecation)，来查找所有废弃的用法。否则，你得手动检查。这些都是被废弃且已经删除了的 API：

- `createStore()` 变成 `defineStore()`
- 在订阅中，`storeName` 变成 `storeId`
- `PiniaPlugin` 更名为 `PiniaVuePlugin`(Vue 2 的 Pinia 插件)
- `$subscribe()` 不再接受 *boolean* 作为第二个参数，而是传递一个带有 `detached: true` 的对象。
- Pinia 插件不再直接接收 store 的 `id`。使用 `store.$id` 代替。

#### 非兼容性更新 %{#breaking-changes}%

删除下面这些后，你可以用下面命令升级到 V2 版了：

```shell
npm i 'pinia@^2.x.x'
### 或者使用 yarn
yarn add 'pinia@^2.x.x'
```

然后开始更新你的代码。

##### 通用 Store 类型 %{#generic-store-type}%

添加于 [2.0.0-rc.0](https://github.com/vuejs/pinia/blob/v2/packages/pinia/CHANGELOG.md#200-rc0-2021-07-28)

用 `StoreGeneric` 取代 `GenericStore` 类型的全部用法。这是新的通用 store 类型，应该可以接受任何类型的 store。如果你在写函数时使用 `Store` 类型而不想传递其泛型 (例如`Store<Id, State, Getters, Actions>`)，你可以使用 `StoreGeneric`，因为没有泛型的 `Store` 类型会创建一个空的 store 类型：

```ts
function takeAnyStore(store: Store) {} // [!code --]
function takeAnyStore(store: StoreGeneric) {} // [!code ++]
function takeAnyStore(store: GenericStore) {} // [!code --]
function takeAnyStore(store: StoreGeneric) {} // [!code ++]
```

#### 针对插件的 `DefineStoreOptions` %{#definestoreoptions-for-plugins}%

如果你在用 TypeScript 写插件并扩展了 `DefineStoreOptions` 类型来添加自定义选项，你应该把它改名为 `DefineStoreOptionsBase`。这个类型将同时适用于 setup 和 option store。

```ts
declare module 'pinia' {
  export interface DefineStoreOptions<S, Store> { // [!code --]
  export interface DefineStoreOptionsBase<S, Store> { // [!code ++]
    debounce?: {
      [k in keyof StoreActions<Store>]?: number
    }
  }
}
```

#### `PiniaStorePlugin` 已被重命名 %{#piniastoreplugin-was-renamed}%

类型 `PiniaStorePlugin` 被重新命名为 `PiniaPlugin`。

```ts
import { PiniaStorePlugin } from 'pinia' // [!code --]
import { PiniaPlugin } from 'pinia' // [!code ++]
const piniaPlugin: PiniaStorePlugin = () => { // [!code --]
const piniaPlugin: PiniaPlugin = () => { // [!code ++]
  // ...
}
```

**注意这个更新只能在升级到最新的没有弃用的 Pinia 版本后生效**。

#### `@vue/composition-api` 版本 %{#vue-composition-api-version}%

由于 pinia 目前依赖于 `effectScope()` ，你使用的 `@vue/composition-api` 的版本必须是 `1.1.0` 及以上：

```shell
npm i @vue/composition-api@latest
### 或者使用 yarn
yarn add @vue/composition-api@latest
```

#### 支持 webpack 4 %{#webpack-4-support}%

如果你使用的是 webpack 4 (Vue CLI 使用的是 webpack 4)，你可能会遇到这样的错误：

```
ERROR  Failed to compile with 18 errors

 error  in ./node_modules/pinia/dist/pinia.mjs

Can't import the named export 'computed' from non EcmaScript module (only default export is available)
```

这是构建文件为支持 Node.js 中的原生 ESM 模块进行的现代化适配。为更好地支持 Node，文件现在使用的扩展名是 `.mjs` 和 `.cjs`。要解决这个问题，你有两种可用的方法：

- 如果你使用 Vue CLI 4.x，升级你的依赖。具体修复步骤如下。
  - 如果你不可能升级，请将下面的代码添加到你的 `vue.config.js` 中：

    ```js
    // vue.config.js
    module.exports = {
      configureWebpack: {
        module: {
          rules: [
            {
              test: /\.mjs$/,
              include: /node_modules/,
              type: 'javascript/auto',
            },
          ],
        },
      },
    }
    ```

- 如果你手动处理 webpack，你将必须让它知道如何处理 `.mjs` 文件：

  ```js
  // webpack.config.js
  module.exports = {
    module: {
      rules: [
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto',
        },
      ],
    },
  }
  ```

#### Devtools %{#devtools}%

Pinia v2 不再劫持 Vue Devtools v5，它需要的是 Vue Devtools v6。可以在 [Vue Devtools 文档](https://devtools.vuejs.org/guide/installation.html#chrome)中找到该扩展 **beta 版本**的下载链接。

#### Nuxt %{#nuxt}%

如果你正在使用 Nuxt，pinia 现在有了专门的 Nuxt 软件包🎉。请用以下方法安装它：

```bash
npm i @pinia/nuxt
### 或者使用 yarn
yarn add @pinia/nuxt
```

还要确保**更新你的 `@nuxtjs/composition-api` 包**。

如果你使用 TypeScript，还要调整你的 `nuxt.config.js` 和 `tsconfig.json`：

```js
// nuxt.config.js
module.exports {
  buildModules: [
    '@nuxtjs/composition-api/module',
    'pinia/nuxt', // [!code --]
    '@pinia/nuxt', // [!code ++]
  ],
}
```

```json
// tsconfig.json
{
  "types": [
    // ...
    "pinia/nuxt/types" // [!code --]
    "@pinia/nuxt" // [!code ++]
  ]
}
```

[Nuxt 专属章节](https://pinia.vuejs.org/zh/ssr/nuxt)也值得一读。


## 处理组合式函数

### 处理组合式函数 %{#dealing-with-composables}%

[组合式函数](https://cn.vuejs.org/guide/reusability/composables.html#composables)是利用 Vue 组合式 API 来封装和复用有状态逻辑的函数。无论你是自己写，还是使用[外部库](https://vueuse.org/)，或者两者都有，你都可以在 pinia store 中充分发挥组合式函数的力量。

#### Option Stores %{#option-stores}%

当定义一个 option store 时，你可以在 `state` 属性中调用组合式函数：

```ts
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: useLocalStorage('pinia/auth/login', 'bob'),
  }),
})
```

请记住，**你只能返回可写的状态** (例如，一个 `ref()`) 。下面是一些可用的组合式函数的示例：

- [useLocalStorage](https://vueuse.org/core/useLocalStorage/)
- [useAsyncState](https://vueuse.org/core/useAsyncState/)

下面是一些不可在 option store 中使用的组合式函数 (但可在 setup store 中使用) ：

- [useMediaControls](https://vueuse.org/core/useMediaControls/): exposes functions
- [useMemoryInfo](https://vueuse.org/core/useMemory/): exposes readonly data
- [useEyeDropper](https://vueuse.org/core/useEyeDropper/): exposes readonly data and functions

#### Setup Stores %{#setup-stores}%

另外，当定义一个 setup store 时，你几乎可以使用任何组合式函数，因为每一个属性都会被辨别为 state 、action 或者 getter：

```ts
import { defineStore, skipHydrate } from 'pinia'
import { useMediaControls } from '@vueuse/core'

export const useVideoPlayer = defineStore('video', () => {
  // 我们不会直接暴露这个元素
  const videoElement = ref<HTMLVideoElement>()
  const src = ref('/data/video.mp4')
  const { playing, volume, currentTime, togglePictureInPicture } =
    useMediaControls(video, { src })

  function loadVideo(element: HTMLVideoElement, src: string) {
    videoElement.value = element
    src.value = src
  }

  return {
    src,
    playing,
    volume,
    currentTime,

    loadVideo,
    togglePictureInPicture,
  }
})
```

#### 服务端渲染 %{#ssr}%

当处理[服务端渲染](https://pinia.vuejs.org/zh/ssr/index)时，你有一些需要额外注意的内容，以便在 store 中使用组合式函数。

在 [Option Store](https://pinia.vuejs.org/zh/cookbook/composables.html#option-stores) 中，你需要定义一个 `hydrate()` 函数。当 store 在客户端 (浏览器) 上被实例化的过程中，创建 store 时有一个可用的初始状态时，这个函数就会被调用。我们需要定义这个函数的原因是，在这种情况下，`state()` 是不会被调用的。

```ts
import { defineStore, skipHydrate } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: useLocalStorage('pinia/auth/login', 'bob'),
  }),

  hydrate(state, initialState) {
    // 在这种情况下，我们可以完全忽略初始状态
    // 因为我们想从浏览器中读取数值。
    state.user = useLocalStorage('pinia/auth/login', 'bob')
  },
})
```

在 [Setup Store](https://pinia.vuejs.org/zh/cookbook/composables.html#setup-stores) 中，对于任何不应该从初始状态中接收的 state 属性 你都需要使用一个名为 `skipHydrate()` 的辅助函数。与 option store 不同，setup store 不能直接**跳过调用 `state()`**，所以我们用 `skipHydrate()` 标记那些不能被激活的属性。请注意，这只适用于可写的响应式属性：

```ts
import { defineStore, skipHydrate } from 'pinia'
import { useEyeDropper, useLocalStorage } from '@vueuse/core'

const useColorStore = defineStore('colors', () => {
  const { isSupported, open, sRGBHex } = useEyeDropper()
  const lastColor = useLocalStorage('lastColor', sRGBHex)
  // ...
  return {
    lastColor: skipHydrate(lastColor), // Ref<string>
    open, // Function
    isSupported, // boolean (非响应式)
  }
})
```
