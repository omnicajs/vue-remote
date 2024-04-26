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

run(defineComponent({
  setup () {
    const text = ref('')

    return () => [
      h(VInput, {
        'onUpdate:value': (value: string) => text.value = value,
        value: text.value,
        placeholder: 'vue-remote',
      }),
      h(VButton, {
        onClick: () => text.value = '',
      }, 'Clear'),
    ]
  },
}), {
  components: keysOf({ VButton, VInput }),
})