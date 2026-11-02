<script setup>
import StoryLine from './StoryLine.vue'

defineProps({
  segment: { type: Object, required: true },
  elementId: { type: String, required: true },
})
</script>

<template>
  <div :id="elementId" class="segment">
    <StoryLine v-for="(line, index) in segment.content" :key="index" :line="line" />
  </div>
</template>
