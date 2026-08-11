/// <reference types="vite/client" />
import type { Instance, Actions, Labels, Section } from './types'

const dataModules = import.meta.glob('../../projects/*.json', { eager: true }) as Record<string, { default: any }>

export const DATA: Instance[] = Object.values(dataModules)
  .map(m => m.default)
  .sort((a, b) => a.name.localeCompare(b.name))

import actionsJson from '../../config/actions.json'
import labelsJson from '../../config/labels.json'

export const ACTIONS: Actions = actionsJson as Actions
export const LABELS: Labels = labelsJson as Labels
export const LABEL_ORDER: string[] = Object.keys(LABELS)

export function sortFieldsByLabels(fields: string[]): string[] {
  const order = LABEL_ORDER
  return [...fields].sort((a, b) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib)
  })
}

export const SECTIONS: Section[] = (() => {
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
})()

export const FIELD_LABELS: Record<string, string> = (() => {
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
})()

export const SUB_LABELS: Record<string, string> = (() => {
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
})()
