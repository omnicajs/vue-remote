import defineRemoteComponent from '@/remote/defineRemoteComponent'

export default defineRemoteComponent('VButton', [
  'click',
] as unknown as {
  'click': () => true,
})