// Polyfill for Cloudflare Workers - MUST run before any imports
if (typeof global !== 'undefined' && !(global).http) {
  global.http = {
    validateHeaderName: (name) => {
      if (typeof name !== 'string' || name.length === 0) {
        throw new TypeError('Header name must be a non-empty string');
      }
      if (/[^\t\x20-\x7e\x80-\xff]/.test(name)) {
        throw new TypeError(`Invalid character in header name: "${name}"`);
      }
    },
    validateHeaderValue: (name, value) => {
      if (value === undefined || value === null) {
        throw new TypeError(`Invalid value for header "${name}"`);
      }
    }
  };
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Transpile Ant Design packages to fix ESM module resolution issues
  transpilePackages: [
    'antd',
    '@ant-design/icons',
    '@ant-design/icons-svg',
    'rc-util',
    'rc-pagination',
    'rc-picker',
    'rc-notification',
    'rc-tooltip',
    'rc-tree',
    'rc-table',
    '@mui/x-data-grid',
    '@mui/x-data-grid-pro',
    '@mui/x-data-grid-premium',
    '@mui/x-date-pickers',
  ],
  // Subdomain routing for roadmap.levelset.io
  async rewrites() {
    return {
      beforeFiles: [
        // roadmap.levelset.io/ -> /roadmap
        {
          source: '/',
          has: [{ type: 'host', value: 'roadmap.levelset.io' }],
          destination: '/roadmap',
        },
        // roadmap.levelset.io/:path* -> /roadmap/:path*
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'roadmap.levelset.io' }],
          destination: '/roadmap/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
