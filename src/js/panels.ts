import { DATA, SECTIONS, FIELD_LABELS, SUB_LABELS } from './data'
import { activeSections, activeFilters, hiddenSubGroups, selectedInstances, activeTag, setActiveTag, saveState, updateHash } from './state'
import { getSectionFields, escHtml, escAttr } from './helpers'
import { isVisible } from './render'
import { projectList, currentProject } from './projects'

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
    const hasVisible = DATA.filter(i => (i.tags || []).includes(tag) && isVisible(i)).length > 0
    const isActive = tag === activeTag && hasVisible
    html += `<label class="tag-btn ${isActive ? 'active' : ''}" onclick="selectTag('${escAttr(tag)}')">${escHtml(tag)}</label>`
  }
  html += '</div>'
  body.innerHTML = html
}

export function selectTag(tag: string): void {
  if (activeTag === tag) {
    setActiveTag('')
    selectedInstances.clear()
  } else {
    setActiveTag(tag)
    selectedInstances.clear()
    DATA.forEach(i => {
      if ((i.tags || []).includes(tag)) selectedInstances.add(i.name)
    })
  }
  saveState()
  updateHash()
  renderTagsPanel()
  _renderSidebar()
  _renderMain()
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

export function renderProjectsPanel(): void {
  const body = document.getElementById('projectsBody')!
  if (projectList.length === 0) {
    body.innerHTML = '<div class="empty-projects">Нет проектов</div>'
    return
  }
  let html = '<div class="project-list">'
  for (const name of projectList) {
    const isActive = name === currentProject
    html += '<div class="project-row">'
    html += `<button class="project-item ${isActive ? 'active' : ''}" onclick="switchProject('${escAttr(name)}')">${escHtml(name)}</button>`
    html += `<button class="project-action" onclick="renameProject('${escAttr(name)}')" title="Переименовать">&#9998;</button>`
    html += `<button class="project-action project-action-del" onclick="deleteProject('${escAttr(name)}')" title="Удалить">&times;</button>`
    html += '</div>'
  }
  html += '</div>'
  html += '<button class="export-btn" style="margin-top:8px" onclick="exportProjectZip()">Экспорт проекта</button>'
  html += '<button class="export-btn" style="margin-top:4px" onclick="importProjectZip()">Импорт проекта</button>'
  body.innerHTML = html
}
