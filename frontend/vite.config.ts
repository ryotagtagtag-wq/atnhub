import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-functions',
      writeBundle() {
        const srcDir = path.resolve(__dirname, '../functions')
        const destDir = path.resolve(__dirname, '../dist/functions')
        if (fs.existsSync(srcDir)) {
          fs.cpSync(srcDir, destDir, { recursive: true })
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
})
