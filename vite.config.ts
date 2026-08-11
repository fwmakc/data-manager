import { defineConfig, type Plugin } from 'vite'
import { resolve } from 'path'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readdirSync, statSync, readFileSync, mkdirSync, writeFileSync, rmSync, existsSync, cpSync, renameSync } from 'fs'
import { join, extname } from 'path'
import { unzipSync } from 'fflate'

function removeModuleType(): Plugin {
  return {
    name: 'remove-module-type',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(/<script type="module"/g, '<script')
    },
  }
}

function serveProjects(): Plugin {
  const projectsDir = resolve(__dirname, 'projects')
  return {
    name: 'serve-projects',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || ''
        const url = rawUrl.split('?')[0] || ''

        if (req.method === 'POST' && url === '/projects/rename') {
          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', () => {
            try {
              const { from, to } = JSON.parse(body)
              if (!from || !to) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: false, error: 'Укажите from и to' }))
                return
              }
              const src = join(projectsDir, from)
              const dst = join(projectsDir, to)
              if (!existsSync(src)) {
                res.statusCode = 404
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: false, error: 'Проект "' + from + '" не найден' }))
                return
              }
              if (existsSync(dst)) {
                res.statusCode = 409
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: false, error: 'Проект "' + to + '" уже существует' }))
                return
              }
              renameSync(src, dst)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: e.message }))
            }
          })
          return
        }

        if (req.method === 'POST' && url === '/projects/delete') {
          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', () => {
            try {
              const { name } = JSON.parse(body)
              if (!name) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: false, error: 'Укажите name' }))
                return
              }
              const dir = join(projectsDir, name)
              if (!existsSync(dir)) {
                res.statusCode = 404
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: false, error: 'Проект "' + name + '" не найден' }))
                return
              }
              rmSync(dir, { recursive: true })
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: e.message }))
            }
          })
          return
        }

        if (req.method === 'POST' && url === '/projects/import') {
          let body = Buffer.alloc(0)
          req.on('data', (chunk: Buffer) => { body = Buffer.concat([body, chunk]) })
          req.on('end', () => {
            try {
              const queryName = (rawUrl.split('?')[1] || '').split('=')[1] || 'import'
              const tmpDir = join(projectsDir, '__import_tmp_' + Date.now() + '__')
              mkdirSync(tmpDir, { recursive: true })

              const unzipped = unzipSync(new Uint8Array(body))
              for (const [path, data] of Object.entries(unzipped) as [string, Uint8Array][]) {
                if (path.endsWith('/')) continue
                const filePath = join(tmpDir, path)
                mkdirSync(join(filePath, '..'), { recursive: true })
                writeFileSync(filePath, data)
              }

              let sourceDir = tmpDir
              const hasRoot = readdirSync(tmpDir).some(e => {
                return e === 'config' || e === 'notes'
              })
              if (!hasRoot) {
                const subdirs = readdirSync(tmpDir).filter(e => statSync(join(tmpDir, e)).isDirectory())
                const found = subdirs.find(e => {
                  const contents = readdirSync(join(tmpDir, e))
                  return contents.includes('config') || contents.includes('notes')
                })
                if (found) {
                  sourceDir = join(tmpDir, found)
                } else {
                  rmSync(tmpDir, { recursive: true })
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ ok: false, error: 'В архиве нет папок config/ и notes/' }))
                  return
                }
              }

              let projectName = queryName
              if (existsSync(join(projectsDir, projectName))) {
                let i = 1
                while (existsSync(join(projectsDir, projectName + '_' + i))) i++
                projectName = projectName + '_' + i
              }

              const destDir = join(projectsDir, projectName)
              cpSync(sourceDir, destDir, { recursive: true })
              rmSync(tmpDir, { recursive: true })

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true, project: projectName }))
            } catch (e: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: e.message }))
            }
          })
          return
        }

        if (!url.startsWith('/projects') || url.includes('/@')) { next(); return }

        const filePath = resolve(projectsDir, '.' + url.slice('/projects'.length))
        try {
          if (statSync(filePath).isFile()) {
            const ext = extname(filePath)
            const mime: Record<string, string> = {
              '.json': 'application/json; charset=utf-8',
            }
            res.setHeader('Content-Type', mime[ext] || 'application/octet-stream')
            res.end(readFileSync(filePath))
            return
          }
          if (statSync(filePath).isDirectory() && url.endsWith('/')) {
            const entries = readdirSync(filePath)
              .filter(e => {
                const st = statSync(join(filePath, e))
                return st.isDirectory() || e.endsWith('.json')
              })
              .sort()
            let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>'
            for (const item of entries) {
              const st = statSync(join(filePath, item))
              if (st.isDirectory()) {
                html += `<a href="${item}/">${item}/</a><br>`
              } else {
                html += `<a href="${item}">${item}</a><br>`
              }
            }
            html += '</body></html>'
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(html)
            return
          }
        } catch (_e) {}
        next()
      })
    },
  }
}

export default defineConfig({
  root: 'src',
  base: './',
  plugins: [serveProjects(), viteSingleFile(), removeModuleType()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/js'),
    },
  },
})
