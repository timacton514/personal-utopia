<script setup>
defineProps({
  segment: { type: Object, required: true },
  elementId: { type: String, required: true },
})
</script>

<template>
  <div :id="elementId" class="segment poem">
    <div v-if="segment.poemTitle" class="poem-title">{{ segment.poemTitle }}</div>
    <p v-for="(line, index) in segment.content" :key="index" class="line">{{ line.text }}</p>
  </div>
</template>
