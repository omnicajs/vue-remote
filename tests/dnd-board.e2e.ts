import type { WorkerRuntime } from './__fixtures__/runtime'

import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'

import { VCard } from './__fixtures__/components/VCard.host'
import { createWorkerRuntime } from './__fixtures__/runtime'

describe('sortableBoardDnD', () => {
  let runtime: WorkerRuntime<{
    active: Array<{ id: string; title: string }>;
    done: Array<{ id: string; title: string }>;
    dragCancels: number;
    dragEnds: number;
    dragEnters: number;
    dragLeaves: number;
    dragMoves: number;
    dragStarts: number;
    horizontal: Array<{ id: string; title: string }>;
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
  ) => new PointerEvent(type, {
    bubbles: true,
    button: 0,
    clientX: coordinates.clientX,
    clientY: coordinates.clientY,
    composed: true,
    isPrimary: true,
    pointerId: 7,
    pointerType: 'mouse',
    ...options,
  })

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

  test('moves into an empty container with inside placement and host-component item roots', async () => {
    runtime = await createWorkerRuntime({
      worker: new Worker(new URL('./__fixtures__/workers/sortable-board.worker.ts', import.meta.url), {
        type: 'module',
      }),
      provider: {
        VCard,
      },
    })

    const handle = runtime.container.querySelector('[data-testid="active-handle-task-a"]')
    const source = runtime.container.querySelector('#card-task-a')
    const done = runtime.container.querySelector('#board-done')

    if (
      !(handle instanceof HTMLButtonElement)
      || !(source instanceof HTMLElement)
      || !(done instanceof HTMLDivElement)
    ) {
      throw new Error('Board fixture was not rendered')
    }

    const start = center(handle)
    const target = center(done)

    handle.dispatchEvent(pointer('pointerdown', start))
    document.dispatchEvent(pointer('pointermove', {
      clientX: start.clientX + 10,
      clientY: start.clientY + 10,
    }))
    document.dispatchEvent(pointer('pointermove', target))

    expect(done.getAttribute('data-dnd-placement')).toBe('inside')
    expect(done.getAttribute('data-dnd-drop-allowed')).toBe('true')

    document.dispatchEvent(pointer('pointerup', target))

    await expect.poll(async () => {
      await runtime?.flush()
      return await runtime?.read()
    }).toMatchObject({
      active: [{ id: 'task-b', title: 'Beta' }],
      done: [{ id: 'task-a', title: 'Alpha' }],
      dragEnds: 1,
      dragStarts: 1,
      lastDrop: {
        accepted: true,
        itemId: 'task-a',
        placement: 'inside',
        sourceContainerId: 'active',
        targetContainerId: 'done',
        targetIndex: 0,
        targetItemId: null,
      },
    })

    expect(source.hasAttribute('data-dnd-dragging')).toBe(false)
    expect(done.hasAttribute('data-dnd-placement')).toBe(false)
  })

  test('marks forbidden targets, supports handles without `for`, horizontal reorder, and cancel by Escape', async () => {
    runtime = await createWorkerRuntime({
      worker: new Worker(new URL('./__fixtures__/workers/sortable-board.worker.ts', import.meta.url), {
        type: 'module',
      }),
      provider: {
        VCard,
      },
    })

    const forbiddenHandle = runtime.container.querySelector('[data-testid="active-handle-task-b"]')
    const forbiddenTarget = runtime.container.querySelector('#board-reject')
    const horizontalHandle = runtime.container.querySelector('[data-testid="horizontal-handle-lane-b"]')
    const horizontalFirst = runtime.container.querySelector('[data-testid="horizontal-item-lane-a"]')

    if (
      !(forbiddenHandle instanceof HTMLButtonElement)
      || !(forbiddenTarget instanceof HTMLDivElement)
      || !(horizontalHandle instanceof HTMLButtonElement)
      || !(horizontalFirst instanceof HTMLDivElement)
    ) {
      throw new Error('Board fixture was not rendered')
    }

    const forbiddenStart = center(forbiddenHandle)
    const forbiddenPoint = center(forbiddenTarget)

    forbiddenHandle.dispatchEvent(pointer('pointerdown', forbiddenStart))
    document.dispatchEvent(pointer('pointermove', {
      clientX: forbiddenStart.clientX + 8,
      clientY: forbiddenStart.clientY + 8,
    }))
    document.dispatchEvent(pointer('pointermove', forbiddenPoint))

    expect(forbiddenTarget.getAttribute('data-dnd-drop-forbidden')).toBe('true')

    document.dispatchEvent(pointer('pointerup', forbiddenPoint))

    await expect.poll(async () => {
      await runtime?.flush()
      return await runtime?.read()
    }).toMatchObject({
      active: [
        { id: 'task-a', title: 'Alpha' },
        { id: 'task-b', title: 'Beta' },
      ],
      dragEnds: 1,
      dragStarts: 1,
      lastDrop: null,
    })

    const horizontalStart = center(horizontalHandle)
    const horizontalRect = horizontalFirst.getBoundingClientRect()
    const beforeFirst = {
      clientX: horizontalRect.left + 2,
      clientY: horizontalRect.top + horizontalRect.height / 2,
    }

    horizontalHandle.dispatchEvent(pointer('pointerdown', horizontalStart, {
      pointerId: 9,
    }))
    document.dispatchEvent(pointer('pointermove', {
      clientX: horizontalStart.clientX - 12,
      clientY: horizontalStart.clientY,
    }, { pointerId: 9 }))
    document.dispatchEvent(pointer('pointermove', beforeFirst, {
      pointerId: 9,
    }))

    expect(horizontalFirst.getAttribute('data-dnd-placement')).toBe('before')

    document.dispatchEvent(pointer('pointerup', beforeFirst, {
      pointerId: 9,
    }))

    await expect.poll(async () => {
      await runtime?.flush()
      return await runtime?.read()
    }).toMatchObject({
      horizontal: [
        { id: 'lane-b', title: 'Lane B' },
        { id: 'lane-a', title: 'Lane A' },
      ],
      lastDrop: {
        accepted: true,
        itemId: 'lane-b',
        placement: 'before',
        sourceContainerId: 'horizontal',
        targetContainerId: 'horizontal',
        targetIndex: 0,
        targetItemId: 'lane-a',
      },
    })

    const cancelHandle = runtime.container.querySelector('[data-testid="active-handle-task-b"]')

    if (!(cancelHandle instanceof HTMLButtonElement)) {
      throw new Error('Cancel handle was not rendered')
    }

    const cancelStart = center(cancelHandle)

    cancelHandle.dispatchEvent(pointer('pointerdown', cancelStart, {
      pointerId: 11,
    }))
    document.dispatchEvent(pointer('pointermove', {
      clientX: cancelStart.clientX + 12,
      clientY: cancelStart.clientY + 12,
    }, { pointerId: 11 }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    await expect.poll(async () => {
      await runtime?.flush()
      return await runtime?.read()
    }).toMatchObject({
      dragCancels: 1,
      dragEnters: expect.any(Number),
      dragLeaves: expect.any(Number),
      dragMoves: expect.any(Number),
      dragStarts: 3,
    })

    expect(forbiddenTarget.hasAttribute('data-dnd-drop-forbidden')).toBe(false)
    expect(horizontalFirst.hasAttribute('data-dnd-placement')).toBe(false)
  })
})
