import {
  describe,
  expect,
  test,
} from 'vitest'

import { KIND_TEXT } from '@/dom/common/tree'
import { createTreeContext } from '@/dom/remote/context'

describe('createTreeContext', () => {
  test('ignores duplicate collect and rejects invoke for foreign nodes', () => {
    const context = createTreeContext(() => {})
    const fakeNode = {
      id: 'n1',
      kind: KIND_TEXT,
      text: '',
      serialize: () => ({ id: 'n1', kind: KIND_TEXT, text: '' }),
    } as never

    context.collect(fakeNode)
    context.collect(fakeNode)

    expect(() => context.invoke({ id: 'x' } as never, 'method', [])).toThrow(
      'Cannot invoke method for a node that was not created by this remote root'
    )
  })
})
