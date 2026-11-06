<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { HeartHandshake, LayoutDashboard, Menu, PawPrint, Plus, Search } from '@lucide/vue'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppSidebar from './AppSidebar.vue'
import CommandPalette from './CommandPalette.vue'
import RealtimeBadge from './RealtimeBadge.vue'
import MobileMenuButton from './MobileMenuButton.vue'
import { QUICK_ACTIONS } from '@/lib/quick-actions'
import { useSession } from '@/stores/session'

const route = useRoute()
const session = useSession()
const searchOpen = ref(false)
const quickOpen = ref(false)
const actions = computed(() => QUICK_ACTIONS.filter((a) => session.can(...a.perm)))
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset class="min-w-0 bg-background">
        <!-- Cabeçalho -->
        <header
          class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:h-16 sm:px-6"
        >
          <SidebarTrigger class="hidden md:inline-flex" />
          <div class="hidden h-5 w-px bg-border md:block" />
          <nav class="flex min-w-0 items-center gap-1.5 text-sm whitespace-nowrap">
            <span class="hidden max-w-48 truncate text-muted-foreground lg:inline">{{ session.org?.name }}</span>
            <span class="hidden text-muted-foreground lg:inline">/</span>
            <span class="truncate font-medium">{{ route.meta.title }}</span>
          </nav>

          <div class="ml-auto flex items-center gap-2">
            <button
              type="button"
              class="flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground shadow-xs transition hover:text-foreground sm:w-64"
              @click="searchOpen = true"
            >
              <Search class="size-4" />
              <span class="hidden sm:inline">Buscar...</span>
              <kbd class="ml-auto hidden rounded border bg-muted px-1.5 text-[10px] font-medium sm:inline">Ctrl ⇧ K</kbd>
            </button>
            <RealtimeBadge />
            <DropdownMenu v-if="actions.length">
              <DropdownMenuTrigger as-child>
                <Button class="hidden md:inline-flex"><Plus /> Novo</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-60">
                <DropdownMenuLabel class="text-xs text-muted-foreground">Atalhos</DropdownMenuLabel>
                <DropdownMenuItem v-for="a in actions" :key="a.title" as-child>
                  <RouterLink :to="a.to" class="flex items-center gap-2.5">
                    <span :class="['flex size-7 items-center justify-center rounded-md', a.tone]"><component :is="a.icon" class="size-4" /></span>
                    <span>{{ a.title }}</span>
                  </RouterLink>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main class="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-5 pb-28 sm:px-6 sm:pt-7 md:pb-10">
          <RouterView v-slot="{ Component }">
            <component :is="Component" :key="session.orgId" />
          </RouterView>
        </main>

        <!-- Barra inferior (celular) -->
        <nav
          class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur md:hidden"
        >
          <RouterLink
            :to="{ name: 'dashboard' }"
            class="flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium text-muted-foreground"
            exact-active-class="!text-brand-600"
          >
            <LayoutDashboard class="size-5" /> Painel
          </RouterLink>
          <RouterLink
            :to="{ name: 'animals' }"
            class="flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium text-muted-foreground"
            active-class="!text-brand-600"
          >
            <PawPrint class="size-5" /> Animais
          </RouterLink>
          <div class="flex justify-center">
            <button
              type="button"
              class="-mt-5 flex size-13 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30 active:scale-95"
              aria-label="Novo"
              @click="quickOpen = true"
            >
              <Plus class="size-6" />
            </button>
          </div>
          <RouterLink
            :to="{ name: 'adoptions' }"
            class="flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium text-muted-foreground"
            active-class="!text-brand-600"
          >
            <HeartHandshake class="size-5" /> Adoções
          </RouterLink>
          <MobileMenuButton>
            <Menu class="size-5" /> Menu
          </MobileMenuButton>
        </nav>

        <Sheet v-model:open="quickOpen">
          <SheetContent side="bottom" class="rounded-t-3xl pb-[max(env(safe-area-inset-bottom),1rem)]">
            <SheetHeader>
              <SheetTitle>O que você quer registrar?</SheetTitle>
              <SheetDescription>Atalhos rápidos</SheetDescription>
            </SheetHeader>
            <div class="grid grid-cols-2 gap-2 px-4 pb-2">
              <RouterLink
                v-for="a in actions"
                :key="a.title"
                :to="a.to"
                class="flex flex-col gap-2 rounded-2xl border bg-card p-3 active:bg-muted"
                @click="quickOpen = false"
              >
                <span :class="['flex size-9 items-center justify-center rounded-xl', a.tone]"><component :is="a.icon" class="size-5" /></span>
                <span class="text-sm font-semibold leading-tight">{{ a.title }}</span>
                <span class="text-xs text-muted-foreground">{{ a.description }}</span>
              </RouterLink>
            </div>
          </SheetContent>
        </Sheet>

        <CommandPalette v-model:open="searchOpen" />
      </SidebarInset>
    </SidebarProvider>
  </TooltipProvider>
</template>
