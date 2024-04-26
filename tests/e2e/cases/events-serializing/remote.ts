import type {
  SerializedEvent,
  SerializedDragEvent,
  SerializedInputEvent,
  SerializedFocusEvent,
  SerializedKeyboardEvent,
  SerializedMouseEvent,
  SerializedPointerEvent,
  SerializedTouchEvent,
  SerializedWheelEvent,
} from '~types/events'

import { run } from '~tests/e2e/scaffolding/remote'

import {
  defineComponent,
  h,
  ref,
  reactive,  
} from 'vue'

run(defineComponent({
  setup () {
    const text = ref('')
    const events = reactive<SerializedEvent[]>([])

    return () => [
      h('input', {
        onInput: (event: SerializedInputEvent) => {text.value = event.target.value; events.push(event)},
        onFocus: (event: SerializedFocusEvent) => events.push(event),
        onBlur: (event: SerializedFocusEvent) => events.push(event),
        onKeydown: (event: SerializedKeyboardEvent) => events.push(event),
        onWheel: (event: SerializedWheelEvent) => events.push(event),
        value: text.value,
        placeholder: 'vue-remote',
      }),
      h('button', {
        onMousedown: (event: SerializedMouseEvent) => { text.value = ''; events.push(event) },
        onPointerdown: (event: SerializedPointerEvent) => { text.value = ''; events.push(event) },
        onTouchstart: (event: SerializedTouchEvent) => events.push(event),
        onDragstart: (event: SerializedDragEvent) => events.push(event),
      }, 'Clear'),
      h('input', { id: 'events-json', type: 'hidden', value: JSON.stringify(events) }),
    ]
  },
}))