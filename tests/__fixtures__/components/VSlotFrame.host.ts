import {
  defineComponent,
  h,
} from 'vue'

export const VSlotFrame = defineComponent({
  name: 'VSlotFrame',

  props: {
    id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
  },

  setup (props, { slots }) {
    return () => h('section', {
      id: props.id,
      class: 'slot-frame',
    }, [
      h('h1', { class: 'slot-frame__title' }, props.title),
      slots.addon
        ? h('div', { class: 'slot-frame__addon' }, slots.addon())
        : null,
      slots.default?.(),
    ])
  },
})
