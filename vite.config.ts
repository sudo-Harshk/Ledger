import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui-vendor': ['@radix-ui/react-slot', 'class-variance-authority'],
          // Feature chunks
          'auth': ['./src/contexts/AuthContext', './src/hooks/useAuth'],
          'dashboards': ['./src/pages/StudentDashboard', './src/pages/TeacherDashboard'],
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB for better flexibility
  }
});
