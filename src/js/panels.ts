import { DATA, SECTIONS, FIELD_LABELS, SUB_LABELS } from './data'
import { activeSections, activeTags, hiddenSubGroups, saveState } from './state'
import { getSectionFields, escHtml, escAttr } from './helpers'

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

function getAllTags(): string[] {
  const tags: Record<string, boolean> = {}
  DATA.forEach(i => (i.status || []).forEach(t => tags[t] = true))
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
  let html = '<div style="display:flex;flex-wrap:wrap;gap:4px;padding:4px">'
  for (const tag of allTags) {
    const isActive = activeTags.has(tag)
    html += `<label class="tag-btn ${isActive ? 'active' : ''}" onclick="toggleTag('${escAttr(tag)}')">${escHtml(tag)}</label>`
  }
  html += '</div>'
  body.innerHTML = html
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

export function resetTags(): void {
  activeTags.clear()
  renderTagsPanel()
  _renderSidebar()
  saveState()
}

export function clearTags(): void {
  activeTags.clear()
  renderTagsPanel()
  _renderSidebar()
  saveState()
}

export function toggleTag(tag: string): void {
  if (activeTags.has(tag)) activeTags.delete(tag)
  else activeTags.add(tag)
  renderTagsPanel()
  _renderSidebar()
  saveState()
}
