import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // 将大型依赖分离到单独的chunk
          'vendor-react': ['react', 'react-dom'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-ml': ['onnxruntime-web', '@tensorflow/tfjs'],
          'vendor-ui': ['framer-motion', 'lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-slider', '@radix-ui/react-switch'],
          'vendor-utils': ['zustand', 'clsx', 'tailwind-merge']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'onnxruntime-web',
      'zustand'
    ],
  },
});