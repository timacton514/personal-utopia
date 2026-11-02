<script setup>
import { computed } from 'vue'
import {
  ATMOSPHERE_MAX,
  cycleAtmosphere,
  storyState,
  toggleSideA,
  toggleSideB,
} from '../composables/useStoryState.js'

/** 大气按钮上的小圆点数量 = 当前浓度档位 */
const atmosphereDots = computed(() => '·'.repeat(storyState.atmosphereLevel))
</script>

<template>
  <div id="controls">
    <button
      id="btn-side-a"
      type="button"
      class="ctrl-btn"
      :class="{ active: storyState.showSideA }"
      title="显示A面"
      @click="toggleSideA"
    >
      A
    </button>

    <button
      id="btn-side-b"
      type="button"
      class="ctrl-btn"
      :class="{ active: storyState.showSideB }"
      title="显示B面"
      @click="toggleSideB"
    >
      B
    </button>

    <button
      id="btn-atmosphere"
      type="button"
      class="ctrl-btn atm-btn"
      :data-level="storyState.atmosphereLevel"
      :title="`大气浓度 ${storyState.atmosphereLevel} / ${ATMOSPHERE_MAX}`"
      @click="cycleAtmosphere"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="4" r="2.5" stroke="currentColor" stroke-width="1.2" opacity="0.55" />
        <circle cx="9" cy="11" r="3.5" stroke="currentColor" stroke-width="1.2" opacity="0.75" />
        <circle cx="9" cy="14.5" r="2" stroke="currentColor" stroke-width="1.2" opacity="0.9" />
      </svg>
      <span class="atm-dots">{{ atmosphereDots }}</span>
    </button>
  </div>
</template>
