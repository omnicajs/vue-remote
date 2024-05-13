import defineRemoteComponent from '@/vue/remote/defineRemoteComponent'

const VButton = defineRemoteComponent('VButton', [
  'click',
] as unknown as {
  'click': () => true,
})

const VCard = defineRemoteComponent('VCard', [], [
  'title',
])

const VInput = defineRemoteComponent('VInput', [
  'update:value',
] as unknown as {
  'update:value': (value: string) => void,
})

const VRandom = defineRemoteComponent('VRandom', [
  'change',
] as unknown as {
  'change': (value: string) => void,
})

const VYandexMap = defineRemoteComponent('VYandexMap', [
  'change',
] as unknown as {
  'change': (address: string) => void,
})

export {
  VButton,
  VCard,
  VInput,
  VRandom,
  VYandexMap,
}