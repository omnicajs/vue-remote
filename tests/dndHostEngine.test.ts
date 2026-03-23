import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'

import { createDndHostEngine } from '@/dnd'

describe('dnd host engine', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('cleans up presentation when the active source node is missing', () => {
    const engine = createDndHostEngine({
      callListener: () => {},
    })
    const container = document.createElement('div')

    document.body.append(container)
    engine.syncNode('container', container, {
      container: {
        containerId: 'tasks',
        orientation: 'vertical',
      },
    })

    engine.__unsafe?.setActive({
      dragMetrics: {
        anchorX: 10,
        anchorY: 10,
        height: 40,
        width: 100,
      },
      pointer: {
        clientX: 20,
        clientY: 20,
      },
      pointerId: 1,
      sessionId: 'missing-source',
      sourceHandleNodeId: 'missing-handle',
      sourceItemNodeId: 'missing-item',
      start: {
        clientX: 20,
        clientY: 20,
      },
      target: {
        accepted: true,
        containerNodeId: 'container',
        itemNodeId: null,
        placement: 'inside',
        targetIndex: 0,
      },
    })

    expect(() => engine.__unsafe?.updateStyles()).not.toThrow()

    const overlay = document.querySelector('[data-dnd-overlay="true"]')
    expect(overlay).toBeInstanceOf(HTMLElement)
    expect(overlay instanceof HTMLElement && overlay.hidden).toBe(true)

    engine.destroy()
  })
})
