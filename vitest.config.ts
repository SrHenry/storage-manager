import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/__tests__/*.spec.ts'],
        globals: true,
    },
    resolve: {
        alias: [
            {
                find: /^(\.\.\/.*)\.js$/,
                replacement: '$1',
            },
            {
                find: /^(\.\/.*)\.js$/,
                replacement: '$1',
            },
        ],
    },
})
