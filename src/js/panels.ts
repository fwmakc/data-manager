import { DATA, SECTIONS, FIELD_LABELS, SUB_LABELS } from './data'
import { activeSections, activeFilters, hiddenSubGroups, selectedInstances, saveState, updateHash } from './state'
import { getSectionFields, escHtml, escAttr } from './helpers'
import { isVisible } from './render'

type RenderFn = () => void
let _renderSidebar: RenderFn = () => {}
let _renderMain: RenderFn = () => {}

export function setRenderFns(rs: RenderFn, rm: RenderFn): void {
  _renderSidebar = rs
  _renderMain = rm
}

export function getAllSubGroups(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const inst of DATA) {
    for (const sec of SECTIONS) {
      const fields = getSectionFields(sec.key, inst)
      for (const f of fields) {
        const parts = f.path.split('.')
        if (parts.length > 1) {
          const g = parts[0]
          const key = `${sec.key}.${g}`
          if (!map[key]) map[key] = SUB_LABELS[key] || g
        }
      }
    }
  }
  return map
}

function getSubGroupsForSection(secKey: string): { key: string; label: string }[] {
  const all = getAllSubGroups()
  const result: { key: string; label: string }[] = []
  for (const k in all) {
    if (k.startsWith(secKey + '.')) {
      result.push({ key: k, label: all[k] })
    }
  }
  return result.sort((a, b) => a.label.localeCompare(b.label))
}

export function getAllTags(): string[] {
  const tags: Record<string, boolean> = {}
  DATA.forEach(i => (i.tags || []).forEach(t => tags[t] = true))
  return Object.keys(tags).sort()
}

export function renderSectionsPanel(): void {
  const body = document.getElementById('sectionsBody')!
  let html = ''
  const isA = activeSections.has('actions')
  html += '<div class="filter-tree-item">'
  html += `<label class="tree-label ${isA ? 'active' : ''}">`
  html += `<input type="checkbox" ${isA ? 'checked' : ''} onchange="toggleSection('actions')">Действия`
  html += '</label></div>'
  for (const sec of SECTIONS) {
    const isActive = activeSections.has(sec.key)
    html += '<div class="filter-tree-item">'
    html += `<label class="tree-label ${isActive ? 'active' : ''}">`
    html += `<input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleSection('${sec.key}')">${sec.label}`
    html += '</label>'
    if (isActive) {
      const children = getSubGroupsForSection(sec.key)
      if (children.length > 0) {
        html += '<div class="tree-children">'
        for (const ch of children) {
          const isHidden = hiddenSubGroups.has(ch.key)
          html += `<label class="tree-label ${isHidden ? 'hidden-sg' : ''}">`
          html += `<input type="checkbox" ${isHidden ? '' : 'checked'} onchange="toggleSubGroup('${ch.key}')">${ch.label}`
          html += '</label>'
        }
        html += '</div>'
      }
    }
    html += '</div>'
  }
  body.innerHTML = html
}

export function renderTagsPanel(): void {
  const body = document.getElementById('tagsBody')!
  const allTags = getAllTags()
  let html = '<div class="tags-wrap">'
  for (const tag of allTags) {
    const visibleWithTag = DATA.filter(i => (i.tags || []).includes(tag) && isVisible(i))
    const allSelected = visibleWithTag.length > 0 && visibleWithTag.every(i => selectedInstances.has(i.name))
    html += `<label class="tag-btn ${allSelected ? 'active' : ''}" onclick="toggleTagSelect('${escAttr(tag)}')">${escHtml(tag)}</label>`
  }
  html += '</div>'
  body.innerHTML = html
}

export function toggleTagSelect(tag: string): void {
  const visibleWithTag = DATA.filter(i => (i.tags || []).includes(tag) && isVisible(i))
  const allSelected = visibleWithTag.every(i => selectedInstances.has(i.name))
  for (const inst of visibleWithTag) {
    if (allSelected) selectedInstances.delete(inst.name)
    else selectedInstances.add(inst.name)
  }
  saveState()
  updateHash()
  renderTagsPanel()
  _renderSidebar()
}

export function renderExportPanel(): void {
  const body = document.getElementById('exportBody')!
  const buttons: ({ label: string; action: string } | null)[] = [
    { label: 'Копировать', action: 'copySelectedInstances()' },
    { label: 'Копировать по секциям', action: 'exportSectionsSelected()' },
    null,
    { label: 'Копировать MD', action: 'exportTable()' },
    { label: 'Копировать CSV', action: 'exportCSV()' },
    { label: 'Копировать Excel', action: 'exportExcel()' },
    null,
    { label: 'Сохранить MD', action: 'saveMD()' },
    { label: 'Сохранить CSV', action: 'saveCSV()' },
    { label: 'Сохранить Excel', action: 'saveExcel()' },
    { label: 'Сохранить ODS', action: 'saveODS()' },
    null,
    { label: 'Распечатать', action: 'printContent()' },
  ]
  let html = ''
  for (const btn of buttons) {
    if (btn === null) {
      html += '<div class="export-separator"></div>'
    } else {
      html += `<button class="export-btn" onclick="${btn.action}">${btn.label}</button>`
    }
  }
  body.innerHTML = html
}

export function resetSections(): void {
  activeSections.clear()
  activeSections.add('actions')
  SECTIONS.forEach(s => activeSections.add(s.key))
  renderSectionsPanel()
  _renderMain()
  saveState()
}

export function clearSections(): void {
  activeSections.clear()
  renderSectionsPanel()
  _renderMain()
  saveState()
}

export function toggleSubGroup(key: string): void {
  if (hiddenSubGroups.has(key)) hiddenSubGroups.delete(key)
  else hiddenSubGroups.add(key)
  renderSectionsPanel()
  _renderMain()
  saveState()
}

export function renderFilterPanel(): void {
  const body = document.getElementById('filterBody')!
  const allTags = getAllTags()
  let html = '<div class="tags-wrap">'
  for (const tag of allTags) {
    const isActive = activeFilters.has(tag)
    html += `<label class="tag-btn ${isActive ? 'active' : ''}" onclick="toggleFilter('${escAttr(tag)}')">${escHtml(tag)}</label>`
  }
  html += '</div>'
  body.innerHTML = html
}

export function resetFilters(): void {
  activeFilters.clear()
  getAllTags().forEach(t => activeFilters.add(t))
  renderFilterPanel()
  renderTagsPanel()
  _renderSidebar()
  saveState()
}

export function clearFilters(): void {
  activeFilters.clear()
  renderFilterPanel()
  renderTagsPanel()
  _renderSidebar()
  saveState()
}

export function toggleFilter(tag: string): void {
  if (activeFilters.has(tag)) activeFilters.delete(tag)
  else activeFilters.add(tag)
  renderFilterPanel()
  renderTagsPanel()
  _renderSidebar()
  saveState()
}
