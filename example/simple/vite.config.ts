import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import * as path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({ jsxRuntime: "classic" })],
  root: "src",
  resolve: {
    alias: {
      "@kseniass/react-flow-editor": path.resolve("../../src")
    }
  },
  build: {
    outDir: "../../../docs/simple"
  }
})
