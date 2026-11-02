<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { activeNavId, goToNavItem, navItems } from '../composables/useChapterNavigation.js'
import { closeNav, storyState, toggleNav } from '../composables/useStoryState.js'

const navPanel = ref(null)
const navToggle = ref(null)

/** 点击面板/按钮之外的地方时收起目录（与旧版交互一致） */
function handleDocumentClick(event) {
  if (!storyState.navOpen) return
  if (navPanel.value?.contains(event.target)) return
  if (navToggle.value?.contains(event.target)) return
  closeNav()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <nav id="chapter-nav">
    <button
      id="nav-toggle"
      ref="navToggle"
      type="button"
      title="章节目录"
      @click.stop="toggleNav"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    </button>

    <div id="nav-panel" ref="navPanel" :class="{ hidden: !storyState.navOpen }">
      <h3>目录</h3>
      <ul id="nav-list">
        <li
          v-for="item in navItems"
          :key="item.id"
          :class="{ active: item.id === activeNavId }"
          @click="goToNavItem(item.id)"
        >
          {{ item.title }}
        </li>
      </ul>
    </div>
  </nav>
</template>
