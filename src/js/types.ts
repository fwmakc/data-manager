export interface Instance {
  name: string
  tags: string[]
  aliases: string[]
  [key: string]: any
}

export interface ActionMatch {
  field: string
  value: string
  data: string
}

export interface Action {
  name: string
  method: 'url' | 'buffer' | 'file'
  data?: string | null
  filename?: string
  match?: ActionMatch[]
}

export type Actions = Action[][]
export type Labels = Record<string, string>

export interface Section {
  key: string
  label: string
}

export interface Field {
  path: string
  key: string
  value: any
}

export interface PanelEntry {
  id: string
  row: number
  col: number
  rowSpan?: number
  colSpan?: number
}

export interface PanelLayout {
  left: PanelEntry[]
  right: PanelEntry[]
}

export interface VisiblePanels {
  sections: boolean
  tags: boolean
  filter: boolean
  list: boolean
  export: boolean
  projects: boolean
}
