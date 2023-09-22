import { defineConfig } from "astro/config";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  site: "http://tts-feed.larryhudson.io",
  server: {
    port: 3000,
  },
});
