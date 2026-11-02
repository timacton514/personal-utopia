<script setup>
import { scrollToId } from '../../utils/scroll.js'

defineProps({
  segment: { type: Object, required: true },
  elementId: { type: String, required: true },
})

/** 握手符号：点击回到 B 面开头（序 零之下） */
function handleRestart() {
  scrollToId('preface')
}
</script>

<template>
  <div :id="elementId" class="segment ending-panel">
    <template v-for="(line, index) in segment.content" :key="index">
      <p
        v-if="line.style === 'end-symbol'"
        id="restart-btn"
        class="end-symbol"
        title="握手，回到起点"
        @click="handleRestart"
      >
        {{ line.text }}
      </p>
      <p v-else-if="line.style === 'end-text'" class="end-text">{{ line.text }}</p>
      <p v-else-if="line.style === 'end-hint'" class="restart-hint">{{ line.text }}</p>
      <p v-else>{{ line.text }}</p>
    </template>
  </div>
</template>
