import { DATA, SECTIONS, FIELD_LABELS, SUB_LABELS, sortFieldsByLabels } from './data'
import { selectedInstances, activeSections, showToast } from './state'
import { getSectionFields, fmtCellValue, downloadFile, fieldToMd, buildGroupMd } from './helpers'
import { clipboardCopy } from './copy'
import * as XLSX from 'xlsx'

function getFlatFields(): { insts: typeof DATA; structure: { sectionKey: string; label: string; fields: string[] }[] } {
  const insts = selectedInstances.size > 0
    ? DATA.filter(i => selectedInstances.has(i.name))
    : DATA
  const structure: { sectionKey: string; label: string; fields: string[] }[] = []
  for (const sec of SECTIONS) {
    if (!activeSections.has(sec.key)) continue
    const secFields = new Set<string>()
    for (const inst of insts) {
      getSectionFields(sec.key, inst).forEach(f => secFields.add(f.path))
    }
    const sorted = sortFieldsByLabels([...secFields])
    if (sorted.length === 0) continue
    structure.push({ sectionKey: sec.key, label: sec.label, fields: sorted })
  }
  return { insts, structure }
}

function getFieldLabel(sectionKey: string, fieldPath: string): string {
  if (fieldPath === sectionKey) return ''
  return FIELD_LABELS[sectionKey + '.' + fieldPath] || fieldPath.split('.').pop() || ''
}

function getFieldValue(inst: Record<string, any>, sectionKey: string, fieldPath: string): any {
  const fields = getSectionFields(sectionKey, inst)
  const field = fields.find(f => f.path === fieldPath)
  return field ? field.value : null
}

function buildTableRows(formatRow: (cols: string[]) => string): string[] | null {
  const result = getFlatFields()
  const { insts, structure } = result
  if (!insts.length) return null
  const rows = formatRow(['', ...insts.map(i => i.name)])
  const formattedRows: string[] = [rows]
  for (const sec of structure) {
    formattedRows.push(formatRow([sec.label, ...insts.map(() => '')]))
    const parts = new Set<string>()
    for (const fp of sec.fields) {
      const p = fp.split('.')
      if (p.length > 1) parts.add(p[0])
    }
    const sortedParts = [...parts].sort()
    for (const part of sortedParts) {
      const subLabel = SUB_LABELS[sec.sectionKey + '.' + part] || part
      formattedRows.push(formatRow([subLabel, ...insts.map(() => '')]))
      const subFields = sec.fields.filter(f => f.startsWith(part + '.'))
      for (const sf of subFields) {
        const fieldPath = sf.substring(part.length + 1)
        const label = getFieldLabel(sec.sectionKey, sf)
        formattedRows.push(formatRow([label, ...insts.map(inst => fmtCellValue(getFieldValue(inst, sec.sectionKey, sf)))]))
      }
    }
    const topFields = sec.fields.filter(f => !f.includes('.'))
    for (const fp of topFields) {
      const label = getFieldLabel(sec.sectionKey, fp)
      formattedRows.push(formatRow([label, ...insts.map(inst => fmtCellValue(getFieldValue(inst, sec.sectionKey, fp)))]))
    }
  }
  return formattedRows
}

export function exportTable(): void {
  const rows = buildTableRows(cols => '| ' + cols.join(' | ') + ' |')
  if (!rows) return
  let md = rows[0] + '\n'
  md += '| --- | ' + DATA.map(() => '---').join(' | ') + ' |\n'
  for (let i = 1; i < rows.length; i++) md += rows[i] + '\n'
  clipboardCopy(md)
}

export function saveMD(): void {
  const rows = buildTableRows(cols => '| ' + cols.join(' | ') + ' |')
  if (!rows) return
  downloadFile(d() + '.md', rows.join('\n'), 'text/markdown;charset=utf-8')
}

function buildCsvRows(): string[] | null {
  const result = getFlatFields()
  const { insts, structure } = result
  if (!insts.length) return null
  const rows: string[] = ['"";' + insts.map(i => '"' + i.name.replace(/"/g, '""') + '"').join(';')]
  for (const sec of structure) {
    rows.push('"' + sec.label.replace(/"/g, '""') + '"')
    const parts = new Set<string>()
    for (const fp of sec.fields) {
      const p = fp.split('.')
      if (p.length > 1) parts.add(p[0])
    }
    const sortedParts = [...parts].sort()
    for (const part of sortedParts) {
      const subLabel = SUB_LABELS[sec.sectionKey + '.' + part] || part
      rows.push('"' + subLabel.replace(/"/g, '""') + '"')
      const subFields = sec.fields.filter(f => f.startsWith(part + '.'))
      for (const sf of subFields) {
        const fieldPath = sf.substring(part.length + 1)
        const label = getFieldLabel(sec.sectionKey, sf)
        const vals = insts.map(inst => {
          const v = getFieldValue(inst, sec.sectionKey, sf)
          return '"' + fmtCellValue(v).replace(/"/g, '""') + '"'
        })
        rows.push('"' + label.replace(/"/g, '""') + '";' + vals.join(';'))
      }
    }
    const topFields = sec.fields.filter(f => !f.includes('.'))
    for (const fp of topFields) {
      const label = getFieldLabel(sec.sectionKey, fp)
      const vals = insts.map(inst => {
        const v = getFieldValue(inst, sec.sectionKey, fp)
        return '"' + fmtCellValue(v).replace(/"/g, '""') + '"'
      })
      rows.push('"' + label.replace(/"/g, '""') + '";' + vals.join(';'))
    }
  }
  return rows
}

export function saveCSV(): void {
  const rows = buildCsvRows()
  if (!rows) return
  downloadFile(d() + '.csv', '\uFEFF' + rows.join('\n'), 'text/csv;charset=utf-8')
}

export function exportCSV(): void {
  const rows = buildCsvRows()
  if (!rows) return
  clipboardCopy('\uFEFF' + rows.join('\n'))
}

export function exportExcel(): void {
  const rows = buildSheetData()
  if (!rows) return
  clipboardCopy(rows.map(r => r.join('\t')).join('\n'))
}

function buildSheetData(): string[][] | null {
  const result = getFlatFields()
  const { insts, structure } = result
  if (!insts.length) return null
  const rows: string[][] = [['', ...insts.map(i => i.name)]]
  for (const sec of structure) {
    rows.push([sec.label, ...insts.map(() => '')])
    const parts = new Set<string>()
    for (const fp of sec.fields) {
      const p = fp.split('.')
      if (p.length > 1) parts.add(p[0])
    }
    const sortedParts = [...parts].sort()
    for (const part of sortedParts) {
      const subLabel = SUB_LABELS[sec.sectionKey + '.' + part] || part
      rows.push([subLabel, ...insts.map(() => '')])
      const subFields = sec.fields.filter(f => f.startsWith(part + '.'))
      for (const sf of subFields) {
        const fieldPath = sf.substring(part.length + 1)
        const label = getFieldLabel(sec.sectionKey, sf)
        rows.push([label, ...insts.map(inst => fmtCellValue(getFieldValue(inst, sec.sectionKey, sf)))])
      }
    }
    const topFields = sec.fields.filter(f => !f.includes('.'))
    for (const fp of topFields) {
      const label = getFieldLabel(sec.sectionKey, fp)
      rows.push([label, ...insts.map(inst => fmtCellValue(getFieldValue(inst, sec.sectionKey, fp)))])
    }
  }
  return rows
}

export function saveExcel(): void {
  const rows = buildSheetData()
  if (!rows) return
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '\u0414\u043E\u0441\u0442\u0443\u043F\u044B')
  XLSX.writeFile(wb, d() + '.xlsx')
}

export function saveODS(): void {
  const rows = buildSheetData()
  if (!rows) return
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '\u0414\u043E\u0441\u0442\u0443\u043F\u044B')
  XLSX.writeFile(wb, d() + '.ods')
}

export function printContent(): void {
  const main = document.querySelector('.main')!
  const win = window.open('', '_blank')!
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title> </title>')
  win.document.write('<style>')
  win.document.write('body{font-family:Segoe UI,sans-serif;padding:20px;color:#000}')
  win.document.write('.section-block{margin-bottom:16px;border:1px solid #ccc;page-break-inside:avoid}')
  win.document.write('.section-title{padding:6px 12px;font-size:13px;font-weight:600;color:#333;background:#f5f5f5;border-bottom:1px solid #ccc}')
  win.document.write('.section-body{padding:6px 0}')
  win.document.write('.field-row{display:flex;padding:3px 12px;font-size:13px}')
  win.document.write('.field-key{color:#555;min-width:200px;flex-shrink:0}')
  win.document.write('.field-value{font-family:Consolas,monospace;color:#000}')
  win.document.write('.sub-header{padding:4px 12px 2px;font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.5px}')
  win.document.write('.compare-table-wrap{overflow-x:auto;margin-bottom:16px}')
  win.document.write('.compare-table{border-collapse:collapse;font-size:8px;width:100%}')
  win.document.write('.compare-table th{background:#eee;padding:2px 4px;text-align:left;font-weight:600;border-bottom:2px solid #333}')
  win.document.write('.compare-table td{padding:2px 4px;border-bottom:1px solid #ddd;white-space:normal;word-break:break-all}')
  win.document.write('.compare-table .section-row td{background:#f5f5f5;font-weight:600;color:#333}')
  win.document.write('.compare-table .sub-group-row td{color:#666;background:#fafafa;font-size:8px}')
  win.document.write('.compare-table .cell-value{font-family:Consolas,monospace;font-size:8px}')
  win.document.write('.compare-table .field-path{color:#555;white-space:normal}')
  win.document.write('@media print{body{margin:0}@page{size:landscape;margin:10mm}.compare-table{font-size:7px}.compare-table th,.compare-table td{padding:1px 3px;font-size:7px}}')
  win.document.write('.action-bar,.copy-section-btn,.action-row{display:none !important}')
  win.document.write('</style></head><body>')
  win.document.write('<body>')
  win.document.write(main.innerHTML)
  win.document.write('</body></html>')
  win.document.close()
  setTimeout(() => win.print(), 300)
}

export function exportSectionsSelected(): void {
  const insts = DATA.filter(i => selectedInstances.has(i.name))
  if (!insts.length) return
  const blocks: string[] = []
  for (const sec of SECTIONS) {
    if (!activeSections.has(sec.key)) continue
    const allFields = new Set<string>()
    for (const inst of insts) {
      getSectionFields(sec.key, inst).forEach(f => allFields.add(f.path))
    }
    const sorted = sortFieldsByLabels([...allFields])
    if (sorted.length === 0) continue
    blocks.push('# ' + sec.label)
    for (const inst of insts) {
      const md = buildGroupMd(sec.key, sorted, inst, (secKey, fp) => {
        if (fp === secKey) return ''
        return FIELD_LABELS[secKey + '.' + fp] || fp.split('.').pop() || ''
      }, (inst2, fp, secKey) => {
        const fields = getSectionFields(sec.key, inst2)
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

function d(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}_${String(n.getHours()).padStart(2, '0')}-${String(n.getMinutes()).padStart(2, '0')}-${String(n.getSeconds()).padStart(2, '0')}`
}
