import {
  defineComponent,
  h,
  ref,
} from 'vue'

export const VNextTickProbe = defineComponent({
  name: 'VNextTickProbe',

  props: {
    value: {
      type: Number,
      required: true,
    },
  },

  setup (props, { expose }) {
    const element = ref<HTMLElement | null>(null)

    expose({
      readText: () => element.value?.textContent ?? '',
    })

    return () => h('div', {
      id: 'next-tick-probe',
      ref: element,
    }, `Value: ${props.value}`)
  },
})
