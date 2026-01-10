import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'restructure-dist',
      closeBundle() {
        // 创建admin目录并复制文件
        const adminHtml = 'dist/src/pages/admin/index.html'
        const adminDir = 'dist/admin'

        if (fs.existsSync(adminHtml)) {
          // 创建admin目录
          if (!fs.existsSync(adminDir)) {
            fs.mkdirSync(adminDir, { recursive: true })
          }

          // 读取admin HTML
          let content = fs.readFileSync(adminHtml, 'utf-8')

          // 获取实际生成的admin JS文件名
          const adminAssetsDir = 'dist/assets/admin'
          const adminJsFile = fs.readdirSync(adminAssetsDir).find(f => f.startsWith('index-'))

          if (adminJsFile) {
            // 替换script路径 - 修正为assets/admin子目录
            content = content.replace(/\.\/main\.ts/, `/assets/admin/${adminJsFile}`)
          }

          // 写入到admin目录
          fs.writeFileSync(`${adminDir}/index.html`, content)
          console.log('✓ Admin HTML copied to dist/admin/index.html')
        }
      }
    }
  ],

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
        'index': resolve(__dirname, 'src/pages/index/index.html'),
        'login': resolve(__dirname, 'src/pages/login/index.html'),
        'register': resolve(__dirname, 'src/pages/register/index.html'),
        'node': resolve(__dirname, 'src/pages/node/index.html'),
        'shop': resolve(__dirname, 'src/pages/shop/index.html'),
        'ticket': resolve(__dirname, 'src/pages/ticket/index.html'),
        'profile': resolve(__dirname, 'src/pages/profile/index.html'),
        // Admin page
        'admin/index': resolve(__dirname, 'src/pages/admin/index.html'),
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
