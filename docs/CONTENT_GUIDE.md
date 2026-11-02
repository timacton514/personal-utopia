# 内容编辑指南

本文说明如何修改小说内容：数据在哪里、每个字段什么意思、怎么加一章、怎么用折叠与删除线。

- 小说数据文件：`src/data/novel-data.js`
- 导出形式：`export const NOVEL_SEGMENTS = [ ... ]`，一个数组，共 **68 个段落（segment）**
- **数组顺序就是阅读顺序**，渲染、目录、章节跳转、3D 进度全部按这个顺序计算
- 改完数据后跑 `npm run dev`（http://localhost:5173/）逐段检查；字段写错通常表现为段落空白或样式丢失，浏览器控制台会有 Vue 警告

## segment 字段总表

| 字段 | 类型 | 是否必填 | 含义与用法 |
| --- | --- | --- | --- |
| `id` | String | 必填 | 段落唯一标识。同时是 DOM id、`#id` 锚点、目录跳转目标、IntersectionObserver 的观察依据；**不可重复**，建议语义化命名（如 `b-02-11`） |
| `side` | `'A'` \| `'B'` \| `'meta'` | 必填 | 所属面：`A` 受「A」按钮控制，`B` 受「B」按钮控制，`meta`（导读等）不受筛选影响、始终显示。当前数据分布：A 8 段、B 58 段、meta 2 段 |
| `type` | String | 必填 | 段落类型，决定用哪个 Vue 组件渲染，见下表 |
| `character` | String \| null | entry 可选 | 角色符号：`θ`（18 段）、`τ†`（13 段）、`τ`（5 段）、`θ&τ†`（1 段）。前三种会映射到面板配色类 `theta` / `tau` / `tau-dagger`；`θ&τ†` 没有配色映射，回退为默认面板（需要特殊配色时用 `panelClass`） |
| `visibility` | String \| null | entry 可选 | 能见度，渲染时自动加「能见度 」前缀。如 `"全"`、`"低"`、`"油膜物质<10^-10sr"`；支持 `~~删除线~~` 标记 |
| `coordinates` | String \| null | entry 可选 | 坐标。如 `"15.56178° N 230.20207° E"`、`"任何一处"`；支持 `~~删除线~~` |
| `timestamp` | String \| null | entry 可选 | 时间刻。如 `"基准时间刻 0"`、`"基准时间刻 ？"`；支持 `~~删除线~~` |
| `isDeleted` | Boolean | entry 可选 | 默认 `false`。为 `true` 时整个面板降透明度、所有正文行显示删除线（当前唯一示例：`b-02-11`） |
| `foldAfter` | Number | entry 可选 | 局部折叠：前 N 行直接显示，其余收进无边框的 `<details>`（当前示例：`guide-text`，`foldAfter: 2`） |
| `summary` | String | 可选 | 折叠摘要文字（`<summary>` 内容），缺省显示「展开」；配合 `foldAfter` 或 `collapsible` 使用 |
| `collapsible` | Boolean | entry 可选 | 整段折叠：全部内容收进带边框的 `<details>`。**组件支持，但当前数据未使用**；同时有 `foldAfter` 时以 `foldAfter` 优先 |
| `defaultOpen` | Boolean | entry 可选 | 配合 `collapsible`，`true` 时折叠面板默认展开。**当前数据未使用** |
| `panelClass` | String | entry 可选 | 强制指定面板类名，覆盖角色配色。当前唯一示例：`b-05-09` 的 `"merged"`（θ/τ† 合流面板：绿色到橙色渐变） |
| `metaSecond` | Object | entry 可选 | 合并面板的第二行元数据，形状同为 `{ character, visibility, coordinates, timestamp }`。**组件支持，但当前数据未使用** |
| `poemTitle` | String | poem 可选 | 诗的标题行，如 `"pt.1 私人的"` |
| `query` | String | search 必填 | 搜索段落的查询语，如 `"🔎关于 太阳 火星 到来 的日志 ："` |
| `title` | String | chapter-header 必填 | 章节标题，同时是目录里的文字 |
| `chapterNum` | String \| null | chapter-header 可选 | 章节编号（`"序"`、`"一"`… `"末"`），为 `null` 时不渲染编号（导读、A/B 面大标题） |
| `content` | Array | 必填（divider 可为空数组） | 正文行数组：`[{ text, style?, html? }]`。`chapter-header` / `divider` 通常为 `[]` |

`content` 里每一行的字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `text` | String | 行文本。绝大多数内容都是纯文本 |
| `style` | String | 行样式类名，取值见下一节。**poem 段落可以省略**（诗行统一渲染为 `.line`，当前 35 行诗行均无 style） |
| `html` | String | 若存在则用 `v-html` 渲染（兼容旧数据）。**当前数据未使用**，非必要不要用；确需使用时只放可信内容（静态文案），不要把外部输入渲染进去 |

## line.style 全部取值

样式定义在 `src/assets/styles/segments.css`（结尾三段在 `story-end.css`）。数据中出现次数供参考：

| style | 次数 | CSS 行为 | 用途 |
| --- | --- | --- | --- |
| `body` | 363 | 普通行，1.85 行高 | 默认正文 |
| `system-line` | 53 | 等宽字体、系统消息色、左缩进 8px | 终端/系统消息行；`system` 与 `search` 段落组件还会额外给行加 `.system-line` 类 |
| `blockquote` | 8 | 左侧竖线 + 斜体 + 暗色 | 引用他人/终端里的话 |
| `gloss` | 2 | 小字、暗色、左侧细线、缩小间距 | 名词注释（如「米氏散射：…」） |
| `bold` | 9 | 加粗 | 标签式行（如「纸页：」） |
| `italic` | 1 | 斜体 | 内心独白/另一个声音 |
| `strikethrough` | 2 | 删除线 + 点击可「恢复」为正常文本 | 被消抹但可点击还原的文本 |
| `deleted-marker` | 1 | 删除线，**不可恢复** | 已删除/无权限的占位文本（如 `b-02-11` 的「已激活，无查看权限」） |
| `divider` | 1 | 行内分隔线（居中 ◆） | 段落内部的分节；与 `type: "divider"` 的独立分隔段落不同 |
| `sub-meta-char` | 1 | 等宽、加粗、θ 配色 | 合并面板里第二段元数据的角色符号 |
| `sub-meta` | 1 | 更小的等宽暗色字 | 合并面板里第二段元数据的正文 |
| `end-symbol` | 1 | 大号握手符号按钮，悬停发光 | 仅 `type: "ending"` 使用；点击回到 `id="preface"`（序 零之下） |
| `end-text` | 1 | 小字暗色「— 故事已结束 —」 | 仅 ending |
| `end-hint` | 1 | 更小的提示「点击握手，回到起点」 | 仅 ending |
| （省略） | 35 | 普通 `.line` | 诗行（poem 段落） |

> 行样式只影响外观，不改变数据顺序或可见性；新增样式时先在 CSS 里补类，再在数据里引用，否则该行会退化为普通正文。

## 段落类型与必填字段

| `type` | 渲染组件 | 必填 / 常用字段 | 当前数量 |
| --- | --- | --- | --- |
| `chapter-header` | `ChapterHeaderSegment.vue` | `title`、`chapterNum` | 10（导读、A/B 面标题、序、一~五、末） |
| `entry` | `EntrySegment.vue` | `content`，可选元数据/折叠/删除字段 | 42 |
| `poem` | `PoemSegment.vue` | `poemTitle`、`content` | 5（A 面 pt.1 ~ pt.5） |
| `paper` | `PaperSegment.vue` | `content` | 5 |
| `system` | `SystemSegment.vue` | `content` | 1 |
| `search` | `SearchSegment.vue` | `query`、`content` | 2 |
| `divider` | `DividerSegment.vue` | 无 | 2 |
| `ending` | `EndingSegment.vue` | `content`（用 end-* 样式） | 1（`story-end`） |

## 折叠、删除线与「被消抹」文本

### 局部折叠：`foldAfter` + `summary`

前 `foldAfter` 行常显，剩余行收进 `<details class="inline-fold">`（无边框，视觉上像连续正文）：

```js
{
  id: 'guide-text',
  side: 'meta',
  type: 'entry',
  foldAfter: 2,          // 前 2 行常显
  summary: '展开',        // 折叠按钮文字，可省略（默认「展开」）
  content: [ /* ... */ ],
}
```

### 整段折叠：`collapsible` + `defaultOpen` + `summary`

整个 `content` 收进带边框的 `<details>`；`defaultOpen: true` 时默认展开。`foldAfter` 与 `collapsible` 同时存在时**只生效 `foldAfter`**。当前数据未使用这两种写法，属于组件保留能力。

### 整段删除状态：`isDeleted`

```js
{
  id: 'b-02-11',
  side: 'B',
  type: 'entry',
  character: 'θ',
  visibility: '低',
  coordinates: '15.5612° N 230.2047° E',
  timestamp: '基准时间刻 ℵ',
  isDeleted: true,       // 面板降透明度 + 所有行显示删除线
  content: [ /* ... */ ],
}
```

### 单行删除线

两种写法，交互不同：

| 写法 | 效果 | 点击行为 |
| --- | --- | --- |
| `{ "text": "…", "style": "strikethrough" }` | 删除线、暗色，鼠标悬停变亮 | 点击切换「恢复」状态，删除线消失、恢复为正常文本（示例：`b-03-10`） |
| `{ "text": "…", "style": "deleted-marker" }` | 删除线、暗色 | 不可恢复（示例：`"已激活，无查看权限"`） |

### meta 字段里的 `~~删除线~~`

`visibility`、`coordinates`、`timestamp`、`metaSecond.*` 这些元数据不会走 `line.style`，其中的 `~~…~~` 由 `RichText.vue` 解析成可点击恢复的删除线片段（不改数据，纯前端状态）。当前数据里的实际写法：

```js
// b-02-07
"coordinates": "~~18.6501° N 226.2001° E~~",
"timestamp": "~~基准时间刻 'jd~~ ~~2467338.70 *TDB'~~",

// b-04-01
"timestamp": "基准时间刻 sol ~~667.26~~ 668.6",
```

注意：

- `~~` 需成对出现，正则按非贪婪匹配 `~~(.+?)~~`；未闭合的 `~~` 会按普通文本显示；
- 一段 meta 文本里可以有多个 `~~…~~` 片段，每个片段可独立点击恢复；
- 如需字面显示 `~~`，目前没有转义机制，建议改写措辞。

## 新增一章

### 步骤

1. 在 `src/data/novel-data.js` 数组中找到希望插入的位置（比如 `ch6` 之前 / 之后），插入章节标题段落：
2. 其后按顺序插入本章的正文段落（`entry` 为主，可混用 `paper` / `system` / `search` / `poem` / `divider`）；
3. 运行 `npm run dev`，检查目录是否出现新章节、点击是否能跳转、A/B 筛选是否正常；
4. 若新章节使全文篇幅明显变化，检查 3D 镜头与新章节的对应关系（见下文注意事项）。

### 示例片段

```js
// 章节标题：只有 chapter-header 会进入目录
{
  id: 'ch-06-new',
  side: 'B',
  type: 'chapter-header',
  title: '六 新的章节',
  chapterNum: '六',        // 可写 '六'、'6' 或 null（不显示编号）
  content: [],
},
// 正文：一段记录体
{
  id: 'b-06-01-new',
  side: 'B',
  type: 'entry',
  character: 'θ',
  visibility: '低',
  coordinates: '15.56192° N 230.2046° E',
  timestamp: '基准时间刻 sol 670',
  isDeleted: false,
  content: [
    { text: '第一行正文。', style: 'body' },
    { text: '', style: 'body' },                   // 空行也用 body，保证行距
    { text: '被消抹的一句。', style: 'strikethrough' },
  ],
},
// 可选：一个独立的纸页段落
{
  id: 'b-06-paper-new',
  side: 'B',
  type: 'paper',
  character: null,
  content: [
    { text: '纸页：', style: 'bold' },
    { text: '这张纸上的文字……', style: 'body' },
  ],
},
```

### 注意事项

- **顺序即阅读顺序**：数组插入位置决定段落、目录、章节跳转和 3D 进度的全部顺序；不要按 id 排序。
- **id 必须唯一**：它是 DOM id 和锚点，重复会导致目录跳转、`activeSegmentId` 高亮、`#id` 链接错乱。命名建议沿用现有前缀：`b-章-序号`。
- **章节必须用 `type: 'chapter-header'`** 才会出现在目录里；`useChapterNavigation.js` 只过滤这个类型。
- **`side` 决定筛选归属**：新内容属于 A 面诗体就写 `A`，记录体写 `B`；`meta` 只用于导读类不参与筛选的内容。
- **空行也要写**：正文空行用 `{ text: '', style: 'body' }`，不要省略，否则段落间距会变。
- **章节编号与标题分开**：`chapterNum` 是标题上方的小字编号（可为 `null`），`title` 是目录里的完整标题。
- **3D 进度是按全文百分比硬编码的**：新章节会改变后续章节的进度占比，若新增内容较多，需按新的章节位置微调 `src/scene/MarsScene.js#setFromProgress()` 的进度分区（详见 [ARCHITECTURE.md](ARCHITECTURE.md) 的「调整镜头参数」）。
- **结尾段落要保持存在**：`type: 'ending'` 的段落（当前 `id: 'story-end'`）为目录「故事结束」和握手回到起点提供锚点；其 `end-symbol` 行点击后跳到 `id="preface"`，因此 `preface` 段落也不能删。
- **不要直接改 `src/data/novel-data.js` 的导出名**：`NOVEL_SEGMENTS` 被 `StoryFeed.vue`、`useChapterNavigation.js` 共同引用。

## 改完后的自检

1. `npm run dev` 打开 http://localhost:5173/，从头滚到尾，确认没有空白段落/缺样式行；
2. 打开右上角目录，确认章节数量、顺序、跳转正确；
3. 点一遍 A、B 筛选按钮，确认新段落的显示/隐藏符合预期；
4. 检查浏览器控制台是否有 Vue/JS 警告；
5. 如新增了 `style` 或 `type`，对应 CSS 类/组件必须存在，否则会静默回退为默认样式/`DefaultSegment`。
