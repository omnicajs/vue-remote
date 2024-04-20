import defineRemoteComponent from '@/vue/remote/defineRemoteComponent'

const VButton = defineRemoteComponent('VButton', [
  'click',
] as unknown as {
  'click': () => true,
})

const VInput = defineRemoteComponent('VInput', [
  'update:value',
] as unknown as {
  'update:value': (value: string) => void,
})

export {
  VButton,
  VInput,
}