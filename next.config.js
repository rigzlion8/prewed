/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Increase API timeout for large file uploads
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Configure API routes timeout
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '200mb',
    },
  },
}

module.exports = nextConfig
