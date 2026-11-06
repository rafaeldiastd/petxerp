<script setup lang="ts">
import { ref } from 'vue'
import { FileText, ImageIcon, LoaderCircle, Paperclip, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { api, fileUrl } from '@/lib/api'
import { resizeImage } from '@/lib/image'
import type { UploadedFile } from '@shared/types'

const model = defineModel<UploadedFile[]>({ default: () => [] })
const props = withDefaults(defineProps<{ folder?: string; label?: string; docLabel?: string; max?: number }>(), {
  folder: 'documents',
  max: 10,
})

const input = ref<HTMLInputElement>()
const uploading = ref(false)

async function onFiles(e: Event) {
  const files = [...((e.target as HTMLInputElement).files ?? [])]
  ;(e.target as HTMLInputElement).value = ''
  if (!files.length) return
  uploading.value = true
  try {
    for (const file of files.slice(0, props.max - model.value.length)) {
      const blob = file.type.startsWith('image/') ? await resizeImage(file, 2000) : file
      const upload = blob instanceof File ? blob : new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: blob.type })
      const res = await api.upload(upload, props.folder)
      model.value = [...model.value, { key: res.key, name: file.name, type: res.type, label: props.docLabel }]
    }
  } catch (err) {
    toast.error((err as Error).message || 'Falha no envio')
  } finally {
    uploading.value = false
  }
}

function remove(key: string) {
  model.value = model.value.filter((f) => f.key !== key)
}
</script>

<template>
  <div class="grid gap-2">
    <a
      v-for="f in model"
      :key="f.key"
      :href="fileUrl(f.key)!"
      target="_blank"
      rel="noopener"
      class="flex items-center gap-3 rounded-xl border bg-background px-3 py-2 text-sm transition hover:border-brand-500/40"
    >
      <ImageIcon v-if="f.type.startsWith('image/')" class="size-4 shrink-0 text-brand-600" />
      <FileText v-else class="size-4 shrink-0 text-brand-600" />
      <span class="min-w-0 flex-1 truncate">
        <span v-if="f.label" class="mr-1 font-medium">{{ f.label }}:</span>{{ f.name }}
      </span>
      <button type="button" class="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-rose-600" aria-label="Remover" @click.prevent="remove(f.key)">
        <X class="size-4" />
      </button>
    </a>
    <button
      v-if="model.length < max"
      type="button"
      class="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-3 text-sm font-medium text-muted-foreground transition hover:border-brand-500/50 hover:text-brand-600"
      :disabled="uploading"
      @click="input?.click()"
    >
      <LoaderCircle v-if="uploading" class="size-4 animate-spin" />
      <Paperclip v-else class="size-4" />
      {{ uploading ? 'Enviando...' : (label ?? 'Anexar arquivo (foto ou PDF)') }}
    </button>
    <input ref="input" type="file" accept="image/*,application/pdf" multiple class="hidden" @change="onFiles" />
  </div>
</template>
