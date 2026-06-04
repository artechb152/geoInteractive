/**
 * OneDrive virtualises freshly-written files in the project folder
 * (turns them into "online-only" reparse points within milliseconds),
 * which can corrupt the Next.js dev cache. We mitigate that by
 * disabling Webpack's filesystem cache in dev (below) — the .pack.gz
 * files are what OneDrive raced on, and they're cheap enough to
 * rebuild every time.
 *
 * NOTE: relocating `.next/` outside the project via a junction was
 * tried and abandoned — it breaks App Router dev (compiled output in
 * %TEMP% can't resolve `node_modules`, so every request crashes with
 * `Cannot find module 'react/jsx-runtime'`). See
 * `scripts/remove-next-junction.mjs` for the full rationale. If the
 * cache-disable isn't enough, move the project out of OneDrive.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',

  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
