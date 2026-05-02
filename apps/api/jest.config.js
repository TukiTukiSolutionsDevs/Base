/**
 * Jest config para apps/api (NestJS + TypeORM).
 * - ts-jest preset para compilar TS al vuelo.
 * - rootDir = src para que tests vivan junto al código.
 * - testRegex = .spec.ts$ (tests unitarios).
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/application/*.service.ts',
    '!**/*.spec.ts',
    '!**/*.dto.ts',
  ],
  coverageDirectory: '../coverage',
  clearMocks: true,
};
