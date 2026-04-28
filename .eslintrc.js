module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'web-build/', 'supabase/functions/'],
  rules: {
    'react/no-unescaped-entities': 'off',
  },
};
