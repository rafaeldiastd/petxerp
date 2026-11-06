<script setup lang="ts">
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { useConfirmState } from '@/composables/useConfirm'

const { state, answer } = useConfirmState()
</script>

<template>
  <AlertDialog :open="!!state?.open" @update:open="(v) => !v && answer(false)">
    <AlertDialogContent v-if="state" class="sm:max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ state.title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="state.description" class="whitespace-pre-line">
          {{ state.description }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="answer(false)">{{ state.cancelText ?? 'Cancelar' }}</AlertDialogCancel>
        <AlertDialogAction
          :class="state.destructive ? buttonVariants({ variant: 'destructive' }) : ''"
          @click="answer(true)"
        >
          {{ state.confirmText ?? 'Confirmar' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
