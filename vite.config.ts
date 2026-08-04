import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons.svg"],
      manifest: {
        name: "Crew Timing Calculator",
        short_name: "Crew Timing",
        description:
          "Convert finish-judge gaps into CrewTimer chronological timestamps",
        theme_color: "#1a365d",
        background_color: "#f7fafc",
        display: "standalone",
        start_url: "./",
        icons: [
          {
            src: "icons.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    globals: true,
    environment: "node",
  },
});
