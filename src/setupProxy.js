// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/idx2',
    createProxyMiddleware({
      target: 'https://testnet-api.algonode.cloud',
      changeOrigin: true,
      pathRewrite: {
        '^/idx2': '/idx2', // Keep the /idx2 path
      },
    })
  );
};
