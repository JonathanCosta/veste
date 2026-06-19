# Veste — Look do Dia

<p align="center">
  <img src="https://img.shields.io/github/actions/workflow/status/JonathanCosta/veste/deploy.yml?style=for-the-badge&logo=githubactions&logoColor=white" alt="Build" />
  <img src="https://img.shields.io/github/license/JonathanCosta/veste?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/PWA-Ready-8E24AA?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/Offline-First-1565C0?style=for-the-badge&logo=network-wired&logoColor=white" alt="Offline" />
  <img src="https://img.shields.io/badge/Tests-123%20passed-brightgreen?style=for-the-badge&logo=vitest&logoColor=white" alt="Tests" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue_3-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Dexie.js-007ACC?style=for-the-badge&logo=indexeddb&logoColor=white" alt="Dexie" />
  <img src="https://img.shields.io/badge/Offline_First-1565C0?style=for-the-badge&logo=network-wired&logoColor=white" alt="Offline First" />
</p>

<p align="center">
  <img src="docs/logo_icone.svg" width="80" height="72" alt="Veste Logo" />
</p>

**Guarda-roupa virtual offline-first.**  
PWA 100% local, sem servidores. Instalável na tela inicial, funciona offline, atualiza automaticamente.

> **Design Concept:** O **Veste** segue a filosofia de _Invisible Design_ (Content-First). A interface é propositalmente contida para garantir que o seu guarda-roupa — e não a aplicação — seja o protagonista visual.

---

## Stack

| Camada | Tecnologia |
|---|---|
| **Core** | Vue 3 (Composition API + `<script setup>`) |
| **Build** | Vite 8 |
| **Roteamento** | Vue Router 4 (Web History, base `/veste/`) |
| **Banco Local** | Dexie.js (IndexedDB) |
| **Estilo** | Tailwind CSS 3 (tema customizado — veja Design System) |
| **Imagens** | Cropper.js (planejado) + Canvas API → WebP |
| **PWA** | `vite-plugin-pwa` com GenerateSW (Workbox) |
| **Backup** | JSZip + FileSaver (.zip export/import) |
| **Deploy** | GitHub Pages via GitHub Actions CI/CD |

> **O Veste é um PWA completo:** instalável na tela inicial, funciona 100% offline e atualiza o service worker automaticamente em segundo plano. Nenhum servidor externo é necessário — todos os dados e imagens ficam armazenados localmente no IndexedDB.

---

## Arquitetura

> Sem backend, sem servidores — 100% offline-first. Seus dados nunca saem do seu dispositivo.

### Offline-First

- **App shell precached:** toda a interface (JS, CSS, HTML, fontes, ícones) é baixada na primeira visita e servida do cache pelo service worker.
- **Dados locais:** itens, categorias, looks e registros do calendário são armazenados no IndexedDB via Dexie.js. Imagens são convertidas para WebP e salvas como blobs no banco local.
- **Sem servidor:** não há backend, API, `fetch`, `XMLHttpRequest` ou sincronização externa. O app é completamente autônomo após o carregamento inicial.

### Schema do Banco (Dexie.js — 3 migrações)

```javascript
db.version(1).stores({
  items:      '++id, type, categoryId, description, createdAt',
  categories: '++id, name',
  looks:      '++id, description, *itemIds, createdAt',
})

db.version(2).stores({
  // + calendar_logs
  items:         '++id, type, categoryId, description, createdAt',
  categories:    '++id, name',
  looks:         '++id, description, *itemIds, createdAt',
  calendar_logs: '++id, date, entityType, entityId, order',
})

db.version(3).stores({
  // Schema idêntico ao v2 — migração placeholder para futuras evoluções
  items:         '++id, type, categoryId, description, createdAt',
  categories:    '++id, name',
  looks:         '++id, description, *itemIds, createdAt',
  calendar_logs: '++id, date, entityType, entityId, order',
})
```

> O índice multi-entry (`*itemIds`) permite buscar em **O(1)** todos os looks que contêm um item específico — sem tabelas associativas.

### Propriedades das Entidades

> `imageBlob` e `cor` são armazenados como propriedades não-indexadas nos objetos — Dexie persiste qualquer campo mesmo sem índice declarado.

```
Item:         { id, type, categoryId, description, imageBlob?, cor?, createdAt }
  type ∈ { top (parte de cima), bottom (parte de baixo), full (completo),
           shoes (calçado), accessory (acessório) }

Category:     { id, name }

Look:         { id, description, itemIds: Number[], imageBlob?, createdAt }

CalendarLog:  { id, date: 'YYYY-MM-DD', entityType: 'item' | 'look',
                entityId, order }
```

### Relacionamentos e Cascade Delete

```
items ──< looks          (via *itemIds multi-entry)
items ──< calendar_logs  (via entityType='item')
looks ──< calendar_logs  (via entityType='look')
```

**Regras de cascade:**

1. Ao deletar um **Item**, seu ID é removido de todos os Looks que o contêm.
2. Se após a remoção o Look ficar com `itemIds.length < 2`, o Look inteiro é deletado.
3. Registros do calendário referenciando o Item/Look deletado também são removidos.
4. Na **criação de Look**, a validação exige `itemIds.length >= 2`.

---

## Funcionalidades

### 👕 Guarda-Roupa (`/`)

- Grid em 2 colunas com cards de peças (foto, descrição, tipo)
- Busca textual por descrição
- Filtros por tipo (pílulas horizontais) e por cor (swatches)
- Infinite scroll com IntersectionObserver
- Skeleton loaders durante leitura do IndexedDB

### 🎯 Montador de Looks (`/looks`)

- Criação de looks com seleção de ≥2 peças via bottom sheet
- Edição: adicionar/remover peças com preview dos estados
- Upload de foto vestindo o look (compressão WebP automática)
- Visualização Hero (polaroid stack ou foto) + Recipe Grid com entrada escalonada
- Bottom sheet com **puxador leather/metal e rivet central**

### 📅 Calendário (`/calendar`)

- Visão mensal com indicadores de dias com registros
- Navegação entre meses
- Sheet lateral com detalhes dos looks usados no dia
- Look logging ao marcar peças como "usadas hoje"

### ⚙️ Ajustes (`/settings`)

- **Exportar backup:** baixa um arquivo `.zip` com `data.json` + imagens WebP
- **Importar backup:** restaura dados de um `.zip` previamente exportado
- **Seeder (dev):** gera 500 peças de teste (apenas em `import.meta.env.DEV`)

### 📦 Backup — Formato do .zip

```
backup-veste-{timestamp}.zip
├── data.json
│   ├── items:          [{id, type, categoryId, description, createdAt}]
│   ├── categories:     [{id, name}]
│   ├── looks:          [{id, description, itemIds, createdAt}]
│   └── calendar_logs:  [{id, date, entityType, entityId, order}]
└── images/
    ├── item_{id}.webp
    └── look_{id}.webp
```

> O backup é um arquivo .zip padrão — você pode abri-lo no explorador de arquivos e inspecionar ou editar o `data.json` manualmente.

### 🌐 PWA — Instalação

O Veste é instalável em qualquer dispositivo que suporte PWAs:

| Requisito | Detalhe |
|---|---|
| **Navegador** | Chrome Android, Safari iOS, Edge, Samsung Internet |
| **HTTPS** | GitHub Pages fornece certificado automaticamente |
| **Manifest** | Gerado pelo `vite-plugin-pwa` com `display: standalone`, ícones 192px e 512px |
| **iOS** | Toque em "Compartilhar" → "Adicionar à Tela de Início" |
| **Android** | O navegador exibe o banner de instalação automaticamente |

> ⚙️ O service worker usa `autoUpdate`: quando uma nova versão é detectada, ela é instalada em segundo plano e entra em vigor na próxima navegação.

### Limitações

- **Sem sincronização em nuvem:** o Veste é 100% local. Não há servidor para backup automático ou sync entre dispositivos.
- **Sem notificações push:** o service worker não gerencia push messages — não há servidor para enviá-las.
- **Dados restritos ao dispositivo:** para migrar ou preservar dados, use a função de exportação (Settings → Backup).
- **Atualização silenciosa:** com `autoUpdate`, o usuário não é notificado sobre novas versões.

---

## Views e Rotas

| Rota | View | Descrição |
|---|---|---|
| `/` | `WardrobeView` | Grid do guarda-roupa com busca e filtros |
| `/item/:id` | `ItemDetailView` | Detalhe da peça + looks relacionados |
| `/item/new` | `ItemDetailView` (modo criação) | Upload de foto, formulário de nova peça |
| `/looks` | `LookManagerView` | CRUD de looks com montador visual |
| `/calendar` | `CalendarView` | Calendário mensal de uso |
| `/settings` | `SettingsView` | Backup/restore e modo desenvolvedor |

**Navegação:** BottomNav fixa com 5 itens: Peças · Looks · **+** (FAB central) · Calendário · Config

---

## Pipeline de Imagem

> Toda foto é processada localmente: redimensionamento para 1080px (mantendo aspect ratio) e compressão WebP quality 0.85. Nenhuma imagem é enviada para servidores externos. A imagem original é descartada imediatamente após o processamento.

```
File (input) → Canvas API (resize 1080px max) → canvas.toBlob('image/webp', 0.85) → Blob → IndexedDB
```

- **Pipeline atual:** File → Canvas (resize) → WebP → Blob (sem crop — planejado via Cropper.js)
- **Saída esperada:** 50–200 KB por imagem
- **Leitura:** `URL.createObjectURL(blob)` com cleanup em `onUnmounted` (`revokeObjectURL`)
- **Formato:** WebP — compatível com todos os navegadores modernos

---

## Design System (Invisible Design)

> **Design Concept:** O **Veste** segue a filosofia de _Invisible Design_. A interface é propositalmente contida para garantir que o seu guarda-roupa — e não a aplicação — seja o protagonista visual. Sem bordas escuras, cores vibrantes ou estética de dashboard administrativo.

### Paleta de Cores

| Token | Cor | Uso |
|---|---|---|
| `app-bg` | `#F7F7F6` | Fundo da aplicação (textura física/conforto) |
| `accent` | `#2D2D2D` | Botões primários, ícones ativos, destaque |
| `text-main` | `#1F2937` | Títulos e textos principais |
| `text-muted` | `#6B7280` | Descrições, placeholders, metadados |
| `studio-bg` | `#121211` | Overlay do estúdio de crop (fullscreen escuro) |

### Sombras

| Classe | Valor |
|---|---|
| `shadow-soft` | `0 8px 30px rgba(0,0,0,0.04)` |
| `shadow-soft-lg` | `0 10px 40px rgba(0,0,0,0.06)` |

### Tipografia

- **Fonte:** Inter (sans-serif, geométrica)
- **Títulos de tela:** `text-2xl font-bold tracking-tight`
- **Subtítulos:** `text-sm font-medium uppercase tracking-wider`
- **Descrições:** `text-sm text-text-muted truncate`

### Componentes de Destaque

#### Gaveta 3D (Wardrobe Drawer)

O grid de peças é apresentado dentro de um contêiner que simula visualmente uma **gaveta física aberta**:

- Fundo `#FCFCFA` (interior do móvel, tom mais claro que app-bg)
- Bevel 3D com `border-t-2 border-l-2 border-white/80` (luz superior/esquerda)
- Chamfer com `border-b-2 border-r-2 border-gray-300/60` (sombra inferior/direita)
- Profundidade interna via `inset box-shadow`
- Fresta decorativa simulando o trilho da gaveta

#### Puxador Leather/Metal (Bottom Sheet Pull Handle)

```html
<div class="w-14 h-2.5 bg-accent rounded-full 
  shadow-[0_3px_6px_rgba(0,0,0,0.2),inset_0_-2px_3px_rgba(0,0,0,0.4)] 
  border border-white/10">
  <div class="w-1.5 h-1.5 rounded-full bg-white/40 shadow-inner" />
</div>
```

Anatomia: base escura (couro/metal escovado) → embossing 3D (dupla camada de luz/sombra) → borda sutil de separação → pino de fixação central (rivet metálico).

### Micro-interações

| Interação | Técnica | Componente |
|---|---|---|
| **Feedback tátil** | `active:scale-95 transition-transform duration-200` | Todos os clicáveis |
| **Transição de rota** | `<Transition name="page">` (opacity + translateY) | App.vue |
| **Staggered grid** | `--index * 30ms` transition-delay | WardrobeView |
| **Hero fadeInUp** | `@keyframes fadeInUp` com escalonamento nth-child | LookManagerView |
| **Dialog "pouso"** | `scale(0.92) translateY(8px)` | CustomDialog |
| **Polaroid stack** | `-rotate-6 / rotate-3 / rotate-12` + z-index | Look cards, hero, related |
| **Bottom sheet slide** | `translateY(100%) → 0` | CalendarView, LookManagerView |
| **BottomNav stroke** | `stroke-2` (ativo) vs `stroke-[1.5]` (inativo) | BottomNav |
| **Skeleton pulse** | `animate-pulse` + gray blocks | Todas as views |
| **Color swatch** | `scale-110 ring-offset-2 ring-accent` | ItemDetailView |
| **Gradient placeholder** | `bg-gradient-to-b from-[#F9F9F7] to-[#EDEDE8]` + SVG cabide | ItemCard |

### Patterns Reutilizáveis

- **`.scrollbar-none`:** esconde scrollbar (webkit + Firefox) — usado em filtros horizontais
- **`content-visibility: auto`:** virtualização nativa CSS para grids com muitos itens
- **`env(safe-area-inset-bottom)`:** padding adaptativo para notches no BottomNav

### O que NÃO usar

- ❌ `border-gray-200` → usar `ring-1 ring-gray-200/50`
- ❌ `bg-gray-100` para placeholders → usar `bg-gradient-to-b from-[#F9F9F7] to-[#EDEDE8]`
- ❌ `box-shadow` com valores duros → usar `shadow-soft` / `shadow-soft-lg`
- ❌ Cores fora da paleta acima

---

## Segurança e Privacidade

> 🔒 O Veste é 100% offline-first. **Nenhum dado pessoal, foto ou look sai do seu dispositivo.** Não há servidores, APIs, analytics, tracking, telemetria ou qualquer comunicação de rede.

### Zero Chamadas de Rede

O código de aplicação não utiliza `fetch` ou `XMLHttpRequest` — **não há superfície de exfiltração**. A única exceção é o carregamento inicial da fonte Inter via Google Fonts CDN (removível auto-hospedando a fonte — basta comentar as tags `<link>` no `index.html` e instalar a fonte localmente).

### Processamento Local de Imagens

- Upload, redimensionamento e compressão são feitos exclusivamente via **Canvas API em memória**
- A imagem **original é descartada imediatamente** após o processamento
- Apenas a versão WebP (1080px, qualidade 0.85) é armazenada no IndexedDB
- **Nenhuma imagem é enviada para servidores externos**

### Armazenamento no IndexedDB

- Todos os dados residem no **IndexedDB** (sandboxed por origin do navegador)
- Imagens são armazenadas como **Blobs** no banco local, não no filesystem
- **Não há criptografia adicional** — os dados são tão seguros quanto o navegador
- Em dispositivos com criptografia em repouso (iOS File Protection, Android FBE), o IndexedDB herda essa proteção
- ⚠️ **Limpar os dados do navegador remove permanentemente seus looks e fotos** — faça backups regulares pela tela de Configurações

### Boas Práticas de Memória

- Blob URLs são gerenciados com `URL.createObjectURL()` e revogados com `URL.revokeObjectURL()` no `onUnmounted` de cada componente
- O worker de exportação/importação processa dados em chunks de 50 itens para controle de heap
- Backups são validados: tamanho máximo de 50 MB, schema JSON, magic bytes de imagens WebP

---

## Deploy

> O build gera apenas arquivos estáticos. Sem runtime no servidor, sem banco remoto — o deploy é trivial por design. O Veste funciona com **qualquer static host**: GitHub Pages, Netlify, Vercel, Cloudflare Pages, ou mesmo um servidor Apache.

### CI/CD — GitHub Actions

O workflow `.github/workflows/deploy.yml` automatiza o deploy:

```yaml
# Gatilho: push na branch main (ignorando docs/ e *.md)
# 1. actions/checkout@v4
# 2. actions/setup-node@v4 (Node 22, cache npm)
# 3. npm ci (instalação determinística)
# 4. npm run build (vite build → dist/)
# 5. touch dist/.nojekyll
# 6. peaceiris/actions-gh-pages@v3 (publica dist/ no gh-pages)
```

[![Deploy PWA Veste](https://github.com/JonathanCosta/veste/actions/workflows/deploy.yml/badge.svg)](https://github.com/JonathanCosta/veste/actions/workflows/deploy.yml)

### Por que `.nojekyll`?

GitHub Pages processa sites com Jekyll por padrão. Jekyll ignora arquivos e pastas que começam com `_` (ex.: `_assets/` ou `workbox-*.js` gerados pelo PWA). O comando `touch dist/.nojekyll` desativa o Jekyll e garante que **todos** os assets sejam servidos corretamente.

### Pré-requisitos

1. Crie um repositório no GitHub chamado **`veste`** (o base path `/veste/` no Vite assume este nome)
2. Conecte o repositório local: `git remote add origin git@github.com:JonathanCosta/veste.git`
3. No repositório → **Settings → Pages → Source → "GitHub Actions"**
4. Faça push para `main` — o deploy acontece automaticamente

> Se o repositório tiver outro nome, atualize `base` em `vite.config.js` e `start_url` no manifest do PWA.

### Deploy Manual (Fallback)

```bash
npm run deploy   # gh-pages -d dist (branch gh-pages)
```

> ⚠️ O script manual empurra para a branch `gh-pages`. Se estiver usando CI (recomendado), mantenha Settings → Pages apontando para **GitHub Actions**. Não use ambos simultaneamente — podem sobrescrever o deploy um do outro.

### Domínio Personalizado

Para usar um domínio próprio (ex.: `veste.app`):
1. Configure o domínio em Settings → Pages
2. Use o input `cname` da action `peaceiris/actions-gh-pages`
3. Atualize `base` em `vite.config.js` para `'/'` e `start_url` para `'/'`

---

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 3000, host) |
| `npm run build` | Build de produção (saída em `dist/`) |
| `npm run preview` | Preview do build de produção |
| `npm run test` | Testes unitários (Vitest, 123+ testes) |
| `npm run lint` | ESLint — verificação de código |
| `npm run format` | Prettier — formatação automática |
| `npm run deploy` | Deploy manual via gh-pages CLI |

---

## Estrutura de Diretórios

```
veste_app/
├── .github/workflows/
│   └── deploy.yml              # CI/CD GitHub Actions
├── public/
│   ├── favicon.ico
│   ├── icons/android/          # PWA icons (192, 512)
│   ├── icons/ios/              # Apple touch icons
│   └── icons/windows/          # Windows tile icons
├── src/
│   ├── components/
│   │   ├── BottomNav.vue       # Navegação inferior fixa
│   │   ├── CustomDialog.vue    # Dialog reutilizável
│   │   ├── DayDetailSheet.vue  # Bottom sheet do calendário
│   │   ├── ItemCard.vue        # Card de peça no grid
│   │   └── LogoIcon.vue        # SVG da marca
│   ├── composables/
│   │   ├── useDialog.js
│   │   ├── useItems.js
│   │   ├── useLooks.js
│   │   ├── useRelatedLookItems.js
│   │   └── useWorkingState.js
│   ├── database/
│   │   └── db.js               # Conexão Dexie + schemas v1-v3
│   ├── router/
│   │   └── index.js            # 5 rotas + Vue Router config
│   ├── services/
│   │   ├── backupService.js     # Export/import .zip (chunked, AbortController)
│   │   ├── calendarService.js  # Calendar logs CRUD
│   │   ├── imageService.js     # Canvas resize + WebP compress
│   │   └── wardrobeService.js  # CRUD relacional + cascade delete
│   ├── utils/
│   │   ├── labels.js           # type→label mapping pt-BR
│   │   └── seeder.js           # Gerador de dados de teste (500 items)
│   ├── views/
│   │   ├── WardrobeView.vue    # Grid, busca, filtros
│   │   ├── ItemDetailView.vue  # Detalhe + criação + looks relacionados
│   │   ├── LookManagerView.vue # Montador de looks
│   │   ├── CalendarView.vue    # Calendário mensal
│   │   └── SettingsView.vue    # Backup/restore, dev tools
│   ├── __tests__/              # 123+ testes Vitest
│   └── App.vue                 # App shell + transição de rota
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Licença

Projeto pessoal — código aberto, experimental.  
Desenvolvido como um estudo de arquitetura offline-first, PWA e design system com Vue 3 + Vite + Dexie.js.

---

<p align="center">
  <strong>Veste — Look do Dia</strong><br />
  Guarda-roupa virtual offline-first.<br />
  100% local, sem servidores.
</p>
