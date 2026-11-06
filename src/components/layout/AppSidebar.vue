<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Building2, Check, ChevronRight, ChevronsUpDown, LogOut, Plus } from '@lucide/vue'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Logo from '@/components/common/Logo.vue'
import { NAV, NAV_MATCH, type NavItem } from '@/lib/nav'
import { initials } from '@/lib/format'
import { fileUrl } from '@/lib/api'
import { useSession } from '@/stores/session'

const route = useRoute()
const router = useRouter()
const session = useSession()
const { state, isMobile, setOpenMobile } = useSidebar()

const collapsed = computed(() => state.value === 'collapsed' && !isMobile.value)

const allowed = (i: NavItem) => !i.perm || session.can(...i.perm)
const groups = computed(() =>
  NAV.map((g) => ({
    ...g,
    items: g.items
      .filter(allowed)
      .map((i) => ({ ...i, children: i.children?.filter(allowed) }))
      .filter((i) => !i.children || i.children.length),
  })).filter((g) => g.items.length),
)

function isActive(item: NavItem): boolean {
  if (item.children) return item.children.some(isActive)
  const name = item.to?.name
  if (!name) return false
  return route.name === name || (NAV_MATCH[name]?.includes(String(route.name)) ?? false)
}

function go() {
  if (isMobile.value) setOpenMobile(false)
}

async function logout() {
  await session.signOut()
  router.replace({ name: 'login' })
}
</script>

<template>
  <Sidebar collapsible="icon" class="border-r">
    <SidebarHeader class="gap-3 px-3 pt-4">
      <RouterLink :to="{ name: 'dashboard' }" class="flex h-9 items-center px-1" @click="go">
        <Logo v-if="!collapsed" class="h-7" />
        <Logo v-else mark class="h-7" />
      </RouterLink>

      <!-- Seletor de ONG -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton size="lg" class="border bg-background shadow-xs data-[state=open]:bg-sidebar-accent" :tooltip="session.org?.name">
            <span class="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-600 text-xs font-bold text-white">
              <img v-if="session.org?.logoKey" :src="fileUrl(session.org.logoKey)!" class="size-full object-cover" alt="" />
              <template v-else>{{ initials(session.org?.name) }}</template>
            </span>
            <span class="grid min-w-0 flex-1 text-left leading-tight">
              <span class="truncate text-sm font-semibold text-foreground">{{ session.org?.name }}</span>
              <span class="truncate text-xs text-muted-foreground">{{ session.roleLabel }}</span>
            </span>
            <ChevronsUpDown class="ml-auto size-4 text-muted-foreground" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-64" align="start" :side="isMobile ? 'bottom' : 'right'">
          <DropdownMenuLabel class="text-xs text-muted-foreground">Organizações</DropdownMenuLabel>
          <DropdownMenuItem v-for="m in session.memberships" :key="m.orgId" @click="session.switchOrg(m.orgId); router.push({ name: 'dashboard' })">
            <Building2 class="size-4" />
            <span class="truncate">{{ m.org.name }}</span>
            <Check v-if="m.orgId === session.orgId" class="ml-auto size-4 text-brand-600" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="router.push({ name: 'onboarding' })">
            <Plus class="size-4" /> Cadastrar outra ONG
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarHeader>

    <SidebarContent class="px-1">
      <SidebarGroup v-for="g in groups" :key="g.label">
        <SidebarGroupLabel class="text-[11px] tracking-wider uppercase">{{ g.label }}</SidebarGroupLabel>
        <SidebarMenu class="gap-0.5">
          <template v-for="item in g.items" :key="item.title">
            <!-- item com submenu -->
            <Collapsible v-if="item.children && !collapsed" as-child :default-open="isActive(item)" class="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger as-child>
                  <SidebarMenuButton class="h-9">
                    <component :is="item.icon" />
                    <span>{{ item.title }}</span>
                    <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem v-for="sub in item.children" :key="sub.title">
                      <SidebarMenuSubButton as-child :is-active="isActive(sub)">
                        <RouterLink :to="sub.to!" @click="go">{{ sub.title }}</RouterLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            <!-- item simples (ou submenu com sidebar recolhida → abre o primeiro filho) -->
            <SidebarMenuItem v-else>
              <SidebarMenuButton as-child :is-active="isActive(item)" :tooltip="item.title" class="h-9">
                <RouterLink :to="(item.to ?? item.children![0]!.to)!" @click="go">
                  <component :is="item.icon" />
                  <span>{{ item.title }}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </template>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter class="p-3">
      <SidebarMenu>
        <SidebarMenuItem>
          <div
            class="flex items-center gap-2.5 rounded-xl border bg-background p-2 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:p-0"
          >
            <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
              {{ initials(session.user?.name) }}
            </span>
            <span class="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
              <span class="truncate text-sm font-semibold text-foreground">{{ session.user?.name }}</span>
              <span class="truncate text-xs text-muted-foreground">{{ session.user?.email }}</span>
            </span>
            <button
              type="button"
              class="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground group-data-[collapsible=icon]:hidden"
              title="Sair"
              @click="logout"
            >
              <LogOut class="size-4" />
            </button>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
