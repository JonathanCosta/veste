import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['node_modules', 'dist', 'public', 'e2e'],
  },
  ...pluginVue.configs['flat/recommended'],
  prettier,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
]
