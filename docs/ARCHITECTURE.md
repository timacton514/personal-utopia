# 架构说明

本文描述 Vue 3 + Vite 重构版（v2）的整体结构、状态流与扩展方式。文中路径均相对仓库根目录，若与代码不一致，以 `src/` 下的实际文件为准。

- 阅读顺序建议：先看「组件树」建立整体印象，再看「状态与数据流」，最后按需看「扩展指南」。
- 旧版静态实现（`css/`、`js/`、`lib/` 下的 `app.js` / `ui.js` / `scene.js` / `novel-data.js`）已被 Vue 组件与 ES Module 取代，对应关系见文末「旧版 → 新版对应关系」。

## 技术栈与入口

| 项 | 内容 |
| --- | --- |
| 框架 | Vue 3（全部组件使用 `<script setup>` 组合式 API） |
| 构建 | Vite（`vite.config.js`，生产 base 为 `/personal-utopia/`） |
| 3D | Three.js `0.163.0`（npm 依赖，`import * as THREE from 'three'`） |
| 入口 HTML | 根目录 `index.html`，仅保留 `<div id="app">` 与 `<script type="module" src="/src/main.js">` |
| 应用入口 | `src/main.js`：`createApp(App).mount('#app')`，并引入 `src/assets/styles/index.css` |

> 全站是单页滚动叙事，没有 vue-router，也没有 Pinia/Vuex；跨组件状态由 `src/composables/useStoryState.js` 的 reactive 单例承担。

## 组件树

```
App.vue                              应用外壳：加载遮罩、3D 画布、氛围层、文本层、全局控件
├─ LoadingScreen.vue                 加载遮罩 #loading（600ms 后淡出，1400ms 后 emit done 并卸载）
├─ MarsCanvas.vue                    <canvas id="mars-scene">，内部调用 useMarsScene()
│  └─ useMarsScene.js                Three.js 生命周期封装（见「3D 场景」）
├─ div#vignette                      暗角层，样式随 atmosphereLevel 计算
├─ div#haze-bottom                   底部雾气层，样式随 atmosphereLevel 计算
├─ main#text-overlay                 文本层（最大宽度 700px 居中）
│  ├─ TitleScreen.vue                #title-screen 封面
│  └─ StoryFeed.vue                  #segments-container，按数据顺序渲染全部 68 个段落
│     └─ segments/StorySegment.vue   段落分发器（按 segment.type 选组件）× 68
│        ├─ ChapterHeaderSegment.vue type: chapter-header
│        ├─ PoemSegment.vue          type: poem
│        ├─ EntrySegment.vue         type: entry
│        │  ├─ MetaHeader.vue        元数据行（character / visibility / coordinates / timestamp）
│        │  └─ StoryLine.vue        正文行；富文本由 RichText.vue 解析 ~~删除线~~
│        ├─ PaperSegment.vue         type: paper
│        ├─ SystemSegment.vue        type: system
│        ├─ SearchSegment.vue        type: search
│        ├─ DividerSegment.vue       type: divider
│        ├─ EndingSegment.vue        type: ending
│        └─ DefaultSegment.vue       未知 type 的回退组件
├─ ChapterNav.vue                    #chapter-nav 章节目录（按钮 + 面板）
├─ ControlBar.vue                    #controls A/B 面筛选、大气浓度切换
└─ ProgressBar.vue                   #progress-bar 阅读进度条
```

补充：

- `StorySegment.vue` 实际位于 `src/components/segments/`（与外层组件分开），组件通过 `type → 组件` 映射表分发，映射表内没有的 `type` 落到 `DefaultSegment.vue`。
- `StorySegment.vue` 负责给每个段落组件传 `segment`（数据对象）、`index`（在 `NOVEL_SEGMENTS` 中的下标）、`elementId`（DOM id，默认 `segment.id`，缺失时回退 `seg-{index}`）；除 `StorySegment` 外的段落组件按需声明 prop（多数只用到 `segment` 与 `elementId`）。
- 每个段落组件的根元素都带 `.segment` 类，同时按类型追加 `chapter-header` / `poem` / `system-msg` / `paper` / `divider` / `ending-panel` 等类名，样式集中在 `src/assets/styles/segments.css` 与 `story-end.css`。

## 状态：useStoryState.js

`src/composables/useStoryState.js` 导出**单例** `reactive` 对象 `storyState`，所有跨组件共享的交互状态都集中在这里。组件只读该对象，修改一律调用同文件导出的 action 函数。

| 字段 | 类型 / 初值 | 含义 | 谁在读 / 谁在改 |
| --- | --- | --- | --- |
| `scrollProgress` | Number，0 | 整篇滚动进度 0~1 | `App.vue` 滚动时 `setScrollProgress()`；`ProgressBar.vue` 读宽度；`useMarsScene.js` watch 后驱动 3D |
| `atmosphereLevel` | Number，3 | 大气浓度 1~5 | `ControlBar.vue` 调 `cycleAtmosphere()`；`App.vue` 读它算暗角/雾气；`useMarsScene.js` watch 后写入场景 |
| `showSideA` | Boolean，true | A 面（诗）是否显示 | `ControlBar.vue` 调 `toggleSideA()`；`StoryFeed.vue` 经 `isSegmentVisible()` 读 |
| `showSideB` | Boolean，true | B 面（记录）是否显示 | `ControlBar.vue` 调 `toggleSideB()`；同上 |
| `navOpen` | Boolean，false | 章节目录面板是否展开 | `ChapterNav.vue` 调 `toggleNav()/closeNav()` |
| `loading` | Boolean，true | 加载遮罩状态 | **预留字段**：当前加载遮罩由 `App.vue` 内的局部 `showLoading` ref 控制，代码中尚未读写该字段 |
| `activeSegmentId` | String \| null，null | 当前进入视口的段落 id | `StoryFeed.vue` 的 IntersectionObserver 调 `setActiveSegment()`；`useChapterNavigation.js` 的 `activeNavId` 读它 |

同文件还导出：

- 常量 `ATMOSPHERE_MAX = 5`；
- `isSegmentVisible(segment)`：`side === 'A'` 看 `showSideA`，`side === 'B'` 看 `showSideB`，`meta` 等其它值恒为可见；
- `atmosphereFactor(level = atmosphereLevel)`：把 1~5 映射为 0~1（`(level - 1) / 4`），供渐变与 3D 亮度插值使用；
- `setAtmosphereLevel()`：把浓度钳制在 1~5。

## 数据流

### 1. 滚动 → 进度 → 场景 + 进度条

```
window scroll（App.vue 监听，passive）
  → getScrollProgress() = scrollY / (scrollHeight - innerHeight)，钳制 0~1
  → setScrollProgress() 写入 storyState.scrollProgress
      ├─ ProgressBar.vue：computed 宽度 width = scrollProgress * 100%
      └─ useMarsScene.js：watch(scrollProgress) → MarsScene.setFromProgress(progress)
             （镜头目标机位 / 尘埃目标浓度 / 绿色立方体状态 / 藤蔓长度 / 太阳与流星区间）
```

`App.vue` 在 `onMounted` 时立即执行一次 `handleScroll()`，保证首屏状态正确；组件卸载时移除监听。锚点平滑滚动依赖 `base.css` 中 `html { scroll-behavior: smooth; }`。

### 2. 大气浓度 → 氛围层 + 3D

```
ControlBar.vue 点击大气按钮 → cycleAtmosphere()：1 → 2 → … → 5 → 1
  → storyState.atmosphereLevel
      ├─ App.vue 的 vignetteStyle / hazeStyle（computed 调用 atmosphereFactor()）
      │    暗角：radial-gradient 中心透明范围 70% → 40%，边缘 alpha 0.35 → 0.95
      │    雾气：linear-gradient 底部 alpha 0.5 → 0.95
      └─ useMarsScene.js：watch(atmosphereLevel) → scene.atmosphereLevel = level
            MarsScene.render() 每帧在 updateDust() 中平滑调整：
            曝光 1.5 → 0.1、环境光 0.7 → 0.06、背景色变暗、尘埃透明度 × (level / 3)
```

浓度变化是逐帧插值（约 2%~3% 趋近），不是瞬时切换。

### 3. 视口 → 目录高亮

```
StoryFeed.vue：IntersectionObserver（threshold 0.2）观察所有 .segment
  → 进入视口时 setActiveSegment(entry.target.id) → storyState.activeSegmentId
  → useChapterNavigation.js 的 activeNavId（computed）：
      取「下标 ≤ 当前段落下标」的最后一个 chapter-header，没有则回退封面
  → ChapterNav.vue 给对应 <li> 加 active 类
```

点击目录项走 `goToNavItem(id)`：先 `closeNav()` 收起面板，再 `scrollToId(id)`（`src/utils/scroll.js`，内部 `scrollIntoView({ behavior: 'smooth', block: 'start' })`）。封面用固定 id `title-screen`，结尾用 `story-end`。

### 4. A/B 面筛选

`StoryFeed.vue` 用 `isSegmentVisible(segment)` 给每个 `StorySegment` 动态加 `.is-hidden` 类（`display: none`），**不重建 DOM**，因此滚动位置、IntersectionObserver 观察目标与锚点都保持稳定。数据里 `side` 为 `meta` 的段落（导读等）不参与筛选。

### 5. 键盘与其它交互

| 交互 | 实现位置 |
| --- | --- |
| 滚动更新进度 | `App.vue` `handleScroll` |
| `[` / `]` 上一章 / 下一章 | `App.vue` → `useChapterNavigation.js#navigateChapter` |
| `a` / `b` 切换 A/B 面 | `App.vue` → `toggleSideA()/toggleSideB()` |
| `Esc` 收起目录 | `App.vue` → `closeNav()` |
| 点击目录、外部点击收起 | `ChapterNav.vue` |
| 删除线行点击「恢复」 | `StoryLine.vue`（`style === 'strikethrough'` 的行）、`RichText.vue`（meta 字段里的 `~~…~~` 片段） |
| 纸页段落点击 | `PaperSegment.vue`（切换 `paper-expanded` 类；当前没有对应样式规则） |
| 握手符号回到 B 面开头 | `EndingSegment.vue` → `scrollToId('preface')` |
| 带 `#段落id` 的链接直接定位 | `App.vue` `onMounted` 中延迟 800ms 后 `scrollToId()` |

## 3D 场景

`src/scene/MarsScene.js` 导出 `MarsScene` 类（原生 Three.js 封装，不依赖 Vue），`src/composables/useMarsScene.js` 负责把它接入 Vue 生命周期。

### MarsScene 类

| 成员 | 说明 |
| --- | --- |
| `constructor(canvas)` | 保存 canvas、创建 `THREE.Clock`、初始 `scrollProgress = 0`、`atmosphereLevel = 3`、`cubeState = 'IDLE'`、`vineLength = 0`，调用 `init()` |
| `init()` | 创建渲染器（`antialias`、`alpha`、pixelRatio ≤ 2、`ACESFilmicToneMapping`、曝光 1.1）、场景（背景 `0x0A0402`、`FogExp2`）、透视相机（60°，初始位于 `(0, 3.5, 9)`）、环境光 + 暖色主光 + 冷色轮廓光，然后依次创建天空、地形、尘埃、绿色立方体、太阳、流星，并注册 `window resize` |
| `createSky()` / `createTerrain()` / `createDustParticles()` / `createGreenCube()` / `createSunSphere()` / `createMeteors()` | 场景元素构建。地形是 24×24、160×160 分段的平面，叠加 fbm 噪声与 Olympus Mons 隆起；尘埃 2500 个粒子；流星是一组绕行的小石块 |
| `setFromProgress(progress)` | 按进度分区设置**目标**机位、注视点、尘埃目标浓度、立方体状态（`IDLE` / `ACTIVE` / `AGITATED` / `DIM`）、藤蔓长度，并更新环境光强度 |
| `render()` | 每帧调用：`updateCube` → `updateDust` → `updateSun` → `updateMeteors` → `updateCamera` → `renderer.render`（`dt` 限幅 0.1s） |
| `dispose()` | 移除 resize 监听，遍历场景释放 geometry / material，调用 `renderer.dispose()` |
| `onResize()` | 更新相机宽高比与渲染器尺寸 |
| `atmosphereLevel` 属性 | 由外部（`useMarsScene.js` 的 watch）写入，`updateDust()` 中参与曝光/环境光/背景/尘埃计算 |

`setFromProgress` 的进度分区（也是镜头调参入口，数值为当前代码中的区间端点）：

| 进度区间 | 叙事位置 | 机位/注视点变化 | 尘埃/立方体/藤蔓 |
| --- | --- | --- | --- |
| `< 0.05` | 封面 / 导读 | `camY` 4.5，`camZ` 9，注视点 `(0, 0.5, 0)`，最远最静 | 尘埃 0.25，`IDLE`，藤蔓 0 |
| `0.05 ~ 0.15` | A-side 诗 | `camY` 4 → 5.5，`camZ` 9 → 7（抬高并拉近） | 尘埃 0.3，`IDLE`，藤蔓 0 |
| `0.15 ~ 0.25` | 序 零之下 | `camY` 5.5 → 2.5，`camZ` 7 → 5（下压贴近地面） | 尘埃 0.4 → 0.7，`IDLE`，藤蔓 0 → 0.1 |
| `0.25 ~ 0.40` | 一 前兆 / 二 未来 | `camY` 2.5 → 1.0，`camZ` 5 → 3.5 | 尘埃 0.6 → 0.9，区间后半段 `ACTIVE`，藤蔓 0 → 0.5 |
| `0.40 ~ 0.55` | 三 盗火 | `camY` 1.0 → 0.7，`camZ` 3.5 → 2.5（低机位近景） | 尘埃 0.8 → 1.0，`AGITATED`，藤蔓 0.5 → 1.0 |
| `0.55 ~ 0.70` | 四 洛希极限 | `camY` 0.7 → 1.5，`camZ` 2.5 → 2.0 | 尘埃 1.0（最浓），`AGITATED`，藤蔓 1.0 |
| `0.70 ~ 0.85` | 五 乌托邦 | `camY` 1.5 → 0.7，`camZ` 2.0 → 1.5 | 尘埃 1.0 → 0.4，`DIM`，藤蔓 1.0 → 0.7 |
| `>= 0.85` | 末 索拉里斯 | `camY` 0.7 → 0.4，`camZ` 1.5 → 1.2（贴地收尾） | 尘埃 0.4 → 0.1，`DIM`，藤蔓 0.7 → 0.4 |

> 表内只列了主要的 `camY` / `camZ`；`camX`、注视点与各分段的缓动在代码中逐区间定义，改机位时直接对照代码即可。`dustOpacity` / `vineLen` 是目标值，渲染循环里逐帧平滑趋近（藤蔓按 0.03 插值，相机按 0.02 / 0.03 插值）。

另有两处按进度触发的独立效果：太阳在 `0.62 ~ 0.75` 区间逐渐放大显现、`>= 0.75` 后熄灭（`updateSun`）；流星在 `0.3 ~ 0.82` 区间可见、`0.5 ~ 0.7` 强度最高（`updateMeteors`）。

### useMarsScene.js 组合式函数

`useMarsScene(canvasRef)` 的职责：

- `onMounted`：读取 `canvasRef.value`，创建 `MarsScene`，同步当前 `atmosphereLevel` 与 `scrollProgress`，启动 `requestAnimationFrame` 循环（每帧 `scene.render()`）；
- `watch`：`storyState.scrollProgress` → `scene.setFromProgress()`；`storyState.atmosphereLevel` → `scene.atmosphereLevel`；
- `onBeforeUnmount`：`cancelAnimationFrame`、`scene.dispose()`、置空引用（开发期 HMR 不会泄漏 WebGL 上下文）。

> 旧版 `js/scene.js` 没有 `dispose()`，渲染循环由 `app.js` 的 `animate()` 递归 `requestAnimationFrame` 维护；新版把这两件事分别放进类方法和组合式函数。

## 样式组织

样式入口 `src/assets/styles/index.css`，`@import` 顺序即层叠顺序：

```
base.css        主题变量（色板、字体、过渡）、reset、body 背景
layout.css      #mars-scene / #vignette / #haze-bottom / #text-overlay / 封面
segments.css    段落面板、meta 行、各种 .line 样式、折叠、A/B 隐藏
navigation.css  目录按钮与面板
controls.css    右上角 A/B/大气按钮
story-end.css   结尾面板、握手按钮、restart 提示
loading.css     加载遮罩与方块动画
animations.css  fade-in-up / bounce / cube-loading 等 keyframes
responsive.css  768px、480px 两档断点（窄屏把控件移到底部）
```

主题色与字体都定义在 `base.css` 的 `:root` 里（如 `--mars-red`、`--cube-green`、`--font-serif`、`--font-mono`），改配色/字体优先改变量，不要在组件里写死颜色。

## 段落类型表

| `type` | 渲染组件 | 主要数据字段 | 说明 |
| --- | --- | --- | --- |
| `chapter-header` | `ChapterHeaderSegment.vue` | `title`、`chapterNum` | `chapterNum` 为空时不渲染编号；所有章节标题会进入目录 |
| `entry` | `EntrySegment.vue` | `character`、`visibility`、`coordinates`、`timestamp`、`metaSecond`、`isDeleted`、`foldAfter`+`summary`、`collapsible`+`defaultOpen`+`summary`、`content[]` | 日记/记录体主体，支持元数据行、局部折叠、整段折叠与删除状态 |
| `poem` | `PoemSegment.vue` | `poemTitle`、`content[].text` | 居中诗体，忽略 `line.style`（统一 `.line`） |
| `paper` | `PaperSegment.vue` | `content[]` | 纸页样式，点击切换 `paper-expanded` |
| `system` | `SystemSegment.vue` | `content[]` | 终端/系统消息，行上额外加 `.system-line` |
| `search` | `SearchSegment.vue` | `query`、`content[]` | 先渲染查询语 `.search-query`，再渲染系统消息行 |
| `divider` | `DividerSegment.vue` | 无 | 纯视觉分隔（CSS `content` 生成 `— ◆ —`） |
| `ending` | `EndingSegment.vue` | `content[]`，按 `line.style` 分 `end-symbol` / `end-text` / `end-hint` | 握手符号点击回到 `id="preface"` 的段落 |
| 其它 | `DefaultSegment.vue` | `content[]` | 未登记 type 的回退渲染 |

`entry` 的元数据渲染细节见 [CONTENT_GUIDE.md](CONTENT_GUIDE.md)。

## 扩展指南

### 新增一种段落类型

1. 在 `src/components/segments/` 新建 `XxxSegment.vue`，可接收 `segment`、`index`、`elementId` 三个 prop（至少声明 `segment` 与 `elementId`），根元素写 `:id="elementId"` 并加 `.segment` 类。
2. 在 `src/components/segments/StorySegment.vue` 的 `SEGMENT_COMPONENTS` 映射表登记：`'xxx': XxxSegment`。
3. 需要专属样式时加到 `src/assets/styles/segments.css`（或新建样式文件并在 `index.css` 末尾 `@import`，注意层叠顺序）。
4. 不需要改目录逻辑：只有 `type === 'chapter-header'` 的段落会进入目录。

### 新增一章

1. 打开 `src/data/novel-data.js`，在 `NOVEL_SEGMENTS` 数组的**目标阅读位置**插入章节标题段落：

   ```js
   {
     id: 'ch-06',            // 唯一，作为 DOM id 与跳转锚点
     side: 'B',              // A / B / meta，决定受哪个筛选按钮控制
     type: 'chapter-header',
     title: '六 新章节',
     chapterNum: '六',        // 可为 null，不显示编号
     content: [],
   },
   ```

2. 其后按顺序追加该章正文（`entry` / `poem` / `paper` 等），顺序即阅读顺序。
3. 章节目录自动更新（`useChapterNavigation.js` 过滤 `type === 'chapter-header'`），无需改其它文件。
4. 若想调整 3D 镜头与新章节的对应关系，按新章节在全文中的大致进度修改 `MarsScene#setFromProgress` 的分区（见下）。

### 调整镜头参数

- 所有镜头关键帧集中在 `src/scene/MarsScene.js` 的 `setFromProgress(progress)` 中，按进度区间设置 `camX/camY/camZ`（目标机位）、`lookX/lookY/lookZ`（目标注视点）、`dustOpacity`、`cubeState`、`vineLen`。
- 修改后无需动相机平滑逻辑：`updateCamera()` 每帧以 0.02（位置）/ 0.03（注视点）的系数朝目标插值。
- 太阳与流星是独立效果，分别在 `updateSun()`、`updateMeteors()` 里用硬编码进度区间控制，调镜头时若同时移动了叙事节奏，记得一并校准这两个区间。
- 区间边界必须覆盖 0~1 且首尾衔接，否则会出现机位突跳；改完后滚动全篇检查一遍。

### 新增交互控件

`ControlBar.vue` 中加按钮 → 在 `useStoryState.js` 加对应状态字段与 action → 在需要的组件里读该状态。保持「组件只读状态、修改走 action」的约定。

## 旧版 → 新版对应关系

| 旧版文件 / 逻辑 | 新版位置 |
| --- | --- |
| `js/app.js` 的 `App` 类（初始化场景与 UI、回调接线、`animate()` RAF、hash 导航） | `src/App.vue`（生命周期、滚动与键盘、hash 定位）+ `src/composables/useMarsScene.js`（场景创建与渲染循环）；锚点跳转统一走 `src/utils/scroll.js` |
| `js/ui.js` `renderSegment()` 的 `switch (seg.type)` | `src/components/segments/StorySegment.vue` 的 `SEGMENT_COMPONENTS` 映射 + 各段落组件 |
| `js/ui.js` `renderAllSegments()` / `#segments-container` 的 DOM 拼装 | `src/components/StoryFeed.vue`（`v-for` 渲染）+ `StorySegment.vue` |
| `js/ui.js` 元数据头部、`~~删除线~~` 解析、`metaSecond` 第二行 | `EntrySegment.vue` + `MetaHeader.vue` + `RichText.vue` |
| `js/ui.js` 的 `details` 折叠（`foldAfter` / `collapsible` / `defaultOpen` / `summary`） | `EntrySegment.vue`（`useInlineFold` / `useCollapsible` 分支）+ `StoryLine.vue` |
| `js/ui.js` 删除线点击恢复（`.restored`） | `StoryLine.vue`（正文行）、`RichText.vue`（meta 字段片段） |
| `js/ui.js` `buildNavigation()` / `updateActiveNav()` / `isBeforeInDOM()` | `src/composables/useChapterNavigation.js`（`CHAPTER_SEGMENTS`、`navItems`、`activeNavId`、`navigateChapter`）+ `ChapterNav.vue` |
| `js/ui.js` `bindEvents()` 中的目录、A/B 筛选、大气按钮、键盘、滚动、重开按钮 | `ChapterNav.vue`、`ControlBar.vue`、`App.vue`（键盘/滚动）、`EndingSegment.vue`（重开）、`ProgressBar.vue`（进度条） |
| `js/ui.js` `applyFilters()`（内联 `display:none`） | `StoryFeed.vue` 给段落加 `.is-hidden` 类 + `useStoryState.isSegmentVisible()` |
| `js/ui.js` `getScrollProgress()` / `updateProgress()` | `App.vue` `handleScroll` → `setScrollProgress()` → `ProgressBar.vue` 的 computed 宽度 |
| `js/ui.js` `setupIntersectionObserver()`（旧版同时加 `.visible` 入场动画类） | `StoryFeed.vue` 的 IntersectionObserver（只记录 `activeSegmentId`）；入场动画 `fade-in-up` 已直接写在 `.segment` 的默认动画里，不再依赖 `.visible` |
| `js/scene.js` 的 `MarsScene` 类（无 `dispose`） | `src/scene/MarsScene.js`（新增 `dispose()` 资源释放）+ `src/composables/useMarsScene.js`（Vue 生命周期封装） |
| `js/novel-data.js`（68 个 segment） | `src/data/novel-data.js`（原样迁移） |
| 根目录旧 `index.html` 静态骨架 + `css/styles.css` | `index.html`（仅 `#app` 挂载点）+ `src/assets/styles/*.css` |
| `lib/three.module.min.js` 本地文件 | npm 依赖 `three@0.163.0`，通过 `import * as THREE from 'three'` 使用 |
