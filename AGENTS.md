# Veste — Look do Dia

Guarda-roupa virtual offline-first. PWA 100% local, sem servidores.

## Stack
- **Frontend:** Vue 3 (Composition API + `<script setup>`)
- **Build:** Vite
- **Database:** Dexie.js (IndexedDB)
- **UI:** Tailwind CSS v3 (custom theme)
- **PWA:** vite-plugin-pwa (GenerateSW)
- **Imagens:** Cropper.js + Canvas API → WebP
- **Deploy:** GitHub Pages

## Documentos de Referência
- `docs/blueprint_arquitetura.md` — Schemas, serviços, regras de negócio
- `docs/blueprint_design.md` — UI/UX, Tailwind, animações
- `docs/config_opencode.md` — Configuração de agentes, skills e ambiente

## Agentes

| Nome | Mode | Função |
|---|---|---|
| `veste-engineer` | **primary** (default) | Orquestrador principal, cria e integra tudo |
| `veste-ui` | subagent | Tailwind, animações, micro-interações |
| `veste-data` | subagent | Dexie, serviços, composables |
| `veste-security` | subagent (readonly) | Auditoria de segurança |
| `veste-reviewer` | subagent (readonly) | Revisão de blueprint compliance |
| `veste-pwa` | subagent | PWA, service worker, manifest |
| `veste-deploy` | subagent | Build e GitHub Pages |

## Skills

| Skill | Quando usar |
|---|---|
| `veste-architecture` | Criar componentes, serviços, views |
| `veste-design-system` | Estilizar com Tailwind |
| `veste-micro-interactions` | Animações, transições, cliques |
| `veste-image-pipeline` | Upload/processamento de imagens |
| `veste-database` | Consultas Dexie, schemas |
| `veste-backup` | Export/import de dados |
| `veste-git` | Antes de commits |

## Comandos

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run test     # Testes unitários (Vitest)
npm run lint     # ESLint
npm run format   # Prettier
npm run deploy   # Deploy via GitHub Actions (CI)
```

## Assets

| Arquivo | Destino |
|---|---|
| `docs/favicon.ico` | `public/favicon.ico` |
| `docs/logo_transparente.png` | Base para PWA icons |
| `docs/appstore-images/android/*` | `public/icons/android/` |
| `docs/appstore-images/ios/*` | `public/icons/ios/` |
| `docs/appstore-images/windows/*` | `public/icons/windows/` |

## Regras Fundamentais
- Offline-first: sem axios, sem servidores, sem cloud
- Design invisível: paleta neutra, sem bordas escuras
- Imagens sempre WebP (max 1080px, quality 0.85)
- Commits atômicos com Conventional Commits
- Look deve ter no mínimo 2 itens
