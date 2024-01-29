import type { Config } from '@jest/types'

export default {
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['vue', 'js', 'json', 'ts'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest'
  },
} as Config.InitialOptions