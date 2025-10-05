module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'index.js',
    '!**/node_modules/**',
    '!**/build/**',
    '!**/coverage/**'
  ],
  testTimeout: 30000,
  verbose: true
};
