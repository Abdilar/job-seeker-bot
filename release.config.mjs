export default {
  branches: ['master'],
  plugins: [
    '@semantic-release/commit-analyzer',
    {
      releaseRules: [
        { type: 'refactor', release: 'patch' },
        { type: 'pref', release: 'patch' },
      ],
    },
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],
    '@semantic-release/github',
  ],
}
