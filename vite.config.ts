import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('@mui/x-date-pickers')) return 'vendor-mui-date-pickers';
            if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
            if (id.includes('firebase/auth') || id.includes('@firebase/auth')) return 'vendor-firebase-auth';
            if (id.includes('firebase/firestore') || id.includes('@firebase/firestore'))
              return 'vendor-firebase-firestore';
            if (id.includes('firebase/storage') || id.includes('@firebase/storage'))
              return 'vendor-firebase-storage';
            if (id.includes('firebase')) return 'vendor-firebase-core';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          }
        },
      },
    },
  },
})
