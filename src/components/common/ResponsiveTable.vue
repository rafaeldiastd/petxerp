<script setup lang="ts" generic="T extends { id: string }">
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

/**
 * Tabela no desktop, cards empilhados no celular (< md).
 * Slots: cell-<key>, mobile (card inteiro), actions, empty
 */
export interface Column {
  key: string
  label: string
  class?: string
  align?: 'left' | 'right' | 'center'
}

const props = defineProps<{ rows: T[]; columns: Column[]; loading?: boolean; clickable?: boolean }>()
const emit = defineEmits<{ rowClick: [row: T] }>()

function cell(row: T, key: string) {
  const v = (row as Record<string, unknown>)[key]
  return v === null || v === undefined || v === '' ? '—' : String(v)
}
</script>

<template>
  <div>
    <!-- Desktop -->
    <div class="hidden overflow-hidden rounded-2xl border bg-card md:block">
      <Table>
        <TableHeader class="bg-muted/50">
          <TableRow class="hover:bg-transparent">
            <TableHead
              v-for="c in columns"
              :key="c.key"
              :class="cn('h-10 text-xs font-medium text-muted-foreground', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.class)"
            >
              {{ c.label }}
            </TableHead>
            <TableHead v-if="$slots.actions" class="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="loading && !rows.length">
            <TableRow v-for="i in 5" :key="i">
              <TableCell v-for="c in columns" :key="c.key"><div class="h-4 w-3/4 animate-pulse rounded bg-muted" /></TableCell>
              <TableCell v-if="$slots.actions" />
            </TableRow>
          </template>
          <TableRow
            v-for="row in rows"
            :key="row.id"
            :class="cn(props.clickable && 'cursor-pointer')"
            @click="props.clickable && emit('rowClick', row)"
          >
            <TableCell
              v-for="c in columns"
              :key="c.key"
              :class="cn('py-3', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.class)"
            >
              <slot :name="`cell-${c.key}`" :row="row">{{ cell(row, c.key) }}</slot>
            </TableCell>
            <TableCell v-if="$slots.actions" class="py-2 text-right" @click.stop>
              <slot name="actions" :row="row" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div v-if="!loading && !rows.length" class="p-4"><slot name="empty" /></div>
    </div>

    <!-- Mobile: cards -->
    <div class="space-y-2.5 md:hidden">
      <template v-if="loading && !rows.length">
        <div v-for="i in 4" :key="i" class="h-24 animate-pulse rounded-2xl border bg-card" />
      </template>
      <div
        v-for="row in rows"
        :key="row.id"
        :class="cn('relative rounded-2xl border bg-card p-3.5', props.clickable && 'active:bg-muted/50')"
        @click="props.clickable && emit('rowClick', row)"
      >
        <div v-if="$slots.actions" class="absolute top-2.5 right-2.5" @click.stop>
          <slot name="actions" :row="row" />
        </div>
        <slot name="mobile" :row="row">
          <dl class="grid gap-1.5 pr-8 text-sm">
            <div v-for="c in columns" :key="c.key" class="flex justify-between gap-3">
              <dt class="text-muted-foreground">{{ c.label }}</dt>
              <dd class="text-right font-medium"><slot :name="`cell-${c.key}`" :row="row">{{ cell(row, c.key) }}</slot></dd>
            </div>
          </dl>
        </slot>
      </div>
      <slot v-if="!loading && !rows.length" name="empty" />
    </div>
  </div>
</template>
