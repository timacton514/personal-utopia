<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import LoadingScreen from './components/LoadingScreen.vue'
import MarsCanvas from './components/MarsCanvas.vue'
import TitleScreen from './components/TitleScreen.vue'
import StoryFeed from './components/StoryFeed.vue'
import ChapterNav from './components/ChapterNav.vue'
import ControlBar from './components/ControlBar.vue'
import ProgressBar from './components/ProgressBar.vue'
import {
  atmosphereFactor,
  closeNav,
  setScrollProgress,
  toggleSideA,
  toggleSideB,
} from './composables/useStoryState.js'
import { navigateChapter } from './composables/useChapterNavigation.js'
import { scrollToId } from './utils/scroll.js'

/** 加载遮罩：LoadingScreen 完成淡出后置为 false 并卸载 */
const showLoading = ref(true)

/** 大气浓度 → 暗角渐变（与旧版 UI 的计算公式保持一致） */
const vignetteStyle = computed(() => {
  const a = atmosphereFactor()
  return {
    background: `radial-gradient(ellipse at center, transparent ${70 - a * 30}%, rgba(5,2,0, ${0.35 + a * 0.6}) 100%)`,
  }
})

/** 大气浓度 → 底部雾气渐变 */
const hazeStyle = computed(() => {
  const a = atmosphereFactor()
  return {
    background: `linear-gradient(to top, rgba(20,8,2, ${0.5 + a * 0.45}), transparent)`,
  }
})

function getScrollProgress() {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight
  if (scrollableHeight <= 0) return 0
  return Math.min(1, Math.max(0, window.scrollY / scrollableHeight))
}

function handleScroll() {
  setScrollProgress(getScrollProgress())
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeNav()
    return
  }

  // [ / ] 切换章节
  if (event.key === '[' || event.key === ']') {
    event.preventDefault()
    navigateChapter(event.key === '[' ? -1 : 1)
    return
  }

  if (event.ctrlKey || event.metaKey || event.altKey) return

  // a / b 切换 A 面、B 面
  if (event.key === 'a') toggleSideA()
  if (event.key === 'b') toggleSideB()
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('keydown', handleKeydown)
  handleScroll()

  // 支持带 #段落id 的链接直接定位（与旧版一致：等首屏稳定后再滚动）
  if (window.location.hash) {
    const targetId = decodeURIComponent(window.location.hash.slice(1))
    window.setTimeout(() => scrollToId(targetId), 800)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <LoadingScreen v-if="showLoading" @done="showLoading = false" />
  <MarsCanvas />
  <div id="vignette" :style="vignetteStyle"></div>
  <div id="haze-bottom" :style="hazeStyle"></div>

  <main id="text-overlay">
    <TitleScreen />
    <StoryFeed />
  </main>

  <ChapterNav />
  <ControlBar />
  <ProgressBar />
</template>
