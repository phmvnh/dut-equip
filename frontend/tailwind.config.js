/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Phong cách Apple — ưu tiên SF Pro của hệ thống trên iOS/macOS
        sf: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'SF Pro Text', 'Inter', 'sans-serif'],
      },
      colors: {
        // Apple Action Blue — màu tương tác duy nhất cho giao diện mobile
        action: {
          DEFAULT: '#0066cc',
          press: '#0055b3',
        },
        parchment: '#f5f5f7',
        ink: '#1d1d1f',
      },
    },
  },
  plugins: [],
}
