import { initProjectData } from './data'
import type { Instance, Actions, Labels } from './types'
import { zipSync, unzipSync } from 'fflate'
import { downloadFile } from './helpers'
import { currentProject, setCurrentProject } from './project-name'

const PROJECTS_BASE = './projects'
const STORAGE_KEY = 'am_project'

export { currentProject } from './project-name'

export let projectList: string[] = []

export function loadProjectName(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return raw
  } catch (_e) {}
  return ''
}

export async function loadProjectList(): Promise<string[]> {
  try {
    const res = await fetch(PROJECTS_BASE + '/')
    const html = await res.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const links = doc.querySelectorAll('a')
    const dirs: string[] = []
    links.forEach(a => {
      const href = a.getAttribute('href')
      if (!href) return
      const match = href.match(/^([^\/]+)\/$/)
      if (match && match[1] !== '..') dirs.push(match[1])
    })
    projectList = dirs.sort()
  } catch (_e) {
    projectList = []
  }
  return projectList
}

export async function loadProject(name: string): Promise<void> {
  const base = PROJECTS_BASE + '/' + encodeURIComponent(name)

  const [notesRes, actionsRes, labelsRes] = await Promise.all([
    fetch(base + '/notes/'),
    fetch(base + '/config/actions.json'),
    fetch(base + '/config/labels.json'),
  ])

  const actions: Actions = await actionsRes.json()
  const labels: Labels = await labelsRes.json()

  const notesHtml = await notesRes.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(notesHtml, 'text/html')
  const links = doc.querySelectorAll('a')

  const noteFiles: string[] = []
  links.forEach(a => {
    const href = a.getAttribute('href')
    if (!href) return
    if (href.endsWith('.json')) noteFiles.push(href)
  })

  const notePromises = noteFiles.map(f => fetch(base + '/notes/' + f).then(r => r.json()))
  const notes = await Promise.all(notePromises)
  const data: Instance[] = notes.filter(n => n && n.name)

  initProjectData(data, actions, labels)
  setCurrentProject(name)
  localStorage.setItem(STORAGE_KEY, name)
}

export async function initProject(): Promise<void> {
  await loadProjectList()
  if (projectList.length === 0) {
    initProjectData([], [], {})
    setCurrentProject('')
    return
  }
  const saved = loadProjectName()
  if (saved && projectList.includes(saved)) {
    await loadProject(saved)
  } else {
    await loadProject(projectList[0])
  }
}

export async function switchProject(name: string): Promise<void> {
  if (name === currentProject) return
  await loadProject(name)
}

export async function exportProject(): Promise<void> {
  if (!currentProject) return
  const base = PROJECTS_BASE + '/' + encodeURIComponent(currentProject)

  const files: { path: string; data: Uint8Array }[] = []

  async function collectDir(dir: string, prefix: string): Promise<void> {
    const res = await fetch(base + '/' + dir + '/')
    const html = await res.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const links = doc.querySelectorAll('a')
    for (const a of links) {
      const href = a.getAttribute('href')
      if (!href) continue
      if (href.endsWith('.json')) {
        const fileRes = await fetch(base + '/' + dir + '/' + href)
        const buf = await fileRes.arrayBuffer()
        files.push({ path: prefix + href, data: new Uint8Array(buf) })
      } else {
        const match = href.match(/^([^\/]+)\/$/)
        if (match && match[1] !== '..') {
          await collectDir(dir + '/' + match[1], prefix + match[1] + '/')
        }
      }
    }
  }

  await collectDir('config', 'config/')
  await collectDir('notes', 'notes/')

  const zipped = zipSync(Object.fromEntries(files.map(f => [f.path, f.data])))
  downloadFile(currentProject + '.zip', zipped, 'application/zip')
}

let onProjectListChanged: (() => void) | null = null

export function setOnProjectListChanged(fn: (() => void) | null): void {
  onProjectListChanged = fn
}

function importProjectZip(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.zip'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const unzipped = unzipSync(new Uint8Array(buf))

      let fileEntries: Record<string, Uint8Array> = {}
      for (const [path, data] of Object.entries(unzipped)) {
        if ((path as string).endsWith('/')) continue
        fileEntries[path as string] = data as Uint8Array
      }

      let hasRoot = Object.keys(fileEntries).some(p => p.startsWith('config/') || p.startsWith('notes/'))
      if (!hasRoot) {
        const dirs = new Set(Object.keys(fileEntries).map(p => p.split('/')[0]))
        for (const dir of dirs) {
          const contents = Object.keys(fileEntries).filter(p => p.startsWith(dir + '/'))
          if (contents.some(p => {
            const rel = p.slice(dir.length + 1)
            return rel.startsWith('config/') || rel.startsWith('notes/')
          })) {
            fileEntries = Object.fromEntries(
              contents.map(p => [p.slice(dir.length + 1), fileEntries[p]])
            )
            hasRoot = true
            break
          }
        }
      }

      if (!hasRoot) {
        alert('В архиве нет папок config/ и notes/')
        return
      }

      const name = file.name.replace(/\.zip$/i, '')
      const base64Files: Record<string, string> = {}
      for (const [path, data] of Object.entries(fileEntries)) {
        let binary = ''
        const bytes = data as Uint8Array
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        base64Files[path] = btoa(binary)
      }

      const res = await fetch('./projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, files: base64Files }),
      })
      const result = await res.json()
      if (!result.ok) {
        alert('Ошибка импорта: ' + (result.error || 'неизвестная ошибка'))
        return
      }
      await loadProjectList()
      if (onProjectListChanged) onProjectListChanged()
    } catch (e) {
      alert('Ошибка импорта: ' + (e as Error).message)
    }
  }
  input.click()
}

export { importProjectZip }

async function renameProject(oldName: string): Promise<void> {
  const newName = prompt('Новое имя проекта:', oldName)
  if (!newName || newName === oldName) return
  try {
    const res = await fetch('./projects/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: oldName, to: newName }),
    })
    const result = await res.json()
    if (!result.ok) {
      alert(result.error || 'Ошибка переименования')
      return
    }
    if (currentProject === oldName) {
      setCurrentProject(newName)
      localStorage.setItem('am_project', newName)
    }
    await loadProjectList()
    if (onProjectListChanged) onProjectListChanged()
  } catch (e) {
    alert('Ошибка: ' + (e as Error).message)
  }
}

async function deleteProject(name: string): Promise<void> {
  if (!confirm('Удалить проект "' + name + '"?')) return
  try {
    const res = await fetch('./projects/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const result = await res.json()
    if (!result.ok) {
      alert(result.error || 'Ошибка удаления')
      return
    }
    if (currentProject === name) {
      await loadProjectList()
      if (projectList.length > 0) {
        await loadProject(projectList[0])
      } else {
        setCurrentProject('')
        initProjectData([], [], {})
      }
    } else {
      await loadProjectList()
    }
    if (onProjectListChanged) onProjectListChanged()
  } catch (e) {
    alert('Ошибка: ' + (e as Error).message)
  }
}

export { renameProject, deleteProject }
