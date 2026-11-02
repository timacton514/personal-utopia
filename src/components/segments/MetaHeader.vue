<script setup>
import RichText from './RichText.vue'

defineProps({
  /** 元数据对象：首次渲染传 segment 本身，第二行传 segment.metaSecond */
  meta: { type: Object, required: true },
  /** 角色对应的 CSS 类后缀：theta / tau / tau-dagger */
  charClass: { type: String, default: '' },
  /** 是否为合并面板的第二行元数据 */
  second: { type: Boolean, default: false },
})
</script>

<template>
  <div class="meta-header" :class="{ 'meta-second': second }">
    <span v-if="meta.character" class="meta-char" :class="`char-${charClass}`">
      {{ meta.character }}
    </span>
    <span v-if="meta.visibility">能见度 <RichText :text="meta.visibility" /></span>
    <span v-if="meta.coordinates"><RichText :text="meta.coordinates" /></span>
    <span v-if="meta.timestamp"><RichText :text="meta.timestamp" /></span>
  </div>
</template>
