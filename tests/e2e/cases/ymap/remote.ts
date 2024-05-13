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

const VYandexMap = defineRemoteComponent('VYandexMap', [
  'change',
] as unknown as {
  'change': (address: string) => void,
})

run(defineComponent({
  setup () {
    const address = ref('Россия, Москва, улица Маросейка, 15')
    const apiKey = 'dd51f938-0693-457d-ae62-6d50fa668d0a'

    return () => [
      h(VInput, {
        'onUpdate:value': (value: string) => address.value = value,
        value: address.value,
        placeholder: 'vue-remote',
        style: 'width: 400px',
      }),
      h(VYandexMap, {
        'onChange': (value: string) => address.value = value,
        address: address.value,
        apiKey,
      }),
      h(VButton, {
        onClick: () => address.value = '',
      }, 'Clear'),
    ]
  },
}), {
  components: keysOf({ VButton, VInput, VYandexMap }),
})