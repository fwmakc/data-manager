import type { PanelEntry, VisiblePanels, PanelLayout } from './types'
import { visiblePanels, panelLayout, saveState } from './state'

export function togglePanel(key: string): void {
  visiblePanels[key as keyof VisiblePanels] = !visiblePanels[key as keyof VisiblePanels]
  applyVisiblePanels()
  saveState()
}

export function applyVisiblePanels(): void {
  const btnMap: Record<string, string> = {
    sections: 'toggleSections', tags: 'toggleTags', filter: 'toggleFilter', list: 'toggleList', export: 'toggleExport', projects: 'toggleProjects'
  }
  for (const key in btnMap) {
    const btn = document.getElementById(btnMap[key])!
    if (visiblePanels[key as keyof typeof visiblePanels]) btn.classList.add('active')
    else btn.classList.remove('active')
  }
  renderLayout()
}

export function renderLayout(): void {
  const store = document.getElementById('panelStore')!
  const panelMap: Record<string, string> = {
    sections: 'panelSections', tags: 'panelTags', filter: 'panelFilter', list: 'panelList', export: 'panelExport', projects: 'panelProjects'
  }
  const zones: Record<string, HTMLElement> = {
    left: document.getElementById('zoneLeft')!,
    right: document.getElementById('zoneRight')!,
  }

  for (const key in panelMap) {
    const el = document.getElementById(panelMap[key])!
    if (el.parentElement !== store) store.appendChild(el)
  }

  for (const zk of Object.keys(zones) as (keyof typeof zones)[]) {
    zones[zk].innerHTML = ''
    zones[zk].style.display = ''
  }

  const zoneKeys = ['left', 'right']
  for (const zoneKey of zoneKeys) {
    const zoneEl = zones[zoneKey]
    const entries = (panelLayout[zoneKey as keyof typeof panelLayout] || []).filter(e => visiblePanels[e.id as keyof typeof visiblePanels])
    if (entries.length === 0) {
      zoneEl.style.display = 'grid'
      zoneEl.style.gridTemplateRows = 'repeat(1, auto)'
      zoneEl.style.gridTemplateColumns = '1fr'
      zoneEl.style.minHeight = '60px'
      continue
    }

    let maxRow = 0, maxCol = 0
    for (const entry of entries) {
      const rEnd = entry.row + (entry.rowSpan || 1)
      const cEnd = entry.col + (entry.colSpan || 1)
      if (rEnd > maxRow) maxRow = rEnd
      if (cEnd > maxCol) maxCol = cEnd
    }
    zoneEl.style.display = 'grid'
    zoneEl.style.gridTemplateRows = `repeat(${maxRow}, auto)`
    zoneEl.style.gridTemplateColumns = `repeat(${maxCol}, 1fr)`
    zoneEl.style.minHeight = ''
    zoneEl.style.gap = '0'

    for (const entry of entries) {
      const panelEl = document.getElementById(panelMap[entry.id])!
      if (panelEl) {
        panelEl.style.display = ''
        const rowEntries = entries.filter(e => e.row === entry.row)
        if (rowEntries.length === 1 && maxCol > 1) {
          panelEl.style.gridRow = `${entry.row + 1} / span ${entry.rowSpan || 1}`
          panelEl.style.gridColumn = '1 / -1'
        } else {
          panelEl.style.gridRow = `${entry.row + 1} / span ${entry.rowSpan || 1}`
          panelEl.style.gridColumn = `${entry.col + 1} / span ${entry.colSpan || 1}`
        }
        zoneEl.appendChild(panelEl)
      }
    }
  }

  for (const key in panelMap) {
    if (!visiblePanels[key as keyof typeof visiblePanels]) {
      document.getElementById(panelMap[key])!.style.display = 'none'
    }
  }
}

export function initDragSystem(): void {
  document.addEventListener('mousedown', (e: MouseEvent) => {
    const title = (e.target as HTMLElement).closest('.panel-title')
    if (!title) return
    const panel = title.closest('.panel')! as HTMLElement
    const panelId = (title as HTMLElement).dataset.panel
    if (!panelId) return

    e.preventDefault()
    const ghost = document.createElement('div')
    ghost.className = 'drag-ghost'
    ghost.textContent = title.textContent
    document.body.appendChild(ghost)
    ghost.style.left = (e.clientX + 12) + 'px'
    ghost.style.top = (e.clientY - 10) + 'px'
    panel.classList.add('dragging')

    function removeIndicators(): void {
      document.querySelectorAll('.drop-indicator-h, .drop-indicator-v').forEach(el => el.remove())
    }

    function getTargetZone(ev: MouseEvent): { key: string; el: HTMLElement } | null {
      if (ev.clientY < 0 || ev.clientX < 0) return null
      const leftEl = document.getElementById('zoneLeft')!
      const rightEl = document.getElementById('zoneRight')!
      if (leftEl.style.display === 'none' && rightEl.style.display === 'none') return null
      if (leftEl.style.display === 'none') return { key: 'right', el: rightEl }
      if (rightEl.style.display === 'none') return { key: 'left', el: leftEl }
      const leftRect = leftEl.getBoundingClientRect()
      const rightRect = rightEl.getBoundingClientRect()
      const midX = (leftRect.right + rightRect.left) / 2
      const zoneKey = ev.clientX < midX ? 'left' : 'right'
      return { key: zoneKey, el: zoneKey === 'left' ? leftEl : rightEl }
    }

    function findDropPosition(ev: MouseEvent, zoneEl: HTMLElement): { row: number; col: number } {
      const panels = Array.from(zoneEl.querySelectorAll<HTMLElement>(':scope > .panel'))
      if (panels.length === 0) return { row: 0, col: -1 }
      const zoneRect = zoneEl.getBoundingClientRect()
      const rowCount = parseInt(zoneEl.style.gridTemplateRows.split('repeat(')[1]) || 1
      const relY = Math.max(0, Math.min(ev.clientY - zoneRect.top, zoneRect.height))
      const gridBottom = 0
      const rowBottoms: number[] = new Array(rowCount).fill(0)
      let maxBottom = 0
      for (const p of panels) {
        const r = p.getBoundingClientRect()
        const gr = parseInt(p.style.gridRow) - 1
        const b = r.bottom - zoneRect.top
        if (b > maxBottom) maxBottom = b
        if (gr >= 0 && gr < rowBottoms.length && b > rowBottoms[gr]) rowBottoms[gr] = b
      }
      const T = 12
      for (let r = rowCount - 1; r >= 0; r--) {
        if (relY > rowBottoms[r] - T) return { row: r + 1, col: -1 }
      }
      if (relY < T) return { row: 0, col: -1 }
      const cellH = maxBottom / rowCount
      const cellRow = Math.max(0, Math.min(Math.floor(relY / cellH), rowCount - 1))
      return { row: cellRow, col: -1 }
    }

    function showIndicator(ev: MouseEvent, zoneEl: HTMLElement): void {
      removeIndicators()
      const drop = findDropPosition(ev, zoneEl)
      const ind = document.createElement('div')
      if (drop.col === -1) {
        ind.className = 'drop-indicator-h'
        ind.style.gridColumn = '1 / -1'
        ind.style.gridRow = (drop.row + 1) + ''
        if (drop.row >= parseInt(zoneEl.style.gridTemplateRows.split('repeat(')[1] || '1')) {
          ind.style.gridRow = 'auto'
        }
      } else {
        ind.className = 'drop-indicator-v'
        ind.style.gridColumn = (drop.col + 1) + ''
        ind.style.gridRow = (drop.row + 1) + ''
      }
      zoneEl.appendChild(ind)
    }

    function onMove(ev: MouseEvent): void {
      ghost.style.left = (ev.clientX + 12) + 'px'
      ghost.style.top = (ev.clientY - 10) + 'px'
      const target = getTargetZone(ev)
      if (target) showIndicator(ev, target.el)
      else removeIndicators()
    }

    function onUp(ev: MouseEvent): void {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      ghost.remove()
      panel.classList.remove('dragging')
      removeIndicators()
      const target = getTargetZone(ev)
      if (target && panelId) {        const drop = findDropPosition(ev, target.el)
        updateLayoutForDrop(panelId, target.key, drop)
        renderLayout()
        saveState()
      } else {
        renderLayout()
      }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })
}

function updateLayoutForDrop(panelId: string, targetZone: string, drop: { row: number; col: number }): void {
  const zones = ['left', 'right'] as const
  for (const z of zones) {
    panelLayout[z] = panelLayout[z].filter(e => e.id !== panelId)
  }
  const entries = panelLayout[targetZone as keyof typeof panelLayout]
  for (const entry of entries) {
    if (entry.row >= drop.row) entry.row++
  }
  entries.push({ id: panelId, row: drop.row, col: drop.col === -1 ? 0 : drop.col })
  normalizeLayout()
}

function normalizeLayout(): void {
  const zones = ['left', 'right'] as const
  for (const z of zones) {
    const entries = panelLayout[z]
    if (entries.length === 0) continue
    const rowsSet = [...new Set(entries.map(e => e.row))]
    rowsSet.sort((a, b) => a - b)
    const rowMap: Record<number, number> = {}
    rowsSet.forEach((r, i) => rowMap[r] = i)
    entries.forEach(e => e.row = rowMap[e.row])
  }
}
