/**
 * Test setup.
 *
 * jsdom is configured in vitest.config.ts. This file exists so the environment
 * has a single, explicit definition rather than relying on defaults, and so
 * there is one obvious place to add global test configuration later.
 */

// Fail a test that leaves an unhandled rejection behind — an async error that is
// swallowed is exactly the kind of bug that hides in a storage layer.
process.on('unhandledRejection', (reason) => {
  throw reason
})

export {}
