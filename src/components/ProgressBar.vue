<script setup>
import { computed } from 'vue'
import { storyState } from '../composables/useStoryState.js'

const fillStyle = computed(() => ({ width: `${storyState.scrollProgress * 100}%` }))
</script>

<template>
  <div id="progress-bar">
    <div id="progress-fill" :style="fillStyle"></div>
  </div>
</template>
