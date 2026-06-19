# Macro-Etapa A: Dependências + Tooling

## Escopo
Instalação de dependências de produção e desenvolvimento, e inicialização do Husky.

### Itens
| Item | Arquivos/Alvos | Responsável |
|---|---|---|
| **A1** — Deps produção | `npm install vue-router@4 dexie cropperjs jszip file-saver` | veste-engineer |
| **A2** — DevDeps | `npm install -D tailwindcss@3 postcss autoprefixer vite-plugin-pwa eslint prettier eslint-plugin-vue vitest @vue/test-utils jsdom husky lint-staged` | veste-engineer |
| **A3** — Husky init | `npx husky init` + `.husky/pre-commit` com `npx lint-staged` | veste-engineer |

## Fluxo de Teste
- **A1:** Verificar `ls node_modules/vue-router` e `ls node_modules/dexie` retornam diretórios
- **A2:** `npx eslint --version` retorna versão válida; `npx tailwindcss --help` exibe ajuda
- **A3:** `ls .husky/pre-commit` existe; `npx husky` não lança erro

## Segurança
- Nenhum dado de usuário é manipulado
- Dependências instaladas via npm registry oficial
- `--save-exact` não é necessário (lockfile protege)
- Verificar se `package-lock.json` foi gerado/atualizado

## Validações para Próxima Etapa (B)
- [x] `npm ls vue-router dexie cropperjs jszip file-saver` sem erro
- [x] `npm ls -D tailwindcss postcss autoprefixer vite-plugin-pwa eslint prettier eslint-plugin-vue vitest @vue/test-utils jsdom husky lint-staged` sem erro
- [x] `.husky/pre-commit` existe e contém `npx lint-staged`
- [x] `package.json` scripts NÃO foram alterados além do necessário (deps)
- [x] `npm run build` ainda falha com erro esperado (tailwind/postcss config ausentes)
