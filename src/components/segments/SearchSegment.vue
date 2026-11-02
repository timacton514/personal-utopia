<script setup>
import StoryLine from './StoryLine.vue'

defineProps({
  segment: { type: Object, required: true },
  elementId: { type: String, required: true },
})
</script>

<template>
  <div :id="elementId" class="segment system-msg">
    <p class="search-query">{{ segment.query }}</p>
    <StoryLine
      v-for="(line, index) in segment.content"
      :key="index"
      :line="line"
      extra-class="system-line"
    />
  </div>
</template>
