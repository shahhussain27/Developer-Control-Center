/** @type {import('next').NextConfig} */
module.exports = {
  output: 'export',
  distDir: process.env.NODE_ENV === 'production' ? '../app' : '.next',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Allow SVG files imported from JS/TS to become React components via @svgr/webpack.
    // The issuer regex restricts this only to JS/TS module imports — CSS and other
    // asset consumers still get the raw URL via the default file-loader.
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            // Preserve viewBox for reliable sizing via width/height props
            svgoConfig: {
              plugins: [{ name: 'removeViewBox', active: false }],
            },
          },
        },
      ],
    })
    return config
  },
}

