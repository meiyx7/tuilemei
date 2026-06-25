import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import pkg from "./package.json";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// 构建时间戳，用于区分缓存版本
const BUILD_TIME = new Date().toISOString();

/**
 * 自定义 Vite 插件：构建后替换 dist/sw.js 中的 __SW_VERSION__ 占位符为 package.json 版本号
 * 这样每次发版（package.json version 变更）SW 缓存名自动变化，无需手动维护
 */
function replaceSwVersion() {
  return {
    name: "replace-sw-version",
    apply: "build" as const,
    closeBundle() {
      const swPath = resolve(process.cwd(), "dist", "sw.js");
      try {
        const content = readFileSync(swPath, "utf-8");
        writeFileSync(swPath, content.replace(/__SW_VERSION__/g, pkg.version));
        console.log(`[sw] injected version: ${pkg.version}`);
      } catch {
        console.warn("[sw] dist/sw.js not found, skip version injection");
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths(),
    replaceSwVersion(),
  ],
})
