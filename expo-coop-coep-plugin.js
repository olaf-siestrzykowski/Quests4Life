/**
 * Expo dev-server plugin that adds the Cross-Origin-Isolation headers
 * required by expo-sqlite's WebAssembly worker (SharedArrayBuffer).
 */
module.exports = function coopCoepPlugin(app) {
  app.use((_req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
  });
};
