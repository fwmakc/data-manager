import { DATA, ACTIONS, SECTIONS, FIELD_LABELS, SUB_LABELS } from './data'
import { selectedInstances, activeSections, activeTags, hiddenSubGroups, searchQuery, saveState, updateHash } from './state'
import { getSectionFields, fmt, fmtCopy, escHtml, escAttr } from './helpers'
import { copyValue, resolveAction, runAction, copyInstance, copySingleSection, copySubGroup, copySubGroupCompare, copySection } from './copy'

export function isVisible(inst: Record<string, any>): boolean {
  const q = searchQuery.toLowerCase()
  const matchName = !q || inst.name.toLowerCase().includes(q)
  const matchTag = activeTags.size === 0 || (inst.status || []).some((t: string) => activeTags.has(t))
  return matchName && matchTag
}

export function renderSidebar(): void {
  for (const inst of DATA) {
    if (selectedInstances.has(inst.name) && !isVisible(inst)) {
      selectedInstances.delete(inst.name)
    }
  }
  renderMain()

  const listEl = document.getElementById('instanceList')!
  let listHtml = ''
  for (const inst of DATA) {
    if (!isVisible(inst)) continue
    const checked = selectedInstances.has(inst.name) ? 'checked' : ''
    const active = selectedInstances.size === 1 && selectedInstances.has(inst.name) ? 'active' : ''
    const statuses = (inst.status || []).map((s: string) => `<span class="status-tag">${escHtml(s)}</span>`).join('')
    listHtml += `<div class="instance-item ${active}" data-name="${escAttr(inst.name)}">`
    listHtml += `<input type="checkbox" ${checked} onclick="event.stopPropagation(); toggleInstance('${escAttr(inst.name)}')">`
    listHtml += `<span class="site-name" onclick="if(event.ctrlKey||event.metaKey){event.stopPropagation();toggleInstance('${escAttr(inst.name)}')}else{clickInstance('${escAttr(inst.name)}')}">${escHtml(inst.name)}</span>`
    listHtml += `<span class="status-tags">${statuses}</span>`
    listHtml += '</div>'
  }
  listEl.innerHTML = listHtml

  const visible = DATA.filter(i => isVisible(i)).length
  document.getElementById('instanceCount')!.textContent = selectedInstances.size + ' \u0432\u044B\u0431\u0440\u0430\u043D\u043E \u0438\u0437 ' + visible
}

export function renderMain(): void {
  const main = document.getElementById('mainContent')!
  if (selectedInstances.size === 0) {
    main.innerHTML = '<div class="empty-state">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u043D\u0441\u0442\u0430\u043D\u0441 \u0441\u043B\u0435\u0432\u0430</div>'
    return
  }
  if (selectedInstances.size === 1) {
    const inst = DATA.find(i => i.name === [...selectedInstances][0])!
    renderSingle(inst, main)
  } else {
    const insts = DATA.filter(i => selectedInstances.has(i.name))
    renderCompare(insts, main)
  }
}

function renderActionButtons(inst: Record<string, any>, html: string): string {
  if (ACTIONS.length > 0 && activeSections.has('actions')) {
    html += '<div class="action-bar">'
    for (let ri = 0; ri < ACTIONS.length; ri++) {
      if (ri > 0) html += '<div class="action-row-gap"></div>'
      const row = ACTIONS[ri]
      for (const act of row) {
        if (act.method === 'url') {
          const url = resolveAction(inst, act.name)
          html += `<a class="action-btn" href="${escAttr(url)}" target="_blank" rel="noopener">${escHtml(act.name)}</a>`
        } else {
          html += `<button class="action-btn" onclick="runAction('${escAttr(inst.name)}', '${escAttr(act.name)}')">${escHtml(act.name)}</button>`
        }
      }
    }
    html += '</div>'
  }
  return html
}

function renderSingle(inst: Record<string, any>, container: HTMLElement): void {
  let html = `<h2 class="copyable-header" onclick="copyInstance('${escAttr(inst.name)}')">${escHtml(inst.name)}</h2>`
  html = renderActionButtons(inst, html)

  for (const sec of SECTIONS) {
    if (!activeSections.has(sec.key)) continue
    const fields = getSectionFields(sec.key, inst).filter(f => {
      const v = Array.isArray(f.value) ? f.value : [f.value]
      return v.some((x: any) => x !== null && x !== undefined && x !== '')
    })
    if (fields.length === 0) continue

    html += `<div class="section-block" data-section="${sec.key}">`
    html += `<div class="section-title copyable-header" onclick="copySingleSection('${sec.key}', '${escAttr(inst.name)}')">${escHtml(sec.label)}</div>`
    html += '<div class="section-body">'
    let currentGroup = ''
    for (const f of fields) {
      const parts = f.path.split('.')
      const label = FIELD_LABELS[sec.key + '.' + f.path] || f.key
      if (parts.length > 1) {
        const group = parts[0]
        const sgKey = sec.key + '.' + group
        if (hiddenSubGroups.has(sgKey)) continue
        if (group !== currentGroup) {
          currentGroup = group
          const groupLabel = SUB_LABELS[sec.key + '.' + group] || group
          html += `<div class="sub-header copyable-header" onclick="copySubGroup('${sec.key}', '${escAttr(inst.name)}', '${group}')">${escHtml(groupLabel)}</div>`
        }
        html += '<div class="field-row">'
        html += `<span class="field-key">${escHtml(label)}</span>`
        html += `<span class="field-value" onclick="copyValue(this, '${escAttr(fmtCopy(f.value))}')">${fmt(f.value)}</span>`
        html += '</div>'
      } else {
        currentGroup = ''
        html += '<div class="field-row">'
        html += `<span class="field-key">${escHtml(label)}</span>`
        html += `<span class="field-value" onclick="copyValue(this, '${escAttr(fmtCopy(f.value))}')">${fmt(f.value)}</span>`
        html += '</div>'
      }
    }
    html += '</div></div>'
  }
  container.innerHTML = html
}

function renderCompare(insts: Record<string, any>[], container: HTMLElement): void {
  let html = '<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th></th>'
  for (const inst of insts) {
    html += `<th class="copyable-header" onclick="copyInstance('${escAttr(inst.name)}')">${escHtml(inst.name)}</th>`
  }
  html += '</tr></thead><tbody>'

  if (ACTIONS.length > 0 && activeSections.has('actions')) {
    for (const row of ACTIONS) {
      html += '<tr class="action-row"><td></td>'
      for (const inst of insts) {
        html += '<td>'
        for (const act of row) {
          if (act.method === 'url') {
            const url = resolveAction(inst, act.name)
            html += `<a class="action-btn" href="${escAttr(url)}" target="_blank" rel="noopener">${escHtml(act.name)}</a>`
          } else {
            html += `<button class="action-btn" onclick="runAction('${escAttr(inst.name)}', '${escAttr(act.name)}')">${escHtml(act.name)}</button>`
          }
        }
        html += '</td>'
      }
      html += '</tr>'
    }
  }

  for (const sec of SECTIONS) {
    if (!activeSections.has(sec.key)) continue
    const allFields = new Set<string>()
    for (const inst of insts) {
      getSectionFields(sec.key, inst).forEach(f => allFields.add(f.path))
    }
    const sorted = [...allFields].sort()
    if (sorted.length === 0) continue

    html += `<tr class="section-row"><td class="copyable-header" colspan="${insts.length + 1}" onclick="copySection('${sec.key}')">${escHtml(sec.label)}</td></tr>`

    let currentGroup = ''
    for (const fp of sorted) {
      const parts = fp.split('.')
      if (parts.length > 1) {
        const group = parts[0]
        const sgKey = sec.key + '.' + group
        if (hiddenSubGroups.has(sgKey)) continue
        if (group !== currentGroup) {
          currentGroup = group
          const groupLabel = SUB_LABELS[sec.key + '.' + group] || group
          html += `<tr class="sub-group-row"><td class="copyable-header" colspan="${insts.length + 1}" onclick="copySubGroupCompare('${sec.key}', '${group}')">${escHtml(groupLabel)}</td></tr>`
        }
      } else {
        currentGroup = ''
      }
      const label = FIELD_LABELS[sec.key + '.' + fp] || fp.split('.').pop()
      html += `<tr><td class="field-path">${escHtml(label)}</td>`
      for (const inst of insts) {
        const fields = getSectionFields(sec.key, inst)
        const field = fields.find(f => f.path === fp)
        const val = field ? field.value : null
        html += `<td><span class="cell-value" onclick="copyValue(this, '${escAttr(fmtCopy(val))}')">${fmt(val)}</span></td>`
      }
      html += '</tr>'
    }
  }
  html += '</tbody></table></div>'
  container.innerHTML = html
}
