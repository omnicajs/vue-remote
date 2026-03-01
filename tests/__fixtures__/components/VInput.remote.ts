import { defineRemoteComponent } from '@/vue/remote'

export const VInput = defineRemoteComponent('VInput', [
  'update:value',
] as unknown as {
  'update:value': (value: string) => true;
})
