import {
  defineComponent,
  h,
  ref,
} from 'vue'

import { VButton } from '../components/VButton.remote'
import { VInput } from '../components/VInput.remote'
import { VSlotFrame } from '../components/VSlotFrame.remote'

import { createWorkerEndpoint } from '../endpoint'

const state = {
  clicks: 0,
  slotClicks: 0,
  text: '',
}

createWorkerEndpoint(defineComponent({
  setup () {
    const clicks = ref(0)
    const slotClicks = ref(0)
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
      h(VSlotFrame, {
        id: 'propagation-slot-frame',
        title: 'Filters',
      }, {
        addon: () => h('button', {
          id: 'propagation-slot-button',
          type: 'button',
          onClick: () => {
            state.slotClicks = ++slotClicks.value
          },
        }, slotClicks.value === 0 ? 'Show filters' : 'Hide filters'),
      }),
      h('p', { id: 'propagation-slot-counter' }, `Slot clicks: ${slotClicks.value}`),
    ])
  },
}), {
  state,
  components: ['VButton', 'VInput', 'VSlotFrame'],
  resetState: (state) => {
    state.clicks = 0
    state.slotClicks = 0
    state.text = ''
  },
  snapshotState: (state) => ({
    clicks: state.clicks,
    slotClicks: state.slotClicks,
    text: state.text,
  }),
})
