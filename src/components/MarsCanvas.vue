<script setup>
import { ref } from 'vue'
import { useMarsScene } from '../composables/useMarsScene.js'

const canvasRef = ref(null)

// 场景的创建、渲染循环、滚动/大气订阅和销毁都封装在这个组合式函数里
useMarsScene(canvasRef)
</script>

<template>
  <canvas id="mars-scene" ref="canvasRef"></canvas>
</template>
