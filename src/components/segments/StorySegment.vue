<script setup>
import { computed } from 'vue'
import ChapterHeaderSegment from './ChapterHeaderSegment.vue'
import PoemSegment from './PoemSegment.vue'
import EntrySegment from './EntrySegment.vue'
import PaperSegment from './PaperSegment.vue'
import SystemSegment from './SystemSegment.vue'
import SearchSegment from './SearchSegment.vue'
import DividerSegment from './DividerSegment.vue'
import EndingSegment from './EndingSegment.vue'
import DefaultSegment from './DefaultSegment.vue'

/**
 * 段落分发器：按 segment.type 渲染对应的段落组件。
 * 新增一种段落类型时，只需要写一个组件并登记到下面的映射表。
 */
const SEGMENT_COMPONENTS = {
  'chapter-header': ChapterHeaderSegment,
  poem: PoemSegment,
  entry: EntrySegment,
  paper: PaperSegment,
  system: SystemSegment,
  search: SearchSegment,
  divider: DividerSegment,
  ending: EndingSegment,
}

const props = defineProps({
  segment: { type: Object, required: true },
  index: { type: Number, required: true },
})

const component = computed(() => SEGMENT_COMPONENTS[props.segment.type] ?? DefaultSegment)

/** 兼容没有 id 的段落，保证目录/锚点仍然可用 */
const elementId = computed(() => props.segment.id || `seg-${props.index}`)
</script>

<template>
  <component :is="component" :segment="segment" :index="index" :element-id="elementId" />
</template>
