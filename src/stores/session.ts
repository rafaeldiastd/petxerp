import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { api, ApiError, setApiOrg } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { queryClient } from '@/lib/query'
import { connectRealtime, disconnectRealtime } from '@/lib/realtime'
import type { MeResponse } from '@shared/types'
import type { Permission } from '@shared/permissions'
import { ROLES } from '@shared/permissions'

export const useSession = defineStore('session', () => {
  const me = ref<MeResponse | null>(null)
  const loaded = ref(false)
  const storedOrg = useLocalStorage<string | null>('petx:org', null)

  const user = computed(() => me.value?.user ?? null)
  const memberships = computed(() => me.value?.memberships ?? [])
  const membership = computed(
    () => memberships.value.find((m) => m.orgId === storedOrg.value) ?? memberships.value[0] ?? null,
  )
  const org = computed(() => membership.value?.org ?? null)
  const orgId = computed(() => membership.value?.orgId ?? null)
  const roleLabel = computed(() => ROLES[membership.value?.role as keyof typeof ROLES] ?? '')
  const permissions = computed(() => new Set(membership.value?.permissions ?? []))

  /** true se o membro tem ao menos uma das permissões */
  function can(...p: Permission[]) {
    return p.some((x) => permissions.value.has(x))
  }

  watch(
    orgId,
    (id) => {
      setApiOrg(id)
      if (id) {
        storedOrg.value = id
        connectRealtime(id, queryClient)
      } else disconnectRealtime()
    },
    { immediate: true },
  )

  async function load(force = false) {
    if (loaded.value && !force) return me.value
    try {
      me.value = await api.get<MeResponse>('/me')
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) me.value = null
      else throw e
    } finally {
      loaded.value = true
    }
    return me.value
  }

  function switchOrg(id: string) {
    if (id === orgId.value) return
    storedOrg.value = id
    queryClient.clear()
  }

  async function signOut() {
    await authClient.signOut().catch(() => undefined)
    me.value = null
    loaded.value = false
    disconnectRealtime()
    queryClient.clear()
  }

  return { me, loaded, user, memberships, membership, org, orgId, roleLabel, permissions, can, load, switchOrg, signOut }
})
