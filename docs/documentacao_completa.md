# Veste — Look do Dia

## Documentação Completa do Projeto

> Guarda-roupa virtual offline-first. PWA 100% local, sem servidores.

---

## 1. Árvore de Arquivos

```
veste_app/
├── index.html                          # Entry point HTML (meta tags PWA, base href)
├── package.json                        # Dependências e scripts do projeto
├── vite.config.js                      # Build Vite + PWA (GenerateSW) + base path
├── vitest.config.js                    # Config dos testes unitários (jsdom, fake-indexeddb)
├── tailwind.config.js                  # Tema customizado (cores, sombras, fontes)
├── postcss.config.js                   # PostCSS com Tailwind e autoprefixer
├── eslint.config.js                    # ESLint flat config (importar arquivos)
├── .prettierrc                         # Prettier (sem vírgula, aspas simples)
├── .gitignore                          # Arquivos ignorados pelo git
│
├── public/
│   └── logo.png                        # Logo oficial do app, 444×438 RGB
│
├── src/
│   ├── main.js                         # Bootstrap: cria app Vue, monta router
│   ├── App.vue                         # Shell: RouterView + Transition + BottomNav + CustomDialog
│   ├── style.css                       # Estilos globais (import Inter font, Tailwind layers)
│   │
│   ├── router/
│   │   └── index.js                    # 4 rotas lazy: /, /item/:id, /looks, /settings
│   │
│   ├── database/
│   │   └── db.js                       # Dexie VesteDB v1: stores items, categories, looks
│   │
│   ├── services/
│   │   ├── wardrobeService.js          # CRUD items/looks, cascade delete, validações
│   │   ├── imageService.js             # Compressão Canvas → WebP (max 1080px, q0.85)
│   │   └── backupService.js            # Export/import ZIP (JSZip + data.json + imagens)
│   │
│   ├── composables/
│   │   ├── useItems.js                 # Reactive item list + loadItems
│   │   ├── useLooks.js                 # Reactive look list + loadLooks + deleteLook
│   │   └── useDialog.js                # Global dialog state (alert/confirm Promise-based)
│   │
│   ├── components/
│   │   ├── BottomNav.vue               # Navegação inferior: Peças | Novo | Looks | Config
│   │   ├── ItemCard.vue                # Card de item (imagem + descrição + tipo)
│   │   └── CustomDialog.vue            # Modal global (alert/confirm) com design system
│   │
│   ├── views/
│   │   ├── WardrobeView.vue            # Grid de peças + busca + filtro + gaveta aberta
│   │   ├── ItemDetailView.vue          # Criar/editar item + crop overlay + detalhes
│   │   ├── LookManagerView.vue         # Lista de looks + bottom sheets (criar/detalhe)
│   │   └── SettingsView.vue            # Export/import backup + informações do app
│   │
│   └── __tests__/
│       ├── setup.js                    # fake-indexeddb polyfill + limpeza entre testes
│       ├── smoke.test.js               # Teste de sanidade (imports, mount)
│       ├── database.test.js            # CRUD Dexie (items, categories, looks)
│       ├── wardrobeService.test.js     # Regras de negócio (cascade, validação look)
│       ├── imageService.test.js        # Compressão de imagem
│       ├── backupService.test.js       # Export/import ZIP
│       ├── composables.test.js         # useItems, useLooks
│       ├── components.test.js          # BottomNav, ItemCard
│       ├── views.test.js               # Todas as 4 views (render, interações)
│       ├── router.test.js              # Navegação entre rotas
│       └── App.test.js                 # Shell + transições
│
├── e2e/
│   ├── playwright.config.js            # Playwright config (webServer, iPhone 14 viewport)
│   └── core-flows.spec.js              # 19 testes E2E: navegação, CRUD, looks, backup
│
├── .husky/
│   └── pre-commit                      # Git hook: lint-staged (eslint + prettier)
│
├── docs/
│   ├── blueprint_arquitetura.md        # Especificação arquitetural original
│   ├── blueprint_design.md             # Especificação de design/UI original
│   ├── config_opencode.md              # Config de agentes e skills
│   ├── documentacao_completa.md        # ← Este arquivo
│   ├── favicon.ico                     # Ícone do navegador
│   ├── logo.png                        # Asset original da logo
│   ├── logo_banner.png                 # Banner da logo
│   ├── logo_transparente.png           # Logo com fundo transparente
│   ├── appstore-images/                # Ícones PWA (Android/iOS/Windows)
│   └── macro-etapa-*.md                # Documentação histórica de implementação
│
├── AGENTS.md                           # Definição dos agentes (engineer, ui, data, etc.)
├── AUDITORIA_SEGURANCA.md              # Auditoria de segurança (XSS, blobs, IndexedDB)
└── README.md                           # README do projeto
```

---

## 2. Função de Cada Arquivo

### Raiz

| Arquivo | Função |
|---|---|
| `index.html` | Ponto de entrada HTML. Inclui `<base href="/veste/">`, meta tags PWA (theme-color, apple-touch-icons), fonte Inter, viewport-fit=cover. |
| `package.json` | Gerencia dependências e scripts. 15 devDependencies, 6 dependencies. Scripts: dev, build, test, lint, format, deploy, test:e2e. |
| `vite.config.js` | Configura Vite com plugin Vue, PWA (GenerateSW com 135 entries pré-cacheadas), base path `/veste/`, resolve do file-saver. |
| `vitest.config.js` | Configura Vitest com ambiente jsdom, setupFiles, fileParallelism:false (IndexedDB compartilhado), exclude:['e2e/**']. |
| `tailwind.config.js` | Extende Tailwind com cores customizadas (app-bg, accent, text-main, text-muted), sombras (soft, soft-lg), fonte Inter. |
| `postcss.config.js` | Plugins: tailwindcss + autoprefixer. |
| `eslint.config.js` | Flat config: plugin Vue + JS + Prettier, ignores dist/e2e. |
| `.prettierrc` | Sem vírgula final, aspas simples. |

### `src/main.js`

Cria a aplicação Vue 3, registra o router e monta em `#app`.

### `src/App.vue`

Shell principal da aplicação:
- `RouterView` com `<Transition name="page">` (fade + translateY)
- `BottomNav` fixo na parte inferior
- `CustomDialog` global (injetado para alert/confirm customizados)

### `src/router/index.js`

4 rotas com lazy loading:
- `/` → `WardrobeView.vue` (guarda roupa)
- `/item/:id` → `ItemDetailView.vue` (Detalhe/Criação/Edição)
- `/looks` → `LookManagerView.vue` (Gerenciamento de Looks)
- `/settings` → `SettingsView.vue` (Configurações)

History mode com base `/veste/` para GitHub Pages.

### `src/style.css`

Importa a fonte Inter via `@fontsource/inter`. Declara as camadas Tailwind (`@tailwind base/components/utilities`). Estilos base: scrollbar suave, seleção de texto customizada.

### `src/database/db.js`

Instância Dexie (`VesteDB` v1) com 3 stores:
- **items**: `++id, type, categoryId, description, createdAt`
- **categories**: `++id, name`
- **looks**: `++id, description, *itemIds, createdAt`

O `*itemIds` é um índice multi-entry que permite buscar looks por ID de item individual.

### `src/services/wardrobeService.js`

Camada de negócio completa:
- `addItem(item)` / `updateItem(id, changes)` — Cria/atualiza item com timestamp
- `deleteItem(id)` — Remove item com cascade: looks com a peça são atualizados (se ≥2 itens restantes) ou deletados (se <2)
- `getItems()` / `getItem(id)` / `getItemsByType(type)` — Consultas
- `getItemsByIds(ids)` — Busca múltiplos itens por array de IDs
- `addLook(look)` — Cria look validando mínimo de 2 itens
- `updateLook(id, changes)` / `deleteLook(id)` — Atualiza/remove look
- `saveLookPhoto(lookId, blob)` — Salva foto do look como Blob
- `getLooks()` / `getLook(id)` / `getLooksByItem(itemId)` — Consultas
- `addCategory(name)` / `getCategories()` — CRUD de categorias
- `ITEM_TYPES` — Array: `['top', 'bottom', 'full', 'shoes', 'accessory']`

### `src/services/imageService.js`

Pipeline de compressão de imagem:
1. Lê o arquivo via `FileReader` / `createObjectURL`
2. Desenha em Canvas redimensionado (max 1080px no maior lado, mantendo proporção)
3. Exporta como WebP com qualidade 0.85
4. Limpa o canvas após uso

### `src/services/backupService.js`

Export/import de dados:
- `exportData()` → Gera ZIP com `data.json` (metadados) + imagens individuais
- `importData(file)` → Lê ZIP, valida schema, faz bulk insert no Dexie com transação
- Limite de 50MB para importação
- Validação de schema (obriga `type`, `version`, `items`, `looks`)

### `src/composables/useItems.js`

Composable reativo para lista de itens:
- `items` — ref reativa
- `loading` — ref booleana
- `loadItems()` — busca do Dexie com try/catch/finally

### `src/composables/useLooks.js`

Composable reativo para lista de looks:
- `looks` — ref reativa
- `loading` — ref booleana
- `loadLooks()` — busca do Dexie
- `deleteLook(id)` — remove do Dexie e atualiza lista

### `src/composables/useDialog.js`

Sistema global de diálogos (substitui `alert()`/`confirm()` nativos):
- Estado singleton: `visible`, `title`, `message`, `type` ('alert'|'confirm')
- `confirm(msg, title)` → Promise<boolean> — aguarda resposta do usuário
- `alert(msg, title)` → Promise<void> — informa e aguarda confirmação
- `resolveDialog(value)` — resolve a Promise e fecha o modal
- Se um novo diálogo é chamado enquanto outro está aberto, o anterior é resolvido como `false`

### `src/components/BottomNav.vue`

Navegação inferior com 4 abas:
- Peças (`/`), Novo (`/item/new`), Looks (`/looks`), Config (`/settings`)
- Aba ativa destacada visualmente
- Ícones SVG inline minimalistas
- Escala ativa com `active:scale-90`

### `src/components/ItemCard.vue`

Card de item no grid:
- Gerencia ciclo de vida do Blob URL (cria em onMounted, revoga em onUnmounted, recria em watch)
- Proporção 3:4 para imagem
- Exibe descrição + tipo
- Sombra `shadow-soft` para destaque dentro da gaveta

### `src/components/CustomDialog.vue`

Modal global de diálogo:
- Overlay: `bg-black/30 backdrop-blur-sm z-[60]`
- Card: `bg-white max-w-sm rounded-3xl p-6 shadow-soft-lg text-center`
- Botões com `active:scale-95 transition-transform`
- Suporte a teclado (Enter confirma, Escape cancela)
- Transição Vue fade + scale (0.2s entrada, 0.15s saída)
- Ícone minimalista: lápis para confirm, "i" para alert

### `src/views/WardrobeView.vue`

Tela principal (rota `/`):
- Cabeçalho com logo + "Veste"
- Input de busca com filtro por texto
- Pills de filtro por tipo (Todas, Parte de Cima, Parte de Baixo, Inteiro, Calçados, Acessórios)
- Gaveta aberta: container `bg-white/50 rounded-3xl p-4 shadow-inner` simulando compartimento de cômoda
- Grid 2 colunas com `TransitionGroup` (FLIP animation)
- Estado vazio com mensagem "Nenhuma peça encontrada"

### `src/views/ItemDetailView.vue`

Tela de detalhe/criação/edição de peça (rota `/item/:id`):
- **Modo criação** (`/item/new`): formulário com upload de foto, crop (Cropper.js), seleção de tipo, descrição, botão salvar
- **Modo visualização** (rota com ID): hero image, descrição, tipo, botões Editar/Remover, looks relacionados
- **Modo edição**: mesmo formulário do modo criação, pré-preenchido, com "Cancelar" e "Salvar alterações"
- Crop overlay: tela preta com Cropper.js, botões Cancelar/Confirmar, proporção 3:4
- Pipeline de imagem: FileReader → Cropper.js → `$toCanvas()` → WebP blob
- Transição de crop: fade 0.2s

### `src/views/LookManagerView.vue`

Gerenciamento de looks (rota `/looks`):
- Cabeçalho com logo + "Veste"
- Botão "+ Criar look" (bordas tracejadas)
- Lista de looks com `TransitionGroup`
- **Bottom sheet de detalhe**: puxador de gaveta minimalista, foto do look (upload), grid de itens, botão "Remover look"
- **Bottom sheet de criação**: puxador minimalista, input de descrição, grid 3 colunas de itens selecionáveis (com feedback visual `scale-[0.98] opacity-60` quando selecionados), contador de peças, botão "Criar look"
- Validação: mínimo 2 itens (botão desabilitado até atingir)
- Teletransporte dos sheets para `<body>` via `<Teleport>`

### `src/views/SettingsView.vue`

Configurações (rota `/settings`):
- Cards: Exportar backup (.zip), Importar backup (validação 50MB)
- Seção "Sobre" com logo centralizada, versão, descrição do app
- Feedback visual após ações (toast-like com fade)

### `src/__tests__/setup.js`

Setup dos testes unitários:
- Polifyll do IndexedDB com `fake-indexeddb` (auto-call-through)
- Limpeza do banco entre testes (`afterEach`)
- Configuração do ambiente jsdom

---

## 3. Fluxo de Cada Ação

### 3.1. Criar uma Peça

```
Usuário → Aba "Novo" (BottomNav)
              │
              ▼
         ItemDetailView.vue  (/item/new)
              │
              ├─ 1. Clica na área de foto
              │      │
              │      ▼
              │   File Input (accept="image/*")
              │      │
              │      ▼
              │   onFileSelected(event)
              │      │
              │      ├─ FileReader lê arquivo como DataURL
              │      ├─ cropImageUrl = resultado
              │      ├─ showCrop = true → overlay preto
              │      └─ nextTick → Cropper.js init (aspectRatio 3/4)
              │
              ├─ 2. Ajusta o crop
              │      │
              │      ▼
              │   Clica "Confirmar"
              │      │
              │      ▼
              │   confirmCrop()
              │      │
              │      ├─ cropperSelection.$toCanvas({ width:1080, height:1080 })
              │      ├─ canvas.toBlob('image/webp', 0.85)
              │      ├─ imageFile.value = blob
              │      ├─ imageUrl.value = URL.createObjectURL(blob)
              │      ├─ showCrop = false
              │      └─ destroyCropper()
              │
              ├─ 3. Seleciona tipo (opcional, default "top")
              │      │
              │      ▼
              │   formType = 'bottom' | 'full' | 'shoes' | 'accessory'
              │
              ├─ 4. Preenche descrição
              │      │
              │      ▼
              │   formDescription = "Camiseta branca básica"
              │
              └─ 5. Clica "Salvar peça"
                     │
                     ▼
                  handleSave()
                     │
                     ├─ Valida: formDescription.trim() não vazio
                     │      │vazio → dialog.alert("Adicione uma descrição")
                     │
                     ├─ Monta objeto data { type, description }
                     ├─ Se imageFile existe:
                     │   ├─ Se já é WebP → usa direto
                     │   └─ Se não → compressImage() → WebP blob
                     │
                     ├─ Se isEditing (edição):
                     │   ├─ updateItem(item.id, data)
                     │   └─ loadItem(item.id) → recarrega detalhe
                     │
                     └─ Se novo:
                         ├─ addItem(data) → retorna id
                         └─ router.push(/item/{id}) → vai pro detalhe
```

### 3.2. Visualizar / Editar / Remover uma Peça

```
Usuário → Grid de peças → Clica em uma peça
              │
              ▼
         ItemDetailView.vue  (/item/{id})
              │
              ├─ loadItem(id)
              │   ├─ getItem(id) do Dexie
              │   ├─ Se tem imageBlob: URL.createObjectURL
              │   ├─ getLooksByItem(id) → looks relacionados
              │   └─ loading = false
              │
              ├─ MODO VISUALIZAÇÃO ──────────────────────────────
              │   │
              │   ├─ Hero image (50vh) com overlay de voltar
              │   ├─ Descrição + tipo
              │   │
              │   ├─ Botão "Editar"
              │   │      │
              │   │      ▼
              │   │   enterEditMode()
              │   │      ├─ formType = item.type
              │   │      ├─ formDescription = item.description
              │   │      └─ isEditing = true → entra em MODO EDIÇÃO
              │   │
              │   └─ Botão "Remover"
              │          │
              │          ▼
              │       handleDelete()
              │          ├─ dialog.confirm("Tem certeza?")
              │          │      ├─ true → continua
              │          │      └─ false → cancela
              │          ├─ deleteItem(item.id)
              │          │   ├─ Busca looks com esta peça
              │          │   ├─ Se look tem ≥2 itens: remove só a peça
              │          │   └─ Se look tem <2 itens: deleta look inteiro
              │          └─ router.push('/') → volta ao grid
              │
              └─ MODO EDIÇÃO ────────────────────────────────────
                  │
                  ├─ Formulário preenchido (tipo, descrição, imagem)
                  ├─ Pode clicar na foto para trocar (mesmo fluxo do crop)
                  │
                  ├─ "Cancelar"
                  │      │
                  │      ▼
                  │   cancelEdit()
                  │      ├─ Revoga imageFile temporário se existir
                  │      ├─ Restaura imageUrl original
                  │      ├─ Restaura formType/formDescription originais
                  │      └─ isEditing = false
                  │
                  └─ "Salvar alterações"
                         │
                         ▼
                      handleSave() → updateItem(id, data)
                         ├─ isEditing = true → braço de edição
                         ├─ updateItem()
                         └─ loadItem() → recarrega
```

### 3.3. Filtrar e Buscar Peças

```
WardrobeView.vue  (/)
    │
    ├─ FILTRO POR TIPO ─────────────────────────
    │   │
    │   ├─ Pills horizontais: Todas | Parte de Cima | Parte de Baixo | Inteiro | Calçados | Acessórios
    │   │
    │   └─ activeFilter = type
    │          │
    │          ▼
    │       filteredItems = items.filter(i => i.type === activeFilter)
    │          │
    │          ▼
    │       Grid re-renderiza com TransitionGroup
    │
    └─ BUSCA POR TEXTO ─────────────────────────
        │
        ├─ Input v-model="search"
        │
        └─ filteredItems = items.filter(i =>
               i.description.toLowerCase().includes(search.toLowerCase()))
```

### 3.4. Criar um Look

```
Usuário → Aba "Looks" → Clica "+ Criar look"
              │
              ▼
         LookManagerView.vue → showCreateSheet = true
              │
              ├─ Teleport para <body>
              ├─ Bottom sheet com puxador minimalista
              ├─ Input: descrição (opcional)
              ├─ Grid 3 colunas com todas as peças
              │
              ├─ Usuário seleciona peças (clique)
              │      │
              │      ├─ toggleItemSelection(itemId)
              │      │   ├─ Se já selecionado: remove do array
              │      │   └─ Se não: adiciona ao array
              │      │
              │      └─ Feedback visual:
              │          selectedItemIds.includes(id)? → scale-[0.98] opacity-60
              │
              ├─ Contador: "Criar look (2 peças)"
              │
              └─ Clica "Criar look"
                     │
                     ▼
                  handleCreateLook()
                     ├─ Valida: selectedItemIds.length >= 2
                     │      │< 2 → dialog.alert("Selecione pelo menos 2 peças")
                     │      │
                     ├─ addLook({ description, itemIds: [...ids] })
                     ├─ closeCreateSheet()
                     └─ loadLooks() → atualiza lista
```

### 3.5. Visualizar / Remover um Look

```
LookManagerView.vue → Clica em um look da lista
              │
              ▼
         openLook(look)
              │
              ├─ getItemsByIds(look.itemIds)
              ├─ Gera URLs das imagens (Blob URLs)
              ├─ Se tem foto do look: URL.createObjectURL
              └─ showSheet = true
              │
              ▼
         Bottom sheet de detalhe
              │
              ├─ Puxador minimalista no topo
              ├─ Título: descrição do look
              ├─ Contagem: "N peças"
              ├─ Foto do look (se existir) ou botão para adicionar
              │      │
              │      └─ handleLookPhotoSelected()
              │          ├─ compressImage(file) → WebP blob
              │          ├─ updateLook(id, { imageBlob })
              │          └─ loadLooks()
              │
              ├─ Grid horizontal de itens (clique → /item/{id})
              │
              └─ Botão "Remover look"
                     │
                     ▼
                  handleDelete(look)
                     ├─ dialog.confirm("Tem certeza?")
                     │      ├─ true → continua
                     │      └─ false → cancela
                     ├─ deleteLook(look.id) → db.looks.delete
                     ├─ closeSheet() se for o look atual
                     └─ loadLooks()
```

### 3.6. Backup (Export / Import)

```
SettingsView.vue  (/settings)
    │
    ├─ EXPORTAR ──────────────────────────────
    │   │
    │   └─ Clica "Exportar Backup"
    │          │
    │          ▼
    │       backupService.exportData()
    │          │
    │          ├─ Cria JSZip
    │          ├─ Extrai todos os items + looks do Dexie
    │          ├─ Cria data.json com metadados
    │          ├─ Para cada item com imagem:
    │          │   ├─ Converte Blob para base64
    │          │   └─ Adiciona ao ZIP como img/{id}.webp
    │          ├─ Gera o ZIP
    │          └─ file-saver.saveAs(zip, 'veste-backup-{data}.zip')
    │
    └─ IMPORTAR ────────────────────────────
        │
        └─ Clica "Importar Backup"
               │
               ├─ File input (accept=".zip")
               │
               ▼
            backupService.importData(file)
               │
               ├─ Lê ZIP com JSZip
               ├─ Valida schema do data.json
               │      ├─ Deve ter: type, version, items, looks
               │      └─ Máx 50MB
               ├─ Limpa banco atual (items, looks)
               ├─ Bulk insert dos items
               ├─ Bulk insert dos looks
               └─ Recarrega a página
```

### 3.7. Navegação entre Telas

```
BottomNav.vue (sempre visível)
    │
    ├─ "Peças"   → router.push('/')
    │                   → WardrobeView.vue (grid + busca + filtros)
    │
    ├─ "Novo"    → router.push('/item/new')
    │                   → ItemDetailView.vue (modo criação)
    │
    ├─ "Looks"   → router.push('/looks')
    │                   → LookManagerView.vue (lista + sheets)
    │
    └─ "Config"  → router.push('/settings')
                        → SettingsView.vue (backup + info)
    │
    ▼
App.vue
    ├─ RouterView com <Transition name="page"> (fade 0.25s)
    │   ├─ page-enter-from: opacity 0, translateY(10px)
    │   └─ page-leave-to: opacity 0, translateY(-10px)
    │
    ├─ BottomNav (fixed bottom, pb-24 no shell)
    │
    └─ CustomDialog (global, z-[60])
```

### 3.8. Ciclo de Vida de uma Imagem

```
1. USUÁRIO SELECIONA ARQUIVO
        │
        ▼
   FileReader.readAsDataURL(file) → cropImageUrl
        │
        ▼
   Cropper.js init (aspectRatio 3/4, viewMode 2)
        │
        ▼
2. USUÁRIO CONFIRMA CROP
        │
        ▼
   cropperSelection.$toCanvas({ width:1080, height:1080 })
        │
        ▼
   canvas.toBlob('image/webp', 0.85) → Blob
        │
        ├─ Armazenado em imageFile.value
        ├─ imageUrl.value = URL.createObjectURL(blob) → preview
        │
        ▼
3. SALVA NO BANCO
        │
        ▼
   addItem({ ..., imageBlob }) → Dexie guarda o Blob no IndexedDB
        │
        ▼
4. RECUPERA (ao abrir o item)
        │
        ▼
   getItem(id) → blob = item.imageBlob
        │
        ▼
   URL.createObjectURL(blob) → usado no src da <img>
        │
        ▼
5. LIMPEZA (ao sair da tela)
        │
        ├─ onUnmounted: URL.revokeObjectURL(url)
        └─ ItemCard: watch item → revoga antigo, cria novo URL
```

### 3.9. Sistema de Diálogo Customizado

```
Qualquer componente: dialog.confirm() ou dialog.alert()
        │
        ▼
   useDialog.js — estado singleton
        │
        ├─ visible = true
        ├─ title, message, type são populados
        ├─ Promise criada, resolveFn armazenada
        │
        ▼
   CustomDialog.vue — reativo ao estado
        │
        ├─ Transition fade + scale (0.2s)
        ├─ Overlay backdrop-blur-sm
        ├─ Card com ícone + título + mensagem
        │
        ├─ USUÁRIO CLICA "Confirmar"
        │      │
        │      ├─ resolveDialog(true)
        │      ├─ resolveFn(true) → Promise resolvida
        │      └─ visible = false → diálogo fecha
        │
        ├─ USUÁRIO CLICA "Cancelar" (ou Escape)
        │      │
        │      ├─ resolveDialog(false)
        │      ├─ resolveFn(false) → Promise resolvida
        │      └─ visible = false → diálogo fecha
        │
        └─ USUÁRIO CLICA no overlay
               │
               ├─ Se clique no backdrop (não no card)
               ├─ resolveDialog(false)
               └─ mesmo fluxo do Cancelar
```

### 3.10. Cascade Delete (Remover uma Peça)

```
deleteItem(itemId)
    │
    ├─ 1. Busca todos os looks que contêm este itemId
    │      db.looks.where('itemIds').equals(itemId)
    │
    ├─ 2. Para cada look encontrado:
    │      │
    │      ├─ Filtra o itemId do array itemIds
    │      │
    │      ├─ Se novo array tem >= 2 itens:
    │      │      db.looks.update(look.id, { itemIds: newArray })
    │      │
    │      └─ Se novo array tem < 2 itens:
    │             db.looks.delete(look.id)  → look removido
    │
    └─ 3. Remove o item
           db.items.delete(itemId)
```

### 3.11. Pipeline de Compressão de Imagem

```
compressImage(File)
    │
    ├─ 1. Cria Image element
    ├─ 2. URL.createObjectURL(file) → src da imagem
    │
    ├─ 3. onload:
    │      ├─ Revoga URL temporária
    │      ├─ Cria Canvas
    │      ├─ Se largura/altura > 1080px:
    │      │     Redimensiona mantendo proporção
    │      ├─ drawImage no canvas
    │      ├─ canvas.toBlob('image/webp', 0.85)
    │      └─ Resolve com Blob
    │
    └─ onerror:
           Revoga URL, reject com erro
```

---

## 4. Resumo das Tecnologias

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Vue 3 (Composition API + `<script setup>`) | ^3.5 |
| Roteamento | Vue Router 4 (Web History) | ^4.5 |
| Build | Vite | ^8 |
| Banco Local | Dexie.js (IndexedDB) | ^4 |
| Estilos | Tailwind CSS v3 (custom theme) | ^3.4 |
| PWA | vite-plugin-pwa (GenerateSW) | ^1.3 |
| Crop | Cropper.js v2 (Web Components) | ^2 |
| Backup | JSZip + FileSaver | ^2 |
| Testes Unitários | Vitest + @vue/test-utils + jsdom | ^3 |
| Testes E2E | Playwright | ^1 |
| Git Hooks | Husky + lint-staged | ^9 / ^15 |

## 5. Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento Vite |
| `npm run build` | Build de produção + PWA service worker |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes end-to-end (Playwright) |
| `npm run lint` | ESLint (verificação de código) |
| `npm run format` | Prettier (formatação de código) |
| `npm run deploy` | Deploy via GitHub Actions (push na main) |
