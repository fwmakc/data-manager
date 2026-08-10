import { DATA, SECTIONS } from './data'
import '../css/style.css'
import { selectedInstances, activeSections, activeTags, setSearchQuery, setDataSearchQuery, dataSearchQuery, updateHash, saveState, loadState, parseHash } from './state'
import { renderSidebar, renderMain } from './render'
import { renderSectionsPanel, renderTagsPanel, renderExportPanel, resetSections, clearSections, resetTags, clearTags, toggleTag, toggleSubGroup, setRenderFns, getAllTags } from './panels'
import { togglePanel, applyVisiblePanels, initDragSystem } from './layout'
import { copyValue, runAction, copyInstance, copySingleSection, copySubGroup, copySubGroupCompare, copySection, copyAllSections, copySelectedInstances } from './copy'
import { exportTable, saveMD, saveCSV, exportCSV, exportExcel, saveExcel, saveODS, printContent, exportSectionsSelected } from './export'
import { getSectionFields, fmtCopy } from './helpers'

function toggleInstance(name: string): void {
  if (selectedInstances.has(name)) selectedInstances.delete(name)
  else selectedInstances.add(name)
  updateHash()
  renderSidebar()
  renderMain()
  saveState()
}

function clickInstance(name: string): void {
  selectedInstances.clear()
  selectedInstances.add(name)
  updateHash()
  renderSidebar()
  renderMain()
  saveState()
}

function selectAll(): void {
  DATA.forEach(i => selectedInstances.add(i.name))
  updateHash()
  renderSidebar()
  renderMain()
  saveState()
}

function selectNone(): void {
  selectedInstances.clear()
  updateHash()
  renderSidebar()
  renderMain()
  saveState()
}

function toggleSection(key: string): void {
  if (activeSections.has(key)) activeSections.delete(key)
  else activeSections.add(key)
  renderSectionsPanel()
  renderMain()
  saveState()
}

function init(): void {
  setRenderFns(renderSidebar, renderMain)

  document.getElementById('search')!.addEventListener('input', (e) => {
    setSearchQuery((e.target as HTMLInputElement).value)
    renderSidebar()
  })

  window.addEventListener('hashchange', () => {
    selectedInstances.clear()
    parseHash()
    renderSidebar()
    renderMain()
  })

  const g = window as any
  g.togglePanel = togglePanel
  g.toggleInstance = toggleInstance
  g.clickInstance = clickInstance
  g.selectAll = selectAll
  g.selectNone = selectNone
  g.toggleSection = toggleSection
  g.resetSections = resetSections
  g.clearSections = clearSections
  g.resetTags = resetTags
  g.clearTags = clearTags
  g.toggleTag = toggleTag
  g.toggleSubGroup = toggleSubGroup
  g.copyValue = copyValue
  g.runAction = runAction
  g.copyInstance = copyInstance
  g.copySingleSection = copySingleSection
  g.copySubGroup = copySubGroup
  g.copySubGroupCompare = copySubGroupCompare
  g.copySection = copySection
  g.copyAllSections = copyAllSections
  g.copySelectedInstances = copySelectedInstances
  g.exportTable = exportTable
  g.saveMD = saveMD
  g.saveCSV = saveCSV
  g.exportCSV = exportCSV
  g.exportExcel = exportExcel
  g.saveExcel = saveExcel
  g.saveODS = saveODS
  g.printContent = printContent
  g.exportSectionsSelected = exportSectionsSelected
  g.clearDataSearch = () => {
    dataSearchEl.value = ''
    setDataSearchQuery('')
    renderMain()
    updateSearchCount()
  }

  const dataSearchEl = document.getElementById('dataSearch') as HTMLInputElement
  const dataSearchCountEl = document.getElementById('dataSearchCount')!

  function updateSearchCount(): void {
    if (!dataSearchQuery) { dataSearchCountEl.textContent = ''; return }
    let count = 0
    const q = dataSearchQuery.toLowerCase()
    for (const name of selectedInstances) {
      const inst = DATA.find(i => i.name === name)
      if (!inst) continue
      for (const sec of SECTIONS) {
        if (!activeSections.has(sec.key)) continue
        const fields = getSectionFields(sec.key, inst)
        for (const f of fields) {
          if (fmtCopy(f.value).toLowerCase().includes(q)) count++
        }
      }
    }
    dataSearchCountEl.textContent = count ? 'найдено: ' + count : 'нет'
  }

  dataSearchEl.addEventListener('input', () => {
    setDataSearchQuery(dataSearchEl.value)
    renderMain()
    updateSearchCount()
  })

  loadState()
  parseHash()
  if (!selectedInstances.size) SECTIONS.forEach(s => activeSections.add(s.key))
  if (!activeTags.size) getAllTags().forEach(t => activeTags.add(t))

  renderSectionsPanel()
  renderTagsPanel()
  renderExportPanel()
  renderSidebar()
  initDragSystem()
  applyVisiblePanels()
  renderMain()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
