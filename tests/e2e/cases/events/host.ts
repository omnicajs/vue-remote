import { createProvider } from '@/vue/host'

import {
  mount,
  src,
} from '~tests/e2e/scaffolding/host'

import VButton from '~tests/integration/fixtures/host/VButton.vue'
import VInput from '~tests/integration/fixtures/host/VInput.vue'

mount(createProvider({
  VButton,
  VInput,
}), src('events'))