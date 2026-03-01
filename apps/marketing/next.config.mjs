/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@levelset/design-tokens', '@levelset/shared', '@levelset/notifications'],
};

export default nextConfig;
