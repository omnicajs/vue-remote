<script lang="ts">
import { createStaticVNode, defineComponent, h } from 'vue'

import LoaderSvg from '../loader.svg'

const STATIC_HTML = `
  <div id="static-html">
    <span data-kind="label">Static content from worker</span>
    <img id="static-image" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="pixel" />
  </div>
`

export default defineComponent({
  name: 'StaticNodesRemote',

  render () {
    return h('section', { id: 'static-root' }, [
      createStaticVNode(STATIC_HTML, 1),
      h(LoaderSvg, { id: 'loader-svg' }),
    ])
  },
})
</script>
