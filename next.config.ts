export default {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'thirdwx.qlogo.cn' },
      { protocol: 'https', hostname: '*.qlogo.cn' },
    ],
  },
};
