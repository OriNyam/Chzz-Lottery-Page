import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/proxy/chzzkBase": {
        target: "https://api.chzzk.naver.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/chzzkBase/, ""),
      },
      "/api/proxy/gameBase": {
        target: "https://comm-api.game.naver.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/gameBase/, "/nng_main"),
      },
    },
  },
});
