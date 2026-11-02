<script setup>
import { ref } from 'vue'
import StoryLine from './StoryLine.vue'

defineProps({
  segment: { type: Object, required: true },
  elementId: { type: String, required: true },
})

/** 点击纸张段落切换展开状态（旧版行为：切换 paper-expanded 类，样式后续可扩展） */
const expanded = ref(false)
</script>

<template>
  <div
    :id="elementId"
    class="segment paper"
    :class="{ 'paper-expanded': expanded }"
    title="点击查看"
    @click="expanded = !expanded"
  >
    <StoryLine v-for="(line, index) in segment.content" :key="index" :line="line" />
  </div>
</template>
