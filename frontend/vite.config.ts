import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // User pages
        index: resolve(__dirname, 'src/pages/index/index.html'),
        login: resolve(__dirname, 'src/pages/login/index.html'),
        register: resolve(__dirname, 'src/pages/register/index.html'),
        node: resolve(__dirname, 'src/pages/node/index.html'),
        shop: resolve(__dirname, 'src/pages/shop/index.html'),
        ticket: resolve(__dirname, 'src/pages/ticket/index.html'),
        profile: resolve(__dirname, 'src/pages/profile/index.html'),
        // Admin page
        admin: resolve(__dirname, 'src/pages/admin/index.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    target: 'es2015',
  },

  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  preview: {
    port: 5173,
    host: true,
  },
})
