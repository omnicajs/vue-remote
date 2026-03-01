import {
  defineComponent,
  h,
  ref,
} from 'vue'

import { createWorkerEndpoint } from '../endpoint'

const clone = <T>(value: T): T => {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T
}

const state = { events: [] as unknown[] }
const collect = (type: string, payload: unknown) => {
  state.events.push({ type, payload: clone(payload) })
}

createWorkerEndpoint(defineComponent({
  setup () {
    const model = ref('')

    return () => h('section', { id: 'serialization-root' }, [
      h('input', {
        id: 'serialization-input',
        value: model.value,
        onInput: (event: unknown) => {
          collect('input', event)

          const target = (event as { target?: { value?: string } | null }).target
          model.value = target?.value ?? ''
        },
        onFocus: (event: unknown) => collect('focus', event),
        onWheel: (event: unknown) => collect('wheel', event),
      }),
      h('button', {
        id: 'serialization-button',
        onKeydown: (event: unknown) => collect('keydown', event),
        onMousedown: (event: unknown) => collect('mousedown', event),
        onPointerdown: (event: unknown) => collect('pointerdown', event),
        onTouchstart: (event: unknown) => collect('touchstart', event),
        onDragstart: (event: unknown) => collect('dragstart', event),
      }, 'Capture events'),
      h('p', { id: 'serialization-model' }, model.value),
    ])
  },
}), {
  state,
  components: ['VButton'],
  resetState: (state) => {
    state.events.length = 0
  },
  snapshotState: (state) => ({
    events: state.events,
  }),
})
