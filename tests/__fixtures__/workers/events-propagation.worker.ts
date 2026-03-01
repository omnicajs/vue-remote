import {
  defineComponent,
  h,
  ref,
} from 'vue'

import { VButton } from '../components/VButton.remote'
import { VInput } from '../components/VInput.remote'

import { createWorkerEndpoint } from '../endpoint'

const state = {
  clicks: 0,
  text: '',
}

createWorkerEndpoint(defineComponent({
  setup () {
    const clicks = ref(0)
    const text = ref('')

    return () => h('section', { id: 'propagation-root' }, [
      h(VButton, {
        id: 'propagation-button',
        onClick: () => { state.clicks = ++clicks.value },
      }, {
        default: () => 'Increment',
      }),
      h('p', { id: 'propagation-counter' }, `Clicks: ${clicks.value}`),
      h(VInput, {
        id: 'propagation-input',
        placeholder: 'vue-remote',
        value: text.value,
        'onUpdate:value': (value: string) => {
          text.value = value
          state.text = value
        },
      }),
      h(VButton, {
        id: 'propagation-clear',
        onClick: () => {
          text.value = ''
          state.text = ''
        },
      }, {
        default: () => 'Clear',
      }),
    ])
  },
}), {
  state,
  components: ['VButton', 'VInput'],
  resetState: (state) => {
    state.clicks = 0
    state.text = ''
  },
  snapshotState: (state) => ({
    clicks: state.clicks,
    text: state.text,
  }),
})
