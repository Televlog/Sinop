/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  output: isGithubPages ? 'export' : undefined,
  basePath: isGithubPages ? '/Sinop' : '',
  assetPrefix: isGithubPages ? '/Sinop/' : '',
  trailingSlash: isGithubPages ? true : false,
  images: {
    unoptimized: isGithubPages, // required for static export
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleapis.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: 'logo.clearbit.com' },
      { protocol: 'https', hostname: '**.plaid.com' },
    ],
  },
};

module.exports = nextConfig;
