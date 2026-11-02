<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { NOVEL_SEGMENTS } from '../data/novel-data.js'
import { isSegmentVisible, setActiveSegment } from '../composables/useStoryState.js'
import StorySegment from './segments/StorySegment.vue'

const containerRef = ref(null)
let observer = null

/**
 * 用 IntersectionObserver 记录当前进入视口的段落，
 * 目录高亮与章节跳转都依赖这个 activeSegmentId。
 */
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSegment(entry.target.id)
      })
    },
    { threshold: 0.2 },
  )

  const segmentElements = containerRef.value?.querySelectorAll('.segment') ?? []
  segmentElements.forEach((el) => observer.observe(el))
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

/** A/B 面筛选：命中的段落通过 is-hidden 类隐藏（保持 DOM 与滚动锚点不重建） */
function isVisible(segment) {
  return isSegmentVisible(segment)
}
</script>

<template>
  <div id="segments-container" ref="containerRef">
    <StorySegment
      v-for="(segment, index) in NOVEL_SEGMENTS"
      :key="segment.id"
      :segment="segment"
      :index="index"
      :class="{ 'is-hidden': !isVisible(segment) }"
    />
  </div>
</template>
