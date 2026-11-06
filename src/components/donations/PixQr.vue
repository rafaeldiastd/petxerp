<script setup lang="ts">
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import { Check, Copy } from '@lucide/vue'
import { useClipboard } from '@vueuse/core'
import { Button } from '@/components/ui/button'

const props = withDefaults(defineProps<{ payload: string | null; size?: number }>(), { size: 220 })
const src = ref<string | null>(null)
const { copy, copied } = useClipboard({ legacy: true })

watch(
  () => props.payload,
  async (p) => {
    src.value = p ? await QRCode.toDataURL(p, { margin: 1, width: props.size * 2, color: { dark: '#0F172A', light: '#FFFFFF' } }) : null
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="payload" class="flex flex-col items-center gap-3">
    <img v-if="src" :src="src" :width="size" :height="size" alt="QR Code Pix" class="rounded-xl border bg-white p-2" />
    <div class="w-full">
      <p class="mb-1 text-xs font-medium text-muted-foreground">Pix copia e cola</p>
      <div class="flex gap-2">
        <input :value="payload" readonly class="h-9 min-w-0 flex-1 truncate rounded-md border bg-muted/50 px-2 font-mono text-xs" @focus="($event.target as HTMLInputElement).select()" />
        <Button type="button" size="sm" :variant="copied ? 'secondary' : 'default'" @click="copy(payload)">
          <Check v-if="copied" /><Copy v-else /> {{ copied ? 'Copiado' : 'Copiar' }}
        </Button>
      </div>
    </div>
  </div>
</template>
