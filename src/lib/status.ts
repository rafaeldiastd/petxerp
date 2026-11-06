import type { Tone } from '@/components/common/Pill.vue'

export const animalStatusTone: Record<string, Tone> = {
  sheltered: 'sky',
  available: 'green',
  treatment: 'amber',
  foster: 'violet',
  adopted: 'brand',
  returned_owner: 'teal',
  community: 'teal',
  deceased: 'gray',
}

export const adoptionStatusTone: Record<string, Tone> = { active: 'green', returned: 'amber', cancelled: 'gray' }
export const donationStatusTone: Record<string, Tone> = { pending: 'amber', paid: 'green', failed: 'red', refunded: 'gray' }
export const personTypeTone: Record<string, Tone> = {
  adopter: 'brand',
  reporter: 'amber',
  volunteer: 'green',
  donor: 'pink',
  foster: 'violet',
}
export const roleTone: Record<string, Tone> = {
  admin: 'brand',
  atendimento: 'sky',
  veterinario: 'green',
  financeiro: 'amber',
  voluntario: 'violet',
}
