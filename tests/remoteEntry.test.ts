import {
  describe,
  expect,
  test,
} from 'vitest'

import * as remote from '@/vue/remote'

describe('remote entrypoint', () => {
  test('exports nextTick', () => {
    expect(remote.nextTick).toBeTypeOf('function')
  })

  test('exports lifecycle reason constants', () => {
    expect(remote.REMOTE_LIFECYCLE_REASON_HOST_UNMOUNTED).toBe('host-unmounted')
  })
})
