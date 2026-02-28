module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@db': './src/db',
            '@store': './src/store',
            '@features': './src/features',
            '@components': './src/components',
            '@lib': './src/lib',
          },
        },
      ],
    ],
  };
};
