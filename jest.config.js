// Tests de logique pure (node). Bypasse le pipeline Babel React Native
// (configFile/babelrc: false). Les tests de composants RN (jest-expo + RNTL)
// seront ajoutés dans un projet Jest dédié quand on testera l'UI.
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
};
