// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          "react-data-testid",
          "babel-plugin-react-compiler",
          ...(process.env.NODE_ENV === "production"
            ? ["babel-plugin-react-remove-data-test-id-attribute"]
            : []),
        ].filter(Boolean),
      },
    }),
  ],
});
