<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const emit = defineEmits(['done'])

/** 是否已开始淡出（与旧版一致：600ms 后淡出，800ms 后移除） */
const hidden = ref(false)

let hideTimer = 0
let removeTimer = 0

onMounted(() => {
  hideTimer = window.setTimeout(() => {
    hidden.value = true
  }, 600)
  removeTimer = window.setTimeout(() => {
    emit('done')
  }, 1400)
})

onBeforeUnmount(() => {
  window.clearTimeout(hideTimer)
  window.clearTimeout(removeTimer)
})
</script>

<template>
  <div id="loading" :class="{ hidden }">
    <div class="loading-cube"></div>
    <p>正在进入乌托邦...</p>
  </div>
</template>
