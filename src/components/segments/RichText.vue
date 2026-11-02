<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  /** 可能包含 ~~删除线~~ 标记的文本 */
  text: { type: String, default: '' },
})

/** 解析 ~~删除线~~，避免 v-html，保持与旧版相同的 inline span 结构 */
const parts = computed(() => {
  const result = []
  const pattern = /~~(.+?)~~/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(props.text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ text: props.text.slice(lastIndex, match.index), strikethrough: false })
    }
    result.push({ text: match[1], strikethrough: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < props.text.length) {
    result.push({ text: props.text.slice(lastIndex), strikethrough: false })
  }
  return result
})

/** 每个删除线片段独立记录“已恢复”状态 */
const restoredFlags = ref([])

function toggle(index) {
  restoredFlags.value[index] = !restoredFlags.value[index]
}
</script>

<template>
  <template v-for="(part, index) in parts" :key="index">
    <span
      v-if="part.strikethrough"
      class="line strikethrough"
      :class="{ restored: restoredFlags[index] }"
      @click="toggle(index)"
    >{{ part.text }}</span>
    <template v-else>{{ part.text }}</template>
  </template>
</template>
