import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // sockjs-client (CommonJS legacy) tham chiếu `global` của Node — browser không có,
  // map sang globalThis để khỏi crash khi import @stomp/stompjs + sockjs-client
  define: {
    global: 'globalThis',
  },
})
