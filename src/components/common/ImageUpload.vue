<script setup lang="ts">
import { ref } from 'vue'
import { Camera, LoaderCircle, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { api, fileUrl } from '@/lib/api'
import { resizeImage } from '@/lib/image'
import { cn } from '@/lib/utils'

const model = defineModel<string | null | undefined>()
const props = withDefaults(defineProps<{ folder?: string; class?: string; label?: string; rounded?: string }>(), {
  folder: 'animals',
})

const input = ref<HTMLInputElement>()
const uploading = ref(false)

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  uploading.value = true
  try {
    const blob = await resizeImage(file)
    const name = file.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '')
    const res = await api.upload(blob instanceof File ? blob : new File([blob], name, { type: blob.type }), props.folder)
    model.value = res.key
  } catch (err) {
    toast.error((err as Error).message || 'Falha no envio da imagem')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div
    :class="
      cn(
        'group relative flex aspect-square w-full items-center justify-center overflow-hidden border-2 border-dashed bg-muted/40 transition hover:border-brand-500/50',
        rounded ?? 'rounded-2xl',
        model && 'border-solid border-transparent',
        props.class,
      )
    "
  >
    <img v-if="model" :src="fileUrl(model)!" alt="Foto" class="absolute inset-0 size-full object-cover" />
    <button
      type="button"
      class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground transition"
      :class="model ? 'bg-black/0 text-white opacity-0 group-hover:bg-black/35 group-hover:opacity-100 focus-visible:opacity-100' : 'hover:text-brand-600'"
      :disabled="uploading"
      @click="input?.click()"
    >
      <LoaderCircle v-if="uploading" class="size-6 animate-spin" />
      <template v-else>
        <Camera class="size-6" />
        <span class="text-xs font-medium">{{ model ? 'Trocar foto' : (label ?? 'Adicionar foto') }}</span>
      </template>
    </button>
    <button
      v-if="model && !uploading"
      type="button"
      class="absolute top-2 right-2 flex size-8 items-center justify-center rounded-lg bg-white/90 text-rose-600 shadow-sm transition hover:bg-white"
      aria-label="Remover foto"
      @click="model = null"
    >
      <Trash2 class="size-4" />
    </button>
    <input ref="input" type="file" accept="image/*" class="hidden" @change="onFile" />
  </div>
</template>
