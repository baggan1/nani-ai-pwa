import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        success: "success.html",
        cancel: "cancel.html"
      }
    }
  }
});
