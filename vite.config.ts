import { defineConfig, type Plugin } from 'vite'
import { resolve } from 'path'
import { viteSingleFile } from 'vite-plugin-singlefile'

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

export default defineConfig({
  root: 'src',
  base: './',
  plugins: [viteSingleFile(), removeModuleType()],
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
