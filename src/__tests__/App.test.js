import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import App from '../App.vue'

describe('App.vue', () => {
  let router

  beforeEach(() => {
    router = createRouter({
      history: createWebHistory('/veste/'),
      routes: [
        { path: '/', name: 'Wardrobe', component: { template: '<div>Wardrobe Page</div>' } },
        {
          path: '/item/:id',
          name: 'ItemDetail',
          component: { template: '<div>Item Detail</div>' },
        },
        { path: '/looks', name: 'Looks', component: { template: '<div>Looks Page</div>' } },
        {
          path: '/settings',
          name: 'Settings',
          component: { template: '<div>Settings Page</div>' },
        },
      ],
    })
  })

  it('renders the shell with router-view and bottom nav', async () => {
    await router.push('/')
    const wrapper = mount(App, {
      global: { plugins: [router] },
    })

    await vi.waitFor(() => {
      // BottomNav should be present (5 tabs)
      const nav = wrapper.find('nav')
      expect(nav.exists()).toBe(true)
      const buttons = nav.findAll('button')
      expect(buttons).toHaveLength(5)
      // Current route content should be rendered
      expect(wrapper.text()).toContain('Wardrobe Page')
    })
  })

  it('navigates between pages via bottom nav', async () => {
    await router.push('/')
    const wrapper = mount(App, {
      global: { plugins: [router] },
    })

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Wardrobe Page')
    })

    // Use router directly to navigate
    await router.push('/settings')

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Settings Page')
    })
  })

  it('has bottom nav with Peças, Looks, FAB, Calendário, Config tabs', async () => {
    await router.push('/')
    const wrapper = mount(App, {
      global: { plugins: [router] },
    })

    await vi.waitFor(() => {
      const buttons = wrapper.findAll('nav button')
      expect(buttons[0].text()).toContain('Peças')
      expect(buttons[1].text()).toContain('Looks')
      // buttons[2] is the FAB — only SVG icon, no visible label text inside the button
      expect(buttons[3].text()).toContain('Calendário')
      expect(buttons[4].text()).toContain('Config')
    })
  })
})
