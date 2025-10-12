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
};

export default nextConfig;
