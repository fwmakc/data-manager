export interface Instance {
  name: string
  status: string[]
  aliases: string[]
  [key: string]: any
}

export interface Action {
  name: string
  method: 'url' | 'buffer'
  data: string
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
  list: boolean
  export: boolean
}
