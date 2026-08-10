import { DATA, SECTIONS } from './data'
import '../css/style.css'
import { selectedInstances, activeSections, setSearchQuery, updateHash, saveState, loadState, parseHash } from './state'
import { renderSidebar, renderMain } from './render'
import { renderSectionsPanel, renderTagsPanel, renderExportPanel, resetSections, clearSections, resetTags, clearTags, toggleTag, toggleSubGroup, setRenderFns } from './panels'
import { togglePanel, applyVisiblePanels, initDragSystem } from './layout'
import { copyValue, runAction, copyInstance, copySingleSection, copySubGroup, copySubGroupCompare, copySection, copyAllSections, copySelectedInstances } from './copy'
import { exportTable, saveMD, saveCSV, exportCSV, exportExcel, saveExcel, saveODS, printContent, exportSectionsSelected } from './export'

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

  loadState()
  parseHash()
  if (!selectedInstances.size) SECTIONS.forEach(s => activeSections.add(s.key))

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
