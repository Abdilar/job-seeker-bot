export default {
  'src/**/*.{ts,js}': ['oxlint --fix', 'prettier --write'],

  '**/*.{json,md,yml,yaml, mjs}': ['prettier --write'],
}
