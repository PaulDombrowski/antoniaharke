import { defineConfig } from "astro/config";

const base = process.env.BASE;

export default defineConfig({
  output: "static",
  site: process.env.SITE,
  base: base && base !== "/" ? base : undefined,
});
