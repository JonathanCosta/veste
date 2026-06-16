import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ItemCard from '../components/ItemCard.vue'
import BottomNav from '../components/BottomNav.vue'
import { createRouter, createWebHistory } from 'vue-router'

/**
 * Helper: create a router stub for BottomNav tests.
 */
function createMockRouter() {
  return createRouter({
    history: createWebHistory('/veste/'),
    routes: [
      { path: '/', name: 'Wardrobe', component: { template: '<div />' } },
      { path: '/item/:id', name: 'ItemDetail', component: { template: '<div />' } },
      { path: '/looks', name: 'Looks', component: { template: '<div />' } },
      { path: '/settings', name: 'Settings', component: { template: '<div />' } },
    ],
  })
}

describe('ItemCard.vue', () => {
  const baseItem = {
    id: 1,
    type: 'top',
    description: 'Camiseta básica',
  }

  it('renders item description and type', () => {
    const wrapper = mount(ItemCard, {
      props: { item: baseItem },
    })
    expect(wrapper.text()).toContain('Camiseta básica')
    expect(wrapper.text()).toContain('top')
  })

  it('shows "sem descrição" placeholder when description is missing', () => {
    const wrapper = mount(ItemCard, {
      props: { item: { id: 1, type: 'shoes' } },
    })
    expect(wrapper.text()).toContain('Sem descrição')
  })

  it('shows placeholder SVG when no imageBlob', () => {
    const wrapper = mount(ItemCard, {
      props: { item: baseItem },
    })
    expect(wrapper.text()).toContain('Sem Peça')
  })

  it('renders image when imageBlob is provided', async () => {
    const blob = new Blob(['fake-image'], { type: 'image/webp' })
    const wrapper = mount(ItemCard, {
      props: { item: { ...baseItem, imageBlob: blob } },
    })
    // Wait for onMounted to create the blob URL
    await wrapper.vm.$nextTick()
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBeTruthy()
  })

  it('cleans up object URL on unmount', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const blob = new Blob(['fake-image'], { type: 'image/webp' })
    const wrapper = mount(ItemCard, {
      props: { item: { ...baseItem, imageBlob: blob } },
    })
    wrapper.unmount()
    expect(revokeSpy).toHaveBeenCalled()
    revokeSpy.mockRestore()
  })
})

describe('BottomNav.vue', () => {
  it('renders 4 tabs', () => {
    const router = createMockRouter()
    const wrapper = mount(BottomNav, {
      global: { plugins: [router] },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(4)
  })

  it('highlights the active tab', async () => {
    const router = createMockRouter()
    await router.push('/looks')
    const wrapper = mount(BottomNav, {
      global: { plugins: [router] },
    })
    // The "Looks" tab should have the accent color class
    const buttons = wrapper.findAll('button')
    // "Looks" is third tab (index 2)
    const looksTab = buttons[2]
    expect(looksTab.text()).toContain('Looks')
    // The accent text class should be present
    expect(looksTab.find('span').classes()).toContain('text-accent')
  })

  it('navigates on tab click', async () => {
    const router = createMockRouter()
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mount(BottomNav, {
      global: { plugins: [router] },
    })
    // Click "Settings" tab (last one)
    const buttons = wrapper.findAll('button')
    await buttons[3].trigger('click')
    expect(pushSpy).toHaveBeenCalledWith('/settings')
    pushSpy.mockRestore()
  })
})
