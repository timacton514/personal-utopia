<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  line: { type: Object, required: true },
  /** 额外类名，例如系统消息行的 system-line */
  extraClass: { type: String, default: '' },
})

/** 被消抹的文本：点击可从删除线状态“恢复”为正常文本（与旧版交互一致） */
const restored = ref(false)
const isStrikethrough = computed(() => props.line.style === 'strikethrough')

const classes = computed(() => [
  'line',
  props.line.style || '',
  props.extraClass,
  { restored: isStrikethrough.value && restored.value },
])
</script>

<template>
  <!-- 历史数据支持 html 字段：保留旧版行为，否则一律按纯文本渲染 -->
  <p v-if="line.html" :class="classes" v-html="line.html"></p>
  <p v-else-if="isStrikethrough" :class="classes" @click="restored = !restored">
    {{ line.text }}
  </p>
  <p v-else :class="classes">{{ line.text }}</p>
</template>
