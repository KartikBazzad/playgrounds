const withMDX = require('@next/mdx')()

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = withMDX(nextConfig)
