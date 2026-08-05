import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons.svg"],
      manifest: {
        name: "Race Timing Calculator",
        short_name: "Race Timing",
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
    include: ["src/**/*.test.ts"],
    exclude: ["e2e/**"],
    setupFiles: ["src/test-setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts"],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 83,
      },
    },
  },
});
