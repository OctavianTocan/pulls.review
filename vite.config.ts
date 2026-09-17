import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import { alias } from './vite.config.shared'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
  ],
  resolve: {
    alias,
  },
})
