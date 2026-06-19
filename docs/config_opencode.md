# Plano de Configuração do Projeto Veste

> **Propósito:** Documentar a configuração de agentes, skills, ferramentas MCP, regras de permissão, setup de ambiente (Vite + Vue 3 + Tailwind v3), pipeline de deploy e assets do PWA. Este documento serve como referência única para inicializar o projeto e o ecossistema opencode.

---

## Índice

1. [Estrutura de Diretórios do Projeto](#1-estrutura-de-diretórios-do-projeto)
2. [Configuração opencode.json](#2-configuração-opencodejson)
3. [Agentes (`.opencode/agents/`)](#3-agentes-opencodeagents)
4. [Skills (`.opencode/skills/`)](#4-skills-opencodeskills)
5. [AGENTS.md (Raiz)](#5-agentsmd-raiz)
6. [Setup de Ambiente (Ferramentas e Dependências)](#6-setup-de-ambiente-ferramentas-e-dependências)
7. [Assets e PWA](#7-assets-e-pwa)
8. [Pipeline de Deploy (GitHub Pages)](#8-pipeline-de-deploy-github-pages)
9. [Plano de Execução Passo a Passo](#9-plano-de-execução-passo-a-passo)

---

## 1. Estrutura de Diretórios do Projeto

```
veste_app/
├── .opencode/
│   ├── opencode.json
│   ├── agents/
│   │   ├── veste-engineer.md
│   │   ├── veste-ui.md
│   │   ├── veste-data.md
│   │   ├── veste-security.md
│   │   ├── veste-reviewer.md
│   │   ├── veste-pwa.md
│   │   └── veste-deploy.md
│   └── skills/
│       ├── veste-architecture/SKILL.md
│       ├── veste-design-system/SKILL.md
│       ├── veste-micro-interactions/SKILL.md
│       ├── veste-image-pipeline/SKILL.md
│       ├── veste-database/SKILL.md
│       ├── veste-backup/SKILL.md
│       └── veste-git/SKILL.md
├── AGENTS.md
├── docs/
│   ├── blueprint_arquitetura.md
│   ├── blueprint_design.md
│   ├── config_opencode.md              ← este documento
│   ├── favicon.ico
│   ├── logo.png
│   ├── logo_banner.png
│   ├── logo_transparente.png
│   └── appstore-images/
│       ├── android/
│       ├── ios/
│       └── windows/
├── public/
│   ├── favicon.ico
│   └── icons/                          ← copiado de docs/appstore-images/
│       ├── android/
│       ├── ios/
│       └── windows/
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── router/index.js
│   ├── database/db.js
│   ├── services/
│   │   ├── imageService.js
│   │   ├── wardrobeService.js
│   │   └── backupService.js
│   ├── composables/
│   │   ├── useItems.js
│   │   └── useLooks.js
│   ├── views/
│   │   ├── WardrobeView.vue
│   │   ├── ItemDetailView.vue
│   │   ├── LookManagerView.vue
│   │   └── SettingsView.vue
│   └── components/
│       ├── BottomNav.vue
│       └── ItemCard.vue
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vitest.config.js
├── .eslintrc.cjs
├── .prettierrc
├── .husky/pre-commit
└── .gitignore
```

---

## 2. Configuração `opencode.json`

**Localização:** `.opencode/opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "veste-engineer",
  "instructions": [
    "AGENTS.md",
    "docs/blueprint_arquitetura.md",
    "docs/blueprint_design.md"
  ],
  "skills": {
    "paths": [".opencode/skills"]
  },
  "command": {
    "dev": {
      "description": "Iniciar servidor de desenvolvimento Vite",
      "template": "npm run dev"
    },
    "build": {
      "description": "Build de produção",
      "template": "npm run build"
    },
    "test": {
      "description": "Rodar testes unitários Vitest",
      "template": "npm run test"
    },
    "lint": {
      "description": "Verificar lint com ESLint",
      "template": "npm run lint"
    },
    "format": {
      "description": "Formatar código com Prettier",
      "template": "npm run format"
    },
    "deploy": {
      "description": "Deploy para GitHub Pages",
      "template": "npm run deploy"
    }
  },
  "mcp": {
    "filesystem-veste": {
      "type": "local",
      "command": [
        "npx", "-y", "@modelcontextprotocol/server-filesystem",
        "/home/jonathan/Projetos/Diversos/veste_app"
      ],
      "enabled": true
    }
  },
  "permission": {
    "bash": {
      "git *": "allow",
      "npm run *": "allow",
      "npm install *": "ask",
      "npx *": "ask",
      "rm *": "deny",
      "mv *": "ask",
      "cp *": "ask",
      "mkdir *": "allow",
      "touch *": "allow",
      "*": "ask"
    },
    "edit": "allow",
    "read": "allow",
    "glob": "allow",
    "grep": "allow",
    "external_directory": {
      "/home/jonathan/Projetos/Diversos/veste_app/**": "allow",
      "*": "deny"
    }
  }
}
```

### Regras de Permissão

| Ação | Regra | Motivo |
|---|---|---|
| `git *` | `allow` | Commits atômicos obrigatórios |
| `npm run *` | `allow` | Scripts do projeto (dev, build, test) |
| `npm install *` | `ask` | Controlar novas dependências |
| `npx *` | `ask` | Controlar execução de pacotes externos |
| `rm *` | `deny` | Evitar deleção acidental |
| `edit` | `allow` | Agente precisa codificar |
| `external_directory` | Apenas `/veste_app/**` | Isolamento total do projeto |

---

## 3. Agentes (`.opencode/agents/`)

Cada agente é um arquivo Markdown com frontmatter YAML. O corpo do arquivo é o `prompt` do agente.

### 3.1 `veste-engineer.md` — Agente Padrão (Primary)

```markdown
---
name: veste-engineer
description: Orquestrador principal do projeto Veste. Cria e integra componentes, serviços, views e toda a lógica da aplicação seguindo rigorosamente os blueprints de arquitetura e design.
mode: primary
---

Você é o Engenheiro Chefe do projeto Veste (Look do Dia), um guarda-roupa virtual offline-first.

## Responsabilidades
- Criar e manter componentes Vue 3 (Composition API + <script setup>)
- Integrar serviços, composables, views e roteamento
- Garantir que todo código siga os blueprints em docs/
- Delegar tarefas especializadas para subagentes (veste-ui, veste-data, etc.)
- Validar a consistência entre camada de dados e camada de UI

## Regras Obrigatórias
- Offline-first: proibido axios ou qualquer lib HTTP
- Proibido cores, bordas ou estilos fora do tailwind.config.js
- Commits atômicos com Conventional Commits
- Imagens sempre processadas via Cropper.js + Canvas → WebP
- Look deve ter no mínimo 2 itens (validar em wardrobeService)
```

### 3.2 `veste-ui.md` — Especialista em UI/UX

```markdown
---
name: veste-ui
description: Especialista em interface de usuário, Tailwind CSS customizado, animações e micro-interações do Veste. Foca no design invisível (Content-First) e na experiência tátil premium.
mode: subagent
permission:
  edit: allow
  bash: deny
---

Você é o Especialista em UI/UX do Veste.

## Responsabilidades
- Implementar classes Tailwind conforme blueprint_design.md
- Criar animações de transição (page-enter/leave, list-move)
- Aplicar feedback tátil (active:scale-95)
- Garantir design Mobile-First e Thumb-Zone
- Implementar skeleton loaders (animate-pulse)

## Regras de Design (Inquebráveis)
- Paleta restrita: app-bg (#F7F7F6), accent (#2D2D2D), text-main (#1F2937), text-muted (#6B7280)
- Sombras: soft (0 8px 30px rgba(0,0,0,0.04)) e soft-lg (0 10px 40px rgba(0,0,0,0.06))
- Fonte: Inter (sans)
- Border-radius: 2xl (1rem), 3xl (1.5rem)
- Proibido: bordas escuras, cores vibrantes, dashboard genérico do Tailwind
- BottomNav: fixed bottom-0, bg-white, shadow difusa, 4 ícones Phosphor/Heroicons outline
```

### 3.3 `veste-data.md` — Especialista em Camada de Dados

```markdown
---
name: veste-data
description: Especialista em banco de dados local (Dexie.js/IndexedDB), serviços de negócio e composables. Implementa schemas, CRUD relacional, regras de validação e cascade delete.
mode: subagent
permission:
  edit: allow
  bash: deny
---

Você é o Especialista em Dados do Veste.

## Responsabilidades
- Configurar Dexie.js com schema VesteDB (items, categories, looks)
- Implementar src/services/wardrobeService.js (CRUD, validações, cascade)
- Implementar src/services/imageService.js (Cropper.js + Canvas + WebP)
- Implementar src/services/backupService.js (JSZip export/import)
- Criar composables reativos (useItems, useLooks)

## Schema Dexie
db.version(1).stores({
  items: '++id, type, categoryId, description, createdAt',
  categories: '++id, name',
  looks: '++id, description, *itemIds, createdAt'
})

## Regras de Negócio
- createLook: validar itemIds.length >= 2
- deleteItem: remover itemId de todos os looks; se look.itemIds.length < 2, deletar look
- getLooksByItemId: db.looks.where('itemIds').equals(itemId).toArray()
- getItemsByLookId: db.items.where('id').anyOf(look.itemIds).toArray()
```

### 3.4 `veste-security.md` — Auditor de Segurança

```markdown
---
name: veste-security
description: Auditor de segurança do Veste. Revisa código contra XSS, vazamento de dados, memory leaks de Blobs, sanitização de entradas do usuário e práticas seguras de IndexedDB.
mode: subagent
permission:
  edit: deny
  bash: deny
---

Você é o Auditor de Segurança do Veste.

## Checklists de Auditoria

### XSS e Sanitização
- [ ] Descrições textuais do usuário são sanitizadas antes de renderizar? (v-text, não v-html)
- [ ] Nomes de categorias criadas pelo usuário têm escaping adequado?

### Blobs e Memória
- [ ] URL.createObjectURL tem revogação correspondente em onUnmounted?
- [ ] Blobs de imagem não estão sendo mantidos em memória após exclusão do item?
- [ ] O garbage collector do IndexedDB está sendo respeitado?

### IndexedDB
- [ ] Dados sensíveis (se houver) não estão em texto puro no banco local?
- [ ] Export/import não está vazando dados para escopos não autorizados?

### Rede (Offline-First)
- [ ] Nenhuma requisição HTTP externa está sendo feita?
- [ ] Nenhuma dependência de rede (axios, fetch) foi introduzida?
```

### 3.5 `veste-reviewer.md` — Revisor de Blueprint Compliance

```markdown
---
name: veste-reviewer
description: Revisor de conformidade com os blueprints do Veste. Verifica se cada componente, serviço e configuração segue rigorosamente as especificações dos documentos de arquitetura e design.
mode: subagent
permission:
  edit: deny
  bash: deny
---

Você é o Revisor de Conformidade do Veste.

## Checklist de Revisão

### Blueprint de Arquitetura
- [ ] Estrutura de diretórios segue o especificado? (src/router/, src/database/, src/services/, src/composables/, src/views/)
- [ ] Schema Dexie segue exatamente items/categories/looks?
- [ ] imageService usa maxWidth 1080px + WebP 0.85?
- [ ] createLook valida >= 2 itens?
- [ ] deleteItem tem cascade para looks?
- [ ] backup usa JSZip com data.json + /images/?
- [ ] axios ou HTTP libraries estão ausentes?

### Blueprint de Design
- [ ] Cores usadas estão dentro da paleta? (app-bg, accent, text-main, text-muted)
- [ ] Sombras usam soft/soft-lg?
- [ ] active:scale-95 está em todos elementos clicáveis?
- [ ] Transições de rota usam .page-* classes?
- [ ] BottomNav tem 4 ícones (Peças, +, Looks, Config)?
- [ ] Nenhuma borda escura ou cor vibrante?
```

### 3.6 `veste-pwa.md` — Especialista PWA

```markdown
---
name: veste-pwa
description: Especialista em Progressive Web Apps. Configura vite-plugin-pwa, service worker (GenerateSW), manifest.json, ícones multiplataforma (Android/iOS/Windows) e meta tags de instalação.
mode: subagent
permission:
  edit: allow
  bash: allow
---

Você é o Especialista PWA do Veste.

## Responsabilidades
- Configurar vite-plugin-pwa no vite.config.js
- Estratégia GenerateSW para cache estático
- Manifest.json com nome "Veste — Look do Dia"
- Ícones: android/ (48-512), ios/ (16-1024), windows/ (tiles)
- Meta tags para instalação mobile (apple-touch-icon, theme-color)
- Cor do tema: #F7F7F6 (app-bg)
- display: standalone
- start_url: /

## Assets (copiar de docs/appstore-images/ para public/icons/)
- Android: launchericon-{48,72,96,144,192,512}x{48,72,96,144,192,512}.png
- iOS: {16,20,29,32,40,48,50,57,58,60,64,72,76,80,87,100,114,120,128,144,152,167,180,192,256,512,1024}.png
- Windows: Square44x44Logo, Square150x150Logo, Wide310x150Logo, LargeTile, SmallTile, SplashScreen, StoreLogo
```

### 3.7 `veste-deploy.md` — Especialista em Deploy

```markdown
---
name: veste-deploy
description: Especialista em build e deploy do Veste para GitHub Pages. Gerencia configuração de base path, pipeline oficial do GitHub Actions (configure-pages + upload-pages-artifact + deploy-pages), e scripts de build otimizados.
mode: subagent
permission:
  edit: allow
  bash: allow
---

Você é o Especialista em Deploy do Veste.

## Responsabilidades
- Configurar base: '/veste/' no vite.config.js
- Manter pipeline oficial do GitHub Pages: actions/configure-pages → upload-pages-artifact → deploy-pages
- Garantir que o `.nojekyll` seja gerado automaticamente (configure-pages cuida disso)
- Otimizar build (code splitting, lazy loading de rotas)
- Verificar que o manifest.json e service worker funcionam em subdiretório

## Deploy
- **Automático:** push na branch `main` → GitHub Actions executa o workflow `.github/workflows/deploy.yml`
- **Manual:** GitHub UI → Actions → Deploy PWA Veste → Run workflow (workflow_dispatch)
- O script `npm run deploy` apenas informa o fluxo CI (não faz deploy local)

## Pipeline CI (GitHub Actions)
```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with: { node-version: '22', cache: 'npm' }
- run: npm ci
- run: npm run build
- uses: actions/configure-pages@v4
- uses: actions/upload-pages-artifact@v3
  with: { path: './dist' }
- uses: actions/deploy-pages@v4
```
```

---

## 4. Skills (`.opencode/skills/`)

### 4.1 `veste-architecture/SKILL.md`

```markdown
---
name: veste-architecture
description: "Use ONLY ao criar novos componentes, serviços, views ou qualquer arquivo de código do Veste. Contém as regras arquiteturais fundamentais do projeto: offline-first, schema Dexie, estrutura de diretórios, proibições de backend externo."
---

# Veste Architecture Rules

## Stack Obrigatória
- Vue 3 Composition API com `<script setup>`
- Vite como build tool
- Vue Router 4 (Web History)
- Dexie.js para IndexedDB
- Tailwind CSS v3 (configurado via tailwind.config.js)
- vite-plugin-pwa (GenerateSW)
- Cropper.js + Canvas API para imagens

## Proibições Absolutas
- ❌ axios ou qualquer biblioteca de requisição HTTP
- ❌ Servidor backend ou banco em nuvem
- ❌ LocalStorage (usar IndexedDB via Dexie)
- ❌ Dependências de UI genéricas (ex: Vuetify, PrimeVue)
- ❌ Cores, bordas ou estilos fora do tailwind.config.js

## Estrutura de Diretórios
src/
├── router/index.js
├── database/db.js
├── services/
│   ├── imageService.js
│   ├── wardrobeService.js
│   └── backupService.js
├── composables/
│   ├── useItems.js
│   └── useLooks.js
├── views/
│   ├── WardrobeView.vue
│   ├── ItemDetailView.vue
│   ├── LookManagerView.vue
│   └── SettingsView.vue
├── components/
│   ├── BottomNav.vue
│   └── ItemCard.vue
├── App.vue
└── main.js
```

### 4.2 `veste-design-system/SKILL.md`

```markdown
---
name: veste-design-system
description: Use ONLY ao estilizar componentes com Tailwind CSS no Veste. Define a paleta de cores, sombras, tipografia, border-radius e regras de design invisível (Content-First). Não use cores ou estilos fora desta skill.
---

# Veste Design System

## Cores (Tailwind extend)
- app-bg: #F7F7F6 (fundo da aplicação)
- accent: #2D2D2D (botões primários, ícones ativos)
- text-main: #1F2937 (títulos)
- text-muted: #6B7280 (descrições, placeholders)

## Sombras
- soft: 0 8px 30px rgba(0,0,0,0.04)
- soft-lg: 0 10px 40px rgba(0,0,0,0.06)

## Tipografia
- Fonte: Inter (sans-serif)
- Títulos: text-2xl font-bold tracking-tight
- Subtítulos: text-sm font-medium uppercase tracking-wider text-text-muted
- Descrições: text-sm text-text-muted truncate

## Border Radius
- 2xl: 1rem (cards)
- 3xl: 1.5rem (modais, bottom sheets)

## App Shell
<div class="min-h-screen bg-app-bg text-text-main font-sans overflow-x-hidden pb-24">
```

### 4.3 `veste-micro-interactions/SKILL.md`

```markdown
---
name: veste-micro-interactions
description: Use ONLY ao implementar animações, transições de rota, feedback de clique ou reordenação de grids no Veste. Define as classes de transição CSS e micro-interações táteis.
---

# Veste Micro-Interactions

## Feedback Tátil (Cliques)
TODO elemento clicável DEVE ter:
active:scale-95 transition-transform duration-200 ease-out

## Transição de Rotas (RouterView)
<RouterView v-slot="{ Component }">
  <Transition name="page" mode="out-in">
    <component :is="Component" />
  </Transition>
</RouterView>

.page-enter-active, .page-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

## Transição de Grid (TransitionGroup)
<TransitionGroup name="list">
  <div v-for="item in items" :key="item.id"> ... </div>
</TransitionGroup>

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
.list-leave-active {
  position: absolute;
}
```

### 4.4 `veste-image-pipeline/SKILL.md`

```markdown
---
name: veste-image-pipeline
description: Use ONLY ao processar upload, crop, compressão ou renderização de imagens no Veste. Define o pipeline Cropper.js + Canvas API + WebP com limite de 1080px e quality 0.85.
---

# Veste Image Pipeline

## Fluxo Obrigatório
1. Ingestão: Receber File do input
2. Crop: Cropper.js (proporção livre ou 3:4)
3. Redimensionamento: Canvas com maxWidth = 1080px (manter aspect ratio)
4. Compressão: canvas.toBlob(callback, 'image/webp', 0.85)
5. Saída: Blob (50-200kb esperado)
6. Renderização: URL.createObjectURL(blob)
7. Cleanup: URL.revokeObjectURL no onUnmounted

## Código Base
function compressImage(file, maxWidth = 1080, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(blob), 'image/webp', quality)
    }
    // URL.createObjectURL ou FileReader
  })
}
```

### 4.5 `veste-database/SKILL.md`

```markdown
---
name: veste-database
description: Use ONLY ao criar ou modificar consultas ao Dexie.js no Veste. Define os schemas das stores (items, categories, looks), índices, multi-entry lookups e regras de cascade.
---

# Veste Database (Dexie.js)

## Schema
db.version(1).stores({
  items: '++id, type, categoryId, description, createdAt',
  categories: '++id, name',
  looks: '++id, description, *itemIds, createdAt'
})

## Entidades
- Item: { id, type, categoryId, description, imageBlob: Blob, createdAt }
- Category: { id, name }
- Look: { id, description, itemIds: Number[], imageBlob: Blob (opcional), createdAt }

## Tipos Fixos (type)
'top' | 'bottom' | 'full' | 'shoes' | 'accessory'

## Consultas Bidirecionais
- db.looks.where('itemIds').equals(itemId).toArray()
- db.items.where('id').anyOf(look.itemIds).toArray()
```

### 4.6 `veste-backup/SKILL.md`

```markdown
---
name: veste-backup
description: Use ONLY ao implementar exportação ou importação de dados no Veste. Define o formato do arquivo .zip com data.json + imagens, bulk insert e restauração.
---

# Veste Backup Service

## Exportação
1. Buscar todos registros: items, categories, looks
2. Criar JSZip
3. Adicionar data.json com toda estrutura relacional
4. Adicionar pasta /images/ com blobs nomeados (item_1.webp, look_3.webp)
5. Salvar como backup-veste.zip via file-saver

## Importação
1. Ler .zip via JSZip
2. Parsear data.json
3. Mapear arquivos WebP de volta para Blobs
4. Bulk insert no Dexie respeitando chaves primárias
```

### 4.7 `veste-git/SKILL.md`

```markdown
---
name: veste-git
description: Use ONLY antes de cada operação de commit no Veste. Define o padrão de Conventional Commits, atomicidade, estrutura de branches e regras de mensagem.
---

# Veste Git Conventions

## Conventional Commits
- feat: (nova funcionalidade para o usuário)
- fix: (correção de bug)
- chore: (tarefa de manutenção, config, build)
- refactor: (mudança na estrutura sem alterar comportamento)
- style: (formatação, estilos — sem mudança lógica)
- test: (adição ou correção de testes)
- docs: (documentação)

## Atomicidade
Cada commit deve conter APENAS uma unidade lógica:
- Um componente → um commit
- Um serviço → um commit
- Uma view → um commit
- Configuração → um commit

## Branches
- main: linha principal (protegida)
- feature/<nome>: para funcionalidades complexas
- fix/<nome>: para correções

## Mensagem
Formato: <tipo>(<escopo>): <descrição>
Exemplo: feat(wardrobe): add cascade delete to wardrobeService
```

---

## 5. AGENTS.md (Raiz)

Arquivo central de referência na raiz do projeto. Funciona como um "README de agentes" para o opencode.

```markdown
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
npm run deploy   # Build + GitHub Pages
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
```

---

## 6. Setup de Ambiente (Ferramentas e Dependências)

### 6.1 Dependências de Produção

```bash
npm install vue-router@4
npm install dexie
npm install cropperjs
npm install jszip file-saver
```

### 6.2 Dependências de Desenvolvimento

```bash
npm install -D tailwindcss@3 postcss autoprefixer
npm install -D vite-plugin-pwa
npm install -D eslint prettier eslint-plugin-vue
npm install -D vitest @vue/test-utils jsdom
npm install -D husky lint-staged
```

### 6.3 Arquivos de Configuração

#### `vite.config.js`
```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/veste/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'] },
      manifest: {
        name: 'Veste — Look do Dia',
        short_name: 'Veste',
        description: 'Guarda-roupa virtual offline-first',
        theme_color: '#F7F7F6',
        background_color: '#F7F7F6',
        display: 'standalone',
        start_url: '/veste/',
        icons: [
          { src: 'icons/android/launchericon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/android/launchericon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/ios/180.png', sizes: '180x180', type: 'image/png' },
          { src: 'icons/ios/1024.png', sizes: '1024x1024', type: 'image/png' },
        ]
      }
    })
  ]
})
```

#### `tailwind.config.js`
```javascript
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        'app-bg': '#F7F7F6',
        'accent': '#2D2D2D',
        'text-main': '#1F2937',
        'text-muted': '#6B7280',
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 40px rgba(0, 0, 0, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    }
  },
  plugins: []
}
```

#### `.husky/pre-commit`
```bash
npx lint-staged
```

#### `package.json` (scripts + lint-staged)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext .vue,.js --fix",
    "format": "prettier --write 'src/**/*.{vue,js}'",
    "deploy": "echo 'Deploy automatizado via GitHub Actions. Use git push para main ou workflow_dispatch no GitHub.'"
  },
  "lint-staged": {
    "*.{vue,js}": ["eslint --fix", "prettier --write"]
  }
}
```

#### `vitest.config.js`
```javascript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true
  }
})
```

---

## 7. Assets e PWA

### Fluxo de Cópia de Assets

```bash
# Favicon
cp docs/favicon.ico public/favicon.ico

# Android icons
mkdir -p public/icons/android
cp docs/appstore-images/android/* public/icons/android/

# iOS icons
mkdir -p public/icons/ios
cp docs/appstore-images/ios/* public/icons/ios/

# Windows icons
mkdir -p public/icons/windows
cp docs/appstore-images/windows/* public/icons/windows/
```

### Importante sobre o PWA
- O `vite-plugin-pwa` com `GenerateSW` gera o service worker automaticamente
- O cache cobre todos os arquivos estáticos do build
- O manifesto referencia os ícones copiados para `public/icons/`
- A cor do tema (`#F7F7F6`) deve estar nas meta tags do `index.html`

---

## 8. Pipeline de Deploy (GitHub Pages)

### Configuração
- `base: '/veste/'` no `vite.config.js`
- Pipeline oficial do GitHub Pages: `actions/configure-pages` → `upload-pages-artifact` → `deploy-pages`
- O `.nojekyll` é gerado automaticamente pelo `configure-pages`

### GitHub Actions (Ativo)
O workflow `.github/workflows/deploy.yml` executa deploy automático ao push na `main`:

```yaml
name: Deploy PWA Veste

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - uses: actions/deploy-pages@v4
```

---

## 9. Plano de Execução Passo a Passo

| # | Ação | Detalhes |
|---|---|---|
| 1 | Criar diretórios `.opencode/agents/` e `.opencode/skills/*/` | Estrutura completa de agentes e skills |
| 2 | Escrever `opencode.json` | Config principal com MCP, permissions, comandos |
| 3 | Escrever 7 agentes (`agents/*.md`) | Cada um com frontmatter e prompt especializado |
| 4 | Escrever 7 skills (`skills/*/SKILL.md`) | Cada skill com regras específicas do blueprint |
| 5 | Escrever `AGENTS.md` na raiz | Mapa central de referência |
| 6 | `npm create vite@latest . -- --template vue` | Scaffold inicial |
| 7 | `npm install` dependências de produção | vue-router, dexie, cropperjs, jszip, file-saver |
| 8 | `npm install -D` devDependencies | tailwindcss@3, postcss, autoprefixer, vite-plugin-pwa, eslint, prettier, eslint-plugin-vue, vitest, @vue/test-utils, jsdom, husky, lint-staged |
| 9 | `npx husky init` | Criar .husky/pre-commit |
| 10 | Configurar `vite.config.js` | base, PWA plugin, plugins Vue |
| 11 | Configurar `tailwind.config.js` | Cores, sombras, fontes, radius |
| 12 | Configurar `postcss.config.js` | tailwindcss + autoprefixer |
| 13 | Configurar `.eslintrc.cjs` + `.prettierrc` | Regras Vue 3 |
| 14 | Configurar `vitest.config.js` | jsdom environment |
| 15 | Atualizar `package.json` | Scripts + lint-staged |
| 16 | Copiar assets | favicon, PWA icons para `public/` |
| 17 | Atualizar `index.html` | Meta tags PWA, fonte Inter, viewport |
| 18 | Criar `src/main.js` | Inicializar Vue + Router + PWA register |
| 19 | Criar `src/App.vue` | Shell + RouterView + BottomNav |
| 20 | Criar `src/router/index.js` | 4 rotas (lazy loaded) |
| 21 | Criar `src/database/db.js` | Dexie schema |
| 22 | Criar `src/services/imageService.js` | Crop + compress WebP |
| 23 | Criar `src/services/wardrobeService.js` | CRUD + validações |
| 24 | Criar `src/services/backupService.js` | JSZip export/import |
| 25 | Criar `src/composables/useItems.js` | Hooks items |
| 26 | Criar `src/composables/useLooks.js` | Hooks looks |
| 27 | Criar `src/components/BottomNav.vue` | Navegação inferior |
| 28 | Criar `src/components/ItemCard.vue` | Card de peça |
| 29 | Criar `src/views/WardrobeView.vue` | Grade + filtros |
| 30 | Criar `src/views/ItemDetailView.vue` | Detalhe + carrossel |
| 31 | Criar `src/views/LookManagerView.vue` | Montador + bottom sheet |
| 32 | Criar `src/views/SettingsView.vue` | Backup/restore |
| 33 | `git init` + `.gitignore` | Inicializar repositório |
| 34 | `git add . && git commit -m "chore: complete project scaffold with agents, skills, and core architecture"` | Commit inicial |

---

## Notas Finais

1. **Tailwind v3** foi escolhido por alinhamento exato com o blueprint (que define `tailwind.config.js`)
2. **Modelo dos agentes** é genérico (herdado do `opencode.json` global) — nenhum agente especifica `model` no frontmatter
3. **Agentes são definidos em arquivos**, não inline no `opencode.json`
4. **`veste-engineer`** é o agente `primary` padrão
5. **MCP browser** não foi pré-configurado por simplicidade inicial; pode ser adicionado como `mcp.browser` apontando para `@playwright/mcp` quando necessário para testes headless
