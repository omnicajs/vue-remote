import {
  defineComponent,
  h,
  ref,
} from 'vue'

import { defineRemoteComponent } from '@/vue/remote'

import { keysOf } from '@/common/scaffolding'

import { run } from '~tests/e2e/scaffolding/remote'

const VButton = defineRemoteComponent('VButton')
const VInput = defineRemoteComponent('VInput', [
  'update:value',
] as unknown as {
  'update:value': (value: string) => true,
})

const VRandom = defineRemoteComponent('VRandom', [
  'change',
] as unknown as {
  'change': (value: string) => void,
})

run(defineComponent({
  setup () {
    const text = ref('')
    const address = ref('0')

    return () => [
      h(VInput, {
        'onUpdate:value': (value: string) => text.value = value,
        value: text.value,
        placeholder: 'vue-remote',
      }),
      h(VRandom, {
        'onChange': (value: string) => address.value = value,
        address: address.value,
        apiKey: 'dd51f938-0693-457d-ae62-6d50fa668d0a',
      }),
      h(VButton, {
        onClick: () => text.value = '',
      }, 'Clear'),
    ]
  },
}), {
  components: keysOf({ VButton, VInput, VRandom }),
})