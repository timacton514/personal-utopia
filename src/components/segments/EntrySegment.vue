<script setup>
import { computed } from 'vue'
import MetaHeader from './MetaHeader.vue'
import StoryLine from './StoryLine.vue'

const props = defineProps({
  segment: { type: Object, required: true },
  elementId: { type: String, required: true },
})

/** 角色符号 → CSS 类名（与旧版保持一致） */
const CHAR_CLASS_MAP = {
  θ: 'theta',
  τ: 'tau',
  'τ†': 'tau-dagger',
}

const charClass = computed(() => CHAR_CLASS_MAP[props.segment.character] || '')
const secondCharClass = computed(() =>
  props.segment.metaSecond ? CHAR_CLASS_MAP[props.segment.metaSecond.character] || '' : '',
)

/** 面板配色：优先用数据里显式指定的 panelClass（例如合并面板 merged） */
const rootClasses = computed(() => [
  'segment',
  props.segment.panelClass || charClass.value,
  { deleted: props.segment.isDeleted },
])

const hasMeta = computed(
  () =>
    Boolean(
      props.segment.character ||
        props.segment.visibility ||
        props.segment.coordinates ||
        props.segment.timestamp,
    ),
)

/** foldAfter：前 N 行直接显示，其余收进一个无边框的 <details> 里 */
const useInlineFold = computed(
  () =>
    props.segment.foldAfter != null &&
    props.segment.content.length > props.segment.foldAfter,
)
const visibleLines = computed(() =>
  useInlineFold.value
    ? props.segment.content.slice(0, props.segment.foldAfter)
    : props.segment.content,
)
const foldedLines = computed(() =>
  useInlineFold.value ? props.segment.content.slice(props.segment.foldAfter) : [],
)

/** collapsible：整段内容收进 <details>（需数据显式设置） */
const useCollapsible = computed(() => !useInlineFold.value && Boolean(props.segment.collapsible))
</script>

<template>
  <div :id="elementId" :class="rootClasses">
    <template v-if="hasMeta">
      <MetaHeader :meta="segment" :char-class="charClass" />
      <MetaHeader
        v-if="segment.metaSecond"
        :meta="segment.metaSecond"
        :char-class="secondCharClass"
        second
      />
    </template>

    <!-- 局部折叠：前 N 行常显，其余点击展开 -->
    <template v-if="useInlineFold">
      <StoryLine v-for="(line, index) in visibleLines" :key="`v-${index}`" :line="line" />
      <details class="inline-fold">
        <summary>{{ segment.summary || '展开' }}</summary>
        <StoryLine v-for="(line, index) in foldedLines" :key="`f-${index}`" :line="line" />
      </details>
    </template>

    <!-- 整段折叠 -->
    <template v-else-if="useCollapsible">
      <details :open="Boolean(segment.defaultOpen)">
        <summary>{{ segment.summary || '展开' }}</summary>
        <StoryLine v-for="(line, index) in segment.content" :key="index" :line="line" />
      </details>
    </template>

    <!-- 普通内容 -->
    <template v-else>
      <StoryLine v-for="(line, index) in segment.content" :key="index" :line="line" />
    </template>
  </div>
</template>
