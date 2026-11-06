<script setup lang="ts">
import { computed } from 'vue'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { realtimeStatus } from '@/lib/realtime'

const label = computed(
  () =>
    ({
      live: 'Ao vivo — alterações da equipe aparecem na hora',
      connecting: 'Conectando ao tempo real...',
      off: 'Tempo real desconectado — os dados atualizam ao navegar',
    })[realtimeStatus.value],
)
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <span class="flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium whitespace-nowrap text-muted-foreground">
        <span class="relative flex size-2">
          <span v-if="realtimeStatus === 'live'" class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span
            class="relative inline-flex size-2 rounded-full"
            :class="{ 'bg-emerald-500': realtimeStatus === 'live', 'bg-amber-400': realtimeStatus === 'connecting', 'bg-slate-300': realtimeStatus === 'off' }"
          />
        </span>
        <span class="hidden lg:inline">{{ realtimeStatus === 'live' ? 'Ao vivo' : realtimeStatus === 'connecting' ? 'Conectando' : 'Offline' }}</span>
      </span>
    </TooltipTrigger>
    <TooltipContent>{{ label }}</TooltipContent>
  </Tooltip>
</template>
