import { computed } from 'vue'
import { NOVEL_SEGMENTS } from '../data/novel-data.js'
import { closeNav, storyState } from './useStoryState.js'
import { scrollToId } from '../utils/scroll.js'

/** segment.id → 在整篇故事中的下标，用于目录高亮和章节跳转 */
const SEGMENT_INDEX = new Map(NOVEL_SEGMENTS.map((segment, index) => [segment.id, index]))

/** 所有作为章节标题的段落（type 为 chapter-header 才会进入目录） */
export const CHAPTER_SEGMENTS = NOVEL_SEGMENTS.filter(
  (segment) => segment.type === 'chapter-header',
)

/**
 * 章节目录数据：封面 + 所有章节标题 + 故事结束。
 * 新增章节只需在 novel-data.js 里加一个 chapter-header 段落，目录会自动更新。
 */
export const navItems = [
  { id: 'title-screen', title: '封面', index: -1 },
  ...CHAPTER_SEGMENTS.map((segment) => ({
    id: segment.id,
    title: segment.title,
    index: SEGMENT_INDEX.get(segment.id),
  })),
  { id: 'story-end', title: '故事结束', index: NOVEL_SEGMENTS.length },
]

/** 点击目录项：先收起面板，再平滑滚动到目标段落 */
export function goToNavItem(id) {
  closeNav()
  scrollToId(id)
}

/** 根据当前进入视口的段落，计算目录里应高亮的章节 */
export const activeNavId = computed(() => {
  const currentId = storyState.activeSegmentId
  if (!currentId) return 'title-screen'

  const currentIndex = SEGMENT_INDEX.get(currentId)
  if (currentIndex === undefined) return 'title-screen'

  // 取“最后一个不超过当前段落”的章节作为当前章节
  let active = navItems[0]
  for (const item of navItems) {
    if (item.index >= 0 && item.index <= currentIndex) active = item
  }
  return active.id
})

/** 键盘 [ / ] 键：跳到上一章 / 下一章 */
export function navigateChapter(direction) {
  const scrollCenter = window.scrollY + window.innerHeight / 2
  let currentIndex = -1

  CHAPTER_SEGMENTS.forEach((segment, index) => {
    const el = document.getElementById(segment.id)
    if (!el) return
    const absoluteTop = el.getBoundingClientRect().top + window.scrollY
    if (absoluteTop <= scrollCenter) currentIndex = index
  })

  const nextIndex = Math.max(0, Math.min(CHAPTER_SEGMENTS.length - 1, currentIndex + direction))
  const target = CHAPTER_SEGMENTS[nextIndex]
  if (target) scrollToId(target.id)
}
