<script setup>
defineProps({
  segment: { type: Object, required: true },
  elementId: { type: String, required: true },
})
</script>

<template>
  <div :id="elementId" class="segment divider"></div>
</template>
