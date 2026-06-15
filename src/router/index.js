import { createRouter, createWebHistory } from 'vue-router'

const routes = [
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
]

const router = createRouter({
  history: createWebHistory('/veste/'),
  routes,
})

export default router
