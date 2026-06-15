// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// Configuración para Cloudflare Pages (SSR Habilitado)
// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare()
});