import type { WorkerRuntime } from './__fixtures__/runtime'

import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'

import { createWorkerRuntime } from './__fixtures__/runtime'

describe('sortableDnD', () => {
  let runtime: WorkerRuntime<{
    cancelCount: number;
    items: Array<{ id: string; title: string }>;
    lastDrop: {
      accepted: boolean;
      itemId: string;
      placement: 'before' | 'after' | 'inside' | null;
      sourceContainerId: string;
      targetContainerId: string | null;
      targetIndex: number | null;
      targetItemId: string | null;
    } | null;
  }> | null = null

  const pointer = (
    type: string,
    coordinates: { clientX: number; clientY: number },
    options: Partial<PointerEventInit> = {}
  ) => {
    return new PointerEvent(type, {
      bubbles: true,
      button: 0,
      clientX: coordinates.clientX,
      clientY: coordinates.clientY,
      composed: true,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'mouse',
      ...options,
    })
  }

  const center = (element: Element) => {
    const rect = element.getBoundingClientRect()

    return {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    }
  }

  afterEach(async () => {
    if (runtime) {
      await runtime.tearDown()
      runtime = null
    }
  })

  test('reorders items through drag handles and clears host styling state after drop', async () => {
    runtime = await createWorkerRuntime({
      worker: new Worker(new URL('./__fixtures__/workers/sortable.worker.ts', import.meta.url), {
        type: 'module',
      }),
      provider: {},
    })

    const firstHandle = runtime.container.querySelector('[data-testid="handle-task-1"]')
    const lastItem = runtime.container.querySelector('[data-testid="item-task-3"]')
    const firstItem = runtime.container.querySelector('[data-testid="item-task-1"]')

    if (
      !(firstHandle instanceof HTMLButtonElement)
      || !(firstItem instanceof HTMLDivElement)
      || !(lastItem instanceof HTMLDivElement)
    ) {
      throw new Error('Sortable fixture was not rendered')
    }

    await runtime.reset()

    const start = center(firstHandle)
    const targetRect = lastItem.getBoundingClientRect()
    const target = {
      clientX: targetRect.left + targetRect.width / 2,
      clientY: targetRect.bottom - 2,
    }

    firstHandle.dispatchEvent(pointer('pointerdown', start))
    document.dispatchEvent(pointer('pointermove', {
      clientX: start.clientX + 2,
      clientY: start.clientY + 2,
    }))
    document.dispatchEvent(pointer('pointermove', target))

    expect(firstItem.getAttribute('data-dnd-dragging')).toBe('true')
    expect(lastItem.getAttribute('data-dnd-placement')).toBe('after')
    expect(lastItem.getAttribute('data-dnd-drop-allowed')).toBe('true')

    document.dispatchEvent(pointer('pointerup', target))

    await expect.poll(async () => {
      await runtime?.flush()
      return await runtime?.read()
    }).toMatchObject({
      cancelCount: 0,
      items: [
        { id: 'task-2', title: 'Second' },
        { id: 'task-3', title: 'Third' },
        { id: 'task-1', title: 'First' },
      ],
      lastDrop: {
        accepted: true,
        itemId: 'task-1',
        placement: 'after',
        sourceContainerId: 'tasks',
        targetContainerId: 'tasks',
        targetIndex: 2,
        targetItemId: 'task-3',
      },
    })

    expect(firstItem.hasAttribute('data-dnd-dragging')).toBe(false)
    expect(lastItem.hasAttribute('data-dnd-placement')).toBe(false)
    expect(lastItem.hasAttribute('data-dnd-drop-allowed')).toBe(false)
  })
})
