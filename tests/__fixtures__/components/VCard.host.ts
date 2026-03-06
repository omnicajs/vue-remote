import {
  Comment,
  defineComponent,
  h,
} from 'vue'

export const VCard = defineComponent({
  name: 'VCard',

  props: {
    id: {
      type: String,
      required: true,
    },
  },

  setup (props, { slots }) {
    return () => h('section', {
      id: props.id,
      'aria-labelledby': slots.title ? `${props.id}-title` : undefined,
    }, [
      slots.title
        ? h('div', { id: `${props.id}-title` }, slots.title())
        : h(Comment, 'v-if'),
      slots.default?.(),
    ])
  },
})
