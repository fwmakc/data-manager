import { DATA, ACTIONS, SECTIONS, FIELD_LABELS, SUB_LABELS } from './data'
import { selectedInstances, activeSections, showToast } from './state'
import { getSectionFields, fmtCopy, escAttr, fieldToMd, buildGroupMd, getValueByPath } from './helpers'

export function copyValue(el: HTMLElement, val: string): void {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(val).then(() => {
      el.classList.add('copied')
      setTimeout(() => el.classList.remove('copied'), 300)
      showToast()
    }).catch(() => fallbackCopy(el, val))
  } else {
    fallbackCopy(el, val)
  }
}

function fallbackCopy(el: HTMLElement, val: string): void {
  const ta = document.createElement('textarea')
  ta.value = val
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
    el.classList.add('copied')
    setTimeout(() => el.classList.remove('copied'), 300)
    showToast()
  } catch (_e) {}
  document.body.removeChild(ta)
}

export function clipboardCopy(md: string): void {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(md).then(() => showToast())
  } else {
    const ta = document.createElement('textarea')
    ta.value = md
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy'); showToast() } catch (_e) {}
    document.body.removeChild(ta)
  }
}

function findAction(actionKey: string): any | null {
  for (const row of ACTIONS) {
    for (const item of row) {
      if (item.name === actionKey) return item
    }
  }
  return null
}

export function resolveAction(inst: Record<string, any>, actionKey: string): string {
  const act = findAction(actionKey)
  if (!act) return ''
  const tmpl = typeof act === 'string' ? act : act.data
  return tmpl.replace(/\{([^}]+)\}/g, (_: string, path: string) => {
    const parts = path.split('.')
    let val: any = inst
    for (const p of parts) { val = val && val[p] }
    if (val !== null && val !== undefined && val !== '') return val
    return path
  })
}

export function runAction(site: string, actionKey: string): void {
  const inst = DATA.find(i => i.name === site)
  if (!inst) return
  clipboardCopy(resolveAction(inst, actionKey))
}

export function copyInstanceMd(inst: Record<string, any>): string {
  const blocks: string[] = ['# ' + inst.name]
  for (const sec of SECTIONS) {
    if (!activeSections.has(sec.key)) continue
    const fields = getSectionFields(sec.key, inst).filter(f => {
      const v = Array.isArray(f.value) ? f.value : [f.value]
      return v.some(x => x !== null && x !== undefined && x !== '')
    })
    if (fields.length === 0) continue
    blocks.push('## ' + sec.label)
    const md = buildGroupMd(sec.key, fields, inst, (secKey, fp) => {
      return FIELD_LABELS[secKey + '.' + fp] || fp.split('.').pop() || ''
    }, (inst, fp, secKey) => {
      return getValueByPath(inst, secKey + '.' + fp)
    })
    if (md) blocks.push(md)
  }
  return blocks.join('\n\n')
}

export function copyInstance(name: string): void {
  const inst = DATA.find(i => i.name === name)
  if (!inst) return
  const md = copyInstanceMd(inst)
  if (md) clipboardCopy(md)
}

export function copySingleSection(sectionKey: string, name: string): void {
  const inst = DATA.find(i => i.name === name)
  const sec = SECTIONS.find(s => s.key === sectionKey)
  if (!inst || !sec) return
  const fields = getSectionFields(sectionKey, inst).filter(f => {
    const v = Array.isArray(f.value) ? f.value : [f.value]
    return v.some(x => x !== null && x !== undefined && x !== '')
  })
  if (fields.length === 0) return
  const blocks: string[] = ['# ' + inst.name, '## ' + sec.label]
  const md = buildGroupMd(sectionKey, fields, inst, (secKey, fp) => {
    return FIELD_LABELS[secKey + '.' + fp] || fp.split('.').pop() || ''
  }, (inst, fp, secKey) => {
    return getValueByPath(inst, secKey + '.' + fp)
  })
  if (md) blocks.push(md)
  clipboardCopy(blocks.join('\n\n'))
}

export function copySubGroup(sectionKey: string, name: string, group: string): void {
  const inst = DATA.find(i => i.name === name)
  const sec = SECTIONS.find(s => s.key === sectionKey)
  if (!inst || !sec) return
  const fields = getSectionFields(sectionKey, inst).filter(f => f.path.startsWith(group + '.'))
  if (fields.length === 0) return
  const groupLabel = SUB_LABELS[sectionKey + '.' + group] || group
  const blocks: string[] = ['# ' + inst.name, '## ' + sec.label + ' / ' + groupLabel]
  for (const f of fields) {
    const label = FIELD_LABELS[sectionKey + '.' + f.path] || f.key
    const line = fieldToMd(label, f.value)
    if (line) blocks.push(line)
  }
  clipboardCopy(blocks.join('\n\n'))
}

export function copySubGroupCompare(sectionKey: string, group: string): void {
  const insts = DATA.filter(i => selectedInstances.has(i.name))
  const sec = SECTIONS.find(s => s.key === sectionKey)
  if (!sec || !insts.length) return
  const groupLabel = SUB_LABELS[sectionKey + '.' + group] || group
  const blocks: string[] = ['# ' + sec.label + ' / ' + groupLabel]
  let hasContent = false
  for (const inst of insts) {
    const fields = getSectionFields(sectionKey, inst).filter(f => f.path.startsWith(group + '.'))
    if (fields.length === 0) continue
    hasContent = true
    blocks.push('## ' + inst.name)
    for (const f of fields) {
      const label = FIELD_LABELS[sectionKey + '.' + f.path] || f.key
      const line = fieldToMd(label, f.value)
      if (line) blocks.push(line)
    }
  }
  if (!hasContent) return
  clipboardCopy(blocks.join('\n\n'))
}

export function copySection(sectionKey: string): void {
  const insts = DATA.filter(i => selectedInstances.has(i.name))
  const sec = SECTIONS.find(s => s.key === sectionKey)
  if (!sec || !insts.length) return
  const allFields = new Set<string>()
  for (const inst of insts) {
    getSectionFields(sectionKey, inst).forEach(f => allFields.add(f.path))
  }
  const sorted = [...allFields].sort()
  const blocks: string[] = ['# ' + sec.label]
  for (const inst of insts) {
    const md = buildGroupMd(sectionKey, sorted, inst, (secKey, fp) => {
      return FIELD_LABELS[secKey + '.' + fp] || fp.split('.').pop() || ''
    }, (inst, fp, secKey) => {
      const fields = getSectionFields(secKey, inst)
      const field = fields.find(f => f.path === fp)
      return field ? field.value : null
    })
    if (!md) continue
    blocks.push('## ' + inst.name)
    blocks.push(md)
  }
  if (blocks.length <= 1) return
  clipboardCopy(blocks.join('\n\n'))
}

export function copyAllSections(): void {
  const insts = DATA.filter(i => selectedInstances.has(i.name))
  if (!insts.length) return
  const blocks: string[] = []
  for (const sec of SECTIONS) {
    if (!activeSections.has(sec.key)) continue
    const allFields = new Set<string>()
    for (const inst of insts) {
      getSectionFields(sec.key, inst).forEach(f => allFields.add(f.path))
    }
    const sorted = [...allFields].sort()
    if (sorted.length === 0) continue
    blocks.push('# ' + sec.label)
    for (const inst of insts) {
      const md = buildGroupMd(sec.key, sorted, inst, (secKey, fp) => {
        return FIELD_LABELS[secKey + '.' + fp] || fp.split('.').pop() || ''
      }, (inst, fp, secKey) => {
        const fields = getSectionFields(secKey, inst)
        const field = fields.find(f => f.path === fp)
        return field ? field.value : null
      })
      if (!md) continue
      blocks.push('## ' + inst.name)
      blocks.push(md)
    }
  }
  if (blocks.length) clipboardCopy(blocks.join('\n\n'))
}

export function copySelectedInstances(): void {
  const insts = DATA.filter(i => selectedInstances.has(i.name))
  if (!insts.length) return
  const allBlocks: string[] = []
  for (const inst of insts) {
    allBlocks.push(copyInstanceMd(inst))
  }
  if (allBlocks.length) clipboardCopy(allBlocks.join('\n\n'))
}
