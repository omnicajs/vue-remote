import {
  defineComponent,
  h,
} from 'vue'

export const VInput = defineComponent({
  name: 'VInput',

  props: {
    value: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
  },

  emits: ['update:value'],

  setup (props, { attrs, emit }) {
    return () => h('input', {
      ...attrs,
      type: 'text',
      value: props.value,
      placeholder: props.placeholder,
      onInput: (event: Event) => {
        const target = event.target as HTMLInputElement | null
        emit('update:value', target?.value ?? '')
      },
    })
  },
})
