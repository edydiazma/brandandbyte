import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: "https://brandandbyte.pages.dev",
  integrations: [tailwind()],
  output: 'static', 
  adapter: cloudflare(),
});
