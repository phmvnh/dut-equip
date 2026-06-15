import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'DUT Equip — Quản lý Thiết bị',
        short_name: 'DUT Equip',
        description: 'Đặt mượn và theo dõi thiết bị của ĐH Bách Khoa Đà Nẵng',
        lang: 'vi',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Chỉ precache app shell (asset tĩnh) — KHÔNG cache response API để tránh dữ liệu cũ
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'pwa-*.png', 'apple-touch-icon.png'],
        // Logo gốc dung lượng lớn — không precache, chỉ tải khi cần
        globIgnores: ['**/logo_dut_equip*.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      // PWA chỉ bật ở bản build (npm run build && preview) — không can thiệp dev
      devOptions: { enabled: false },
    }),
  ],
  // sockjs-client (CommonJS legacy) tham chiếu `global` của Node — browser không có,
  // map sang globalThis để khỏi crash khi import @stomp/stompjs + sockjs-client
  define: {
    global: 'globalThis',
  },
})
