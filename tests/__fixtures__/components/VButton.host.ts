import { defineComponent, h } from 'vue'

export const VButton = defineComponent({
  name: 'VButton',

  emits: ['click'],

  setup (_, { attrs, emit, slots }) {
    return () => h('button', {
      ...attrs,
      type: 'button',
      onClick: () => emit('click'),
    }, slots.default?.())
  },
})
