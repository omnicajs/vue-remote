import { defineRemoteComponent } from '@/vue/remote'

export const VButton = defineRemoteComponent('VButton', [
  'click',
] as unknown as {
  click: () => true;
})
