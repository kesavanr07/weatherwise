const vitestConfig = {
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
};

export default vitestConfig;
