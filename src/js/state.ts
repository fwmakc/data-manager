import type { PanelLayout } from './types'
import { DATA } from './data'

export const selectedInstances = new Set<string>()
export const activeSections = new Set<string>()
export const activeTags = new Set<string>()
export const hiddenSubGroups = new Set<string>()
export let searchQuery = ''
export let dataSearchQuery = ''
export function setSearchQuery(val: string): void {
  searchQuery = val
}
export function setDataSearchQuery(val: string): void {
  dataSearchQuery = val
}
export const visiblePanels = { sections: true, tags: true, list: true, export: true }
export let panelLayout: PanelLayout = {
  left: [{ id: 'list', row: 0, col: 0 }, { id: 'tags', row: 1, col: 0 }],
  right: [{ id: 'sections', row: 0, col: 0 }, { id: 'export', row: 1, col: 0 }],
}

let toastTimer: number | undefined

export function showToast(): void {
  const toast = document.getElementById('toast')!
  toast.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1200)
}

export function updateHash(): void {
  let hash = ''
  if (selectedInstances.size === 1) {
    hash = '#' + [...selectedInstances][0]
  } else if (selectedInstances.size > 1) {
    hash = '#compare:' + [...selectedInstances].sort().join(',')
  }
  history.replaceState(null, '', location.pathname + hash)
}

export function saveState(): void {
  localStorage.setItem('am_selected', JSON.stringify([...selectedInstances]))
  localStorage.setItem('am_sections', JSON.stringify([...activeSections]))
  localStorage.setItem('am_tags', JSON.stringify([...activeTags]))
  localStorage.setItem('am_subgroups', JSON.stringify([...hiddenSubGroups]))
  localStorage.setItem('am_visiblepanels', JSON.stringify(visiblePanels))
  localStorage.setItem('am_layout', JSON.stringify(panelLayout))
}

export function loadState(): void {
  try {
    const raw = localStorage.getItem('am_selected')
    if (raw) { const s = JSON.parse(raw); if (Array.isArray(s)) s.forEach((x: string) => selectedInstances.add(x)) }
  } catch (_e) {}
  try {
    const raw = localStorage.getItem('am_sections')
    if (raw) { const s = JSON.parse(raw); if (Array.isArray(s)) { activeSections.clear(); s.forEach((x: string) => activeSections.add(x)) } }
  } catch (_e) {}
  try {
    const raw = localStorage.getItem('am_tags')
    if (raw) { const t = JSON.parse(raw); if (Array.isArray(t)) { activeTags.clear(); t.forEach((x: string) => activeTags.add(x)) } }
  } catch (_e) {}
  try {
    const raw = localStorage.getItem('am_subgroups')
    if (raw) { const sg = JSON.parse(raw); if (Array.isArray(sg)) { hiddenSubGroups.clear(); sg.forEach((x: string) => hiddenSubGroups.add(x)) } }
  } catch (_e) {}
  try {
    const raw = localStorage.getItem('am_visiblepanels')
    if (raw) { const p = JSON.parse(raw); if (p) Object.assign(visiblePanels, p) }
  } catch (_e) {}
  try {
    const raw = localStorage.getItem('am_layout')
    if (raw) { const l = JSON.parse(raw); if (l) panelLayout = l }
  } catch (_e) {}
}

export function parseHash(): void {
  const h = decodeURIComponent(location.hash.slice(1))
  if (!h) return
  if (h.startsWith('compare:')) {
    h.slice(9).split(',').forEach(s => {
      if (DATA.find(i => i.name === s)) selectedInstances.add(s)
    })
  } else {
    if (DATA.find(i => i.name === h)) selectedInstances.add(h)
  }
}
