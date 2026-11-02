/**
 * 滚动辅助函数。
 * 全站是单页滚动叙事，没有路由，所有锚点跳转统一走这里。
 */

export function scrollToId(id, options = {}) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start', ...options })
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
