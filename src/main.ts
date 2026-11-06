import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import { router } from './router'
import { queryClient } from './lib/query'
import { setUnauthorizedHandler } from './lib/api'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(VueQueryPlugin, { queryClient })
app.use(router)

// Sessão expirada durante o uso → volta ao login. Na primeira navegação quem decide é o guard do router.
setUnauthorizedHandler(() => {
  const current = router.currentRoute.value
  if (current.matched.length && !current.meta.public) router.replace({ name: 'login', query: { next: current.fullPath } })
})

app.mount('#app')
