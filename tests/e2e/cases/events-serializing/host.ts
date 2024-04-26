import { createProvider } from '@/vue/host'

import {
  mount,
  src,
} from '~tests/e2e/scaffolding/host'

mount(createProvider(), src('events-serializing'))