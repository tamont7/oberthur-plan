import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";

export default defineConfig({
  // Même import ESM en développement et en production ; chargement différé du moteur.
  plugins: [react(), cesium({ rebuildCesium: true })],
});
