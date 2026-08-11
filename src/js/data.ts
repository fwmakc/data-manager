import type { Instance, Actions, Labels, Section } from './types'

export let DATA: Instance[] = []
export let ACTIONS: Actions = []
export let LABELS: Labels = {}
export let LABEL_ORDER: string[] = []
export let SECTIONS: Section[] = []
export let FIELD_LABELS: Record<string, string> = {}
export let SUB_LABELS: Record<string, string> = {}

export function initProjectData(data: Instance[], actions: Actions, labels: Labels): void {
  DATA = data.sort((a, b) => a.name.localeCompare(b.name))
  ACTIONS = actions
  LABELS = labels
  LABEL_ORDER = Object.keys(LABELS)
  SECTIONS = buildSections()
  FIELD_LABELS = buildFieldLabels()
  SUB_LABELS = buildSubLabels()
}

function buildSections(): Section[] {
  const skip = new Set(['name', 'tags'])
  const sections: Section[] = []
  const allKeys = Object.keys(LABELS)
  for (const key of allKeys) {
    if (skip.has(key)) continue
    const dots = (key.match(/\./g) || []).length
    if (dots === 0) {
      sections.push({ key, label: LABELS[key] })
    }
  }
  return sections
}

function buildFieldLabels(): Record<string, string> {
  const labels: Record<string, string> = {}
  const allKeys = Object.keys(LABELS)
  for (const key of allKeys) {
    const dots = (key.match(/\./g) || []).length
    if (dots === 1) {
      const isPrefix = allKeys.some(other => other !== key && other.startsWith(key + '.'))
      if (!isPrefix) labels[key] = LABELS[key]
    }
  }
  return labels
}

function buildSubLabels(): Record<string, string> {
  const labels: Record<string, string> = {}
  const allKeys = Object.keys(LABELS)
  for (const key of allKeys) {
    const dots = (key.match(/\./g) || []).length
    if (dots === 1) {
      const isPrefix = allKeys.some(other => other !== key && other.startsWith(key + '.'))
      if (isPrefix) labels[key] = LABELS[key]
    }
  }
  return labels
}

export function sortFieldsByLabels(fields: string[]): string[] {
  const order = LABEL_ORDER
  return [...fields].sort((a, b) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib)
  })
}
