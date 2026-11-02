import { onBeforeUnmount, onMounted, watch } from 'vue'
import { MarsScene } from '../scene/MarsScene.js'
import { storyState } from './useStoryState.js'

/**
 * 把 Three.js 火星场景接入 Vue 生命周期：
 * - 挂载时创建场景、启动渲染循环；
 * - 订阅滚动进度与大气浓度；
 * - 卸载时停止循环并释放 WebGL 资源（开发期热更新也不会泄漏）。
 *
 * @param {import('vue').Ref<HTMLCanvasElement | null>} canvasRef 画布元素的 ref
 */
export function useMarsScene(canvasRef) {
  let scene = null
  let frameId = 0

  const renderFrame = () => {
    scene?.render()
    frameId = window.requestAnimationFrame(renderFrame)
  }

  onMounted(() => {
    const canvas = canvasRef.value
    if (!canvas) return

    scene = new MarsScene(canvas)
    scene.atmosphereLevel = storyState.atmosphereLevel
    scene.setFromProgress(storyState.scrollProgress)
    frameId = window.requestAnimationFrame(renderFrame)
  })

  // 滚动进度 → 镜头机位、尘埃浓度、绿色立方体状态、藤蔓长度
  watch(
    () => storyState.scrollProgress,
    (progress) => {
      scene?.setFromProgress(progress)
    },
  )

  // 大气浓度 → 场景曝光、环境光、背景色、尘埃透明度
  watch(
    () => storyState.atmosphereLevel,
    (level) => {
      if (scene) scene.atmosphereLevel = level
    },
  )

  onBeforeUnmount(() => {
    window.cancelAnimationFrame(frameId)
    scene?.dispose()
    scene = null
  })
}
