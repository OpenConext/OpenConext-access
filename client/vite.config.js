import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), svgr(
        {
            // svgr options: https://react-svgr.com/docs/options/
            svgrOptions: { exportType: "default", ref: true, svgo: false, titleProp: true },
            include: "**/*.svg",
        }
    )],
    build: {
        chunkSizeWarningLimit: 2000
    },
    server: {
        port: 3002,
        open: true,
        proxy: {
            '/api/v1': {
                target: 'http://localhost:8886',
                changeOrigin: false,
                secure: false
            },
            '/config': {
                target: 'http://localhost:8886',
                changeOrigin: false,
                secure: false
            }
        }

    },
})
