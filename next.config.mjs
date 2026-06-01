/**
 * OneDrive virtualises freshly-written files in the project folder
 * (turns them into "online-only" reparse points within milliseconds),
 * which destroys the Next.js dev cache. See
 * `scripts/ensure-next-junction.mjs` — the `.next/` folder is
 * symlinked to `%TEMP%/next-geo-course-dist/` so the build cache
 * lives outside OneDrive's sync scope. The link is created
 * automatically by the `predev` / `prebuild` hooks in package.json.
 *
 * Webpack's filesystem cache is also disabled in dev because
 * OneDrive can still race on the .pack.gz files even outside the
 * project, and they're cheap enough to rebuild.
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
