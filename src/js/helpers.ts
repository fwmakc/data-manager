import type { Field } from './types'
import { SUB_LABELS, FIELD_LABELS } from './data'

export function getSectionFields(sectionKey: string, data: Record<string, any>): Field[] {
  const fields: Field[] = []
  const section = data[sectionKey]
  if (!section) return fields
  if (Array.isArray(section)) {
    fields.push({ path: sectionKey, key: sectionKey, value: section })
    return fields
  }
  if (typeof section !== 'object') return fields

  function walk(obj: any, prefix: string): void {
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        walk(v, path)
      } else {
        fields.push({ path, key: k, value: v })
      }
    }
  }

  walk(section, '')
  return fields
}

export function getValueByPath(obj: Record<string, any>, path: string): any {
  const parts = path.split('.')
  let val: any = obj
  for (const p of parts) {
    if (val == null) return null
    val = val[p]
  }
  return val
}

export function fmt(v: any): string {
  if (v === null || v === undefined || v === '') return '\u2014'
  if (Array.isArray(v)) return v.map(fmt).join('<br>')
  return String(v)
}

export function fmtCopy(v: any): string {
  if (v === null || v === undefined || v === '') return '\u2014'
  if (Array.isArray(v)) return v.map(fmtCopy).join('\n')
  return String(v)
}

export function fmtCellValue(v: any): string {
  if (v === null || v === undefined || v === '') return ''
  if (Array.isArray(v)) return v.map(fmtCellValue).join(', ')
  return String(v)
}

export function escHtml(s: any): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function escAttr(s: any): string {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

export function fieldToMd(label: string, value: any): string {
  if (value === null || value === undefined || value === '') return ''
  if (Array.isArray(value)) {
    if (value.length === 0) return ''
    return `${label}:\n${value.map(v => `- \`${v}\``).join('\n')}`
  }
  return `${label}: \`${value}\``
}

export function buildGroupMd(
  secKey: string,
  fieldsOrPaths: (string | Field)[],
  inst: Record<string, any>,
  getLabel?: (secKey: string, fp: string) => string,
  getValue?: (inst: Record<string, any>, fp: string, secKey: string) => any
): string {
  const groups: { header?: string; rows: string[] }[] = []
  let currentGroup = ''
  let currentGroupLabel = ''
  let currentRows: string[] = []

  function flushGroup(): void {
    if (currentRows.length === 0) {
      currentGroup = ''
      currentGroupLabel = ''
      return
    }
    groups.push({ header: currentGroup ? `### ${currentGroupLabel}` : undefined, rows: [...currentRows] })
    currentGroup = ''
    currentGroupLabel = ''
    currentRows = []
  }

  for (let i = 0; i < fieldsOrPaths.length; i++) {
    const item = fieldsOrPaths[i]
    const fp = typeof item === 'string' ? item : item.path
    const parts = fp.split('.')
    if (parts.length > 1) {
      const group = parts[0]
      if (group !== currentGroup) {
        flushGroup()
        currentGroup = group
        currentGroupLabel = SUB_LABELS[`${secKey}.${group}`] || group
      }
    } else {
      if (currentGroup !== '') flushGroup()
      currentGroup = ''
    }
    const label = getLabel ? getLabel(secKey, fp) : (FIELD_LABELS[`${secKey}.${fp}`] || fp.split('.').pop() || '')
    const value = getValue ? getValue(inst, fp, secKey) : null
    const line = fieldToMd(label, value)
    if (line) currentRows.push(line)
  }
  flushGroup()

  const parts: string[] = []
  for (const g of groups) {
    let s = ''
    if (g.header) s += g.header + '\n\n'
    s += g.rows.join('\n')
    parts.push(s)
  }
  return parts.join('\n\n')
}

function d(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}_${String(n.getHours()).padStart(2, '0')}-${String(n.getMinutes()).padStart(2, '0')}-${String(n.getSeconds()).padStart(2, '0')}`
}

export function downloadFile(name: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
