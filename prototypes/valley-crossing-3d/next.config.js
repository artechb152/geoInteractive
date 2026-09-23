/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: { unoptimized: true },
  // Built as a static bundle served from /embeds/valley-crossing-3d/ inside
  // the host site (not from the domain root), so asset URLs must be
  // rooted there too — otherwise /_next/* 404s against the host's own root.
  basePath: '/embeds/valley-crossing-3d',
  assetPrefix: '/embeds/valley-crossing-3d/',
};

module.exports = nextConfig;
