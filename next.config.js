/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/demandas/:path*', destination: '/rdms', permanent: false },
      { source: '/importar', destination: '/rdms', permanent: false },
    ];
  },
};

module.exports = nextConfig;
