export default {
  'src/**/*.{ts,js}': ['oxlint --fix', 'prettier --write'],
  '**/*.mjs': ['oxlint --fix', 'prettier --write'],
  '**/*.{json,md,yml,yaml}': ['prettier --write'],
}
