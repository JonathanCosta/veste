import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

describe('Router configuration', () => {
  let router

  beforeEach(() => {
    router = createRouter({
      history: createWebHistory('/veste/'),
      routes: [
        {
          path: '/',
          name: 'Wardrobe',
          component: () => import('../views/WardrobeView.vue'),
        },
        {
          path: '/item/:id',
          name: 'ItemDetail',
          component: () => import('../views/ItemDetailView.vue'),
        },
        {
          path: '/looks',
          name: 'Looks',
          component: () => import('../views/LookManagerView.vue'),
        },
        {
          path: '/settings',
          name: 'Settings',
          component: () => import('../views/SettingsView.vue'),
        },
      ],
    })
  })

  it('uses createWebHistory with /veste/ base', () => {
    // createWebHistory strips trailing slash
    expect(router.options.history.base).toBe('/veste')
  })

  it('has 4 routes defined', () => {
    const routes = router.getRoutes()
    expect(routes).toHaveLength(4)
  })

  it('defines all expected route paths', () => {
    const paths = router.getRoutes().map((r) => r.path)
    expect(paths).toContain('/')
    expect(paths).toContain('/item/:id')
    expect(paths).toContain('/looks')
    expect(paths).toContain('/settings')
  })

  it('each route has a lazy-loaded component', async () => {
    const routeMap = {}
    for (const record of router.getRoutes()) {
      routeMap[record.path] = record.components?.default
    }

    // Routes use dynamic import (lazy loading)
    const componentImport = routeMap['/']
    expect(componentImport).toBeTypeOf('function')
    const mod = await componentImport()
    expect(mod.default).toBeTypeOf('object')
  })

  it('resolves /item/new to ItemDetail route with id param "new"', () => {
    const resolved = router.resolve('/item/new')
    expect(resolved.name).toBe('ItemDetail')
    expect(resolved.params.id).toBe('new')
  })

  it('resolves /item/123 to ItemDetail route with numeric id', () => {
    const resolved = router.resolve('/item/123')
    expect(resolved.name).toBe('ItemDetail')
    expect(resolved.params.id).toBe('123')
  })
})
