<script setup>
defineProps({
  segment: { type: Object, required: true },
  elementId: { type: String, required: true },
})
</script>

<template>
  <div :id="elementId" class="segment chapter-header">
    <span v-if="segment.chapterNum" class="chapter-num">{{ segment.chapterNum }}</span>
    <h2>{{ segment.title }}</h2>
  </div>
</template>
