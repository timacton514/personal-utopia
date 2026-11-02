import { reactive } from 'vue'

export const ATMOSPHERE_MAX = 5

/**
 * 全局故事状态（单例）。
 *
 * 所有跨组件共享的交互状态集中在这里：
 * - 组件只读取 storyState，不直接改字段；
 * - 修改统一通过本文件导出的 action 函数，方便追踪谁在改状态。
 */
export const storyState = reactive({
  /** 0 ~ 1，整篇故事的滚动进度，驱动 3D 镜头与底部进度条 */
  scrollProgress: 0,
  /** 大气浓度 1 ~ 5，影响暗角、底部雾气与 3D 场景曝光/尘埃 */
  atmosphereLevel: 3,
  /** A 面（诗）是否显示 */
  showSideA: true,
  /** B 面（记录）是否显示 */
  showSideB: true,
  /** 章节目录面板是否展开 */
  navOpen: false,
  /** 加载遮罩是否仍显示 */
  loading: true,
  /** 当前进入视口的段落 id，用于高亮目录中的章节 */
  activeSegmentId: null,
})

/**
 * 按 segment.side 判断段落是否可见。
 * meta（导读、阅读提示）段落不受 A/B 筛选影响，始终显示。
 */
export function isSegmentVisible(segment) {
  if (segment.side === 'A') return storyState.showSideA
  if (segment.side === 'B') return storyState.showSideB
  return true
}

export function toggleSideA() {
  storyState.showSideA = !storyState.showSideA
}

export function toggleSideB() {
  storyState.showSideB = !storyState.showSideB
}

/** 大气浓度循环切换：1 → 2 → 3 → 4 → 5 → 1 */
export function cycleAtmosphere() {
  storyState.atmosphereLevel = (storyState.atmosphereLevel % ATMOSPHERE_MAX) + 1
}

export function setAtmosphereLevel(level) {
  storyState.atmosphereLevel = Math.min(ATMOSPHERE_MAX, Math.max(1, level))
}

/**
 * 大气浓度 1~5 映射为 0~1 的辅助系数，
 * 供暗角/雾气渐变以及 3D 场景的亮度插值使用。
 */
export function atmosphereFactor(level = storyState.atmosphereLevel) {
  return (level - 1) / (ATMOSPHERE_MAX - 1)
}

export function toggleNav() {
  storyState.navOpen = !storyState.navOpen
}

export function closeNav() {
  storyState.navOpen = false
}

export function setScrollProgress(progress) {
  storyState.scrollProgress = progress
}

export function setActiveSegment(segmentId) {
  storyState.activeSegmentId = segmentId
}
