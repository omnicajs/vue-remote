import type { SortableKanbanSandboxHandle } from '../web/sandboxes/sortable-kanban/host'

import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'
import { page } from 'vitest/browser'

import { mountSortableKanbanSandbox } from '../web/sandboxes/sortable-kanban/host'

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
  pointerId: 15,
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

const required = <T>(value: T | null | undefined, message: string): T => {
  if (value == null) {
    throw new Error(message)
  }

  return value
}

const readSnapshot = (element: HTMLElement) => {
  return JSON.parse(element.textContent ?? '{}') as {
    lanes: {
      backlog: Array<{ id: string }>;
      doing: Array<{ id: string }>;
      done: Array<{ id: string }>;
    };
    lastAction: string;
  }
}

const installSandboxStyles = () => {
  const style = document.createElement('style')

  style.textContent = `
    .worker-kanban-sandbox .sandbox-lane__cards {
      display: grid;
      gap: 12px;
      align-content: start;
    }

    .worker-kanban-sandbox .sandbox-lane__cards--empty {
      position: relative;
      grid-template-rows: minmax(0, 1fr);
      align-content: stretch;
    }

    .worker-kanban-sandbox .sandbox-lane__cards--empty > * {
      grid-area: 1 / 1;
    }

    .worker-kanban-sandbox .sandbox-lane__empty {
      position: relative;
      z-index: 1;
    }

    .worker-kanban-sandbox .sandbox-card {
      position: relative;
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 14px;
      box-sizing: border-box;
      border: 1px solid rgba(15, 23, 42, 0.14);
      border-radius: 15px;
      background: #fff;
    }

    .worker-kanban-sandbox .sandbox-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 0;
    }

    .worker-kanban-sandbox .sandbox-card__title {
      margin: 0;
    }

    .worker-kanban-sandbox [data-dnd-dragging='true'] {
      visibility: hidden;
      opacity: 0;
      box-shadow: none;
      pointer-events: none;
    }

    [data-dnd-overlay='true'] {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 9999;
      width: var(--dnd-overlay-width);
      pointer-events: none;
      transform: translate3d(-9999px, -9999px, 0);
    }

    [data-dnd-overlay='true'] .sandbox-card {
      position: relative;
      display: grid;
      gap: 10px;
      width: 100%;
      min-width: 0;
      margin: 0;
      padding: 14px;
      box-sizing: border-box;
      border: 1px solid rgba(15, 23, 42, 0.14);
      border-radius: 15px;
      background: #fff;
    }

    [data-dnd-overlay='true'] .sandbox-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 0;
    }

    [data-dnd-overlay='true'] .sandbox-card__title {
      margin: 0;
    }

    .worker-kanban-sandbox [data-dnd-placeholder='true'] {
      width: 100%;
      min-width: 0;
      justify-self: stretch;
      align-self: stretch;
      margin: 0;
      box-sizing: border-box;
      border: 1px dashed rgba(37, 99, 235, 0.45);
      border-radius: 15px;
      background: rgba(37, 99, 235, 0.08);
    }

    .worker-kanban-sandbox [data-dnd-placeholder='true'] > * {
      visibility: hidden;
    }

    .worker-kanban-sandbox .sandbox-lane__cards--empty [data-dnd-placeholder='true'] {
      position: absolute;
      inset: 0;
      visibility: hidden;
      pointer-events: none;
    }
  `

  document.head.append(style)
}

const rectSnapshot = (element: Element) => {
  const rect = element.getBoundingClientRect()

  return {
    height: rect.height,
    width: rect.width,
  }
}

describe('workerKanbanSandbox', () => {
  let handle: SortableKanbanSandboxHandle | null = null

  afterEach(async () => {
    if (handle != null) {
      await handle.destroy()
      handle = null
    }

    document.body.innerHTML = ''
  })

  test('mounts a dedicated worker sandbox, moves cards across lanes, and resets the board', async () => {
    await page.viewport(1440, 1200)
    installSandboxStyles()

    const root = document.createElement('section')
    root.className = 'worker-kanban-sandbox'
    const runtimeRoot = document.createElement('div')

    root.append(runtimeRoot)
    document.body.append(root)

    handle = await mountSortableKanbanSandbox({
      rootElement: runtimeRoot,
    }, {
      booting: 'Booting dedicated Worker runtime...',
      failed: 'Worker sandbox failed',
      ready: 'Running in a dedicated Worker runtime',
      resetLabel: 'Reset board',
      snapshotLabel: 'Board snapshot',
      snapshotUnavailable: 'Remote snapshot is unavailable.',
      unsupported: 'This browser does not support module workers.',
    })

    await expect.poll(() => {
      return root.querySelector<HTMLElement>('[data-sandbox-status]')?.textContent ?? null
    }).toBe('Running in a dedicated Worker runtime')

    const preview = required(
      root.querySelector<HTMLElement>('.worker-kanban-sandbox__preview'),
      'Worker sandbox preview was not rendered'
    )
    const snapshot = required(
      root.querySelector<HTMLElement>('[data-sandbox-snapshot]'),
      'Worker sandbox snapshot was not rendered'
    )
    const reset = required(
      root.querySelector<HTMLButtonElement>('[data-sandbox-reset]'),
      'Worker sandbox reset button was not rendered'
    )

    const startHandle = preview.querySelector('[data-testid="sandbox-handle-task-1"]')
    const targetCard = preview.querySelector('[data-testid="sandbox-card-task-2"]')

    if (
      !(startHandle instanceof HTMLButtonElement)
      || !(targetCard instanceof HTMLElement)
    ) {
      throw new Error('Worker sandbox board was not rendered')
    }

    const sourceCard = preview.querySelector('[data-testid="sandbox-card-task-1"]')
    const backlogCards = required(
      preview.querySelector<HTMLElement>('[data-testid="sandbox-lane-backlog"] .sandbox-lane__cards'),
      'Worker sandbox backlog lane was not rendered'
    )

    if (!(sourceCard instanceof HTMLElement)) {
      throw new Error('Worker sandbox source card was not rendered')
    }

    const originalSourceRect = rectSnapshot(sourceCard)
    const originalBacklogRect = rectSnapshot(backlogCards)

    const start = center(startHandle)
    const targetRect = targetCard.getBoundingClientRect()
    const target = {
      clientX: targetRect.left + targetRect.width / 2,
      clientY: targetRect.bottom - 2,
    }

    startHandle.dispatchEvent(pointer('pointerdown', start))
    document.dispatchEvent(pointer('pointermove', {
      clientX: start.clientX + 12,
      clientY: start.clientY + 12,
    }))
    document.dispatchEvent(pointer('pointermove', target))

    await expect.poll(() => {
      const overlay = document.querySelector('[data-dnd-overlay="true"]')
      return overlay instanceof HTMLElement && !overlay.hidden
    }).toBe(true)

    await expect.poll(() => {
      return preview.querySelectorAll('[data-dnd-placeholder="true"]').length
    }).toBe(1)

    const overlayCard = document.querySelector('[data-dnd-overlay="true"] .sandbox-card')
    const placeholder = preview.querySelector('[data-dnd-placeholder="true"]')
    const currentSourceCard = preview.querySelector('[data-testid="sandbox-card-task-1"]')

    if (
      !(overlayCard instanceof HTMLElement)
      || !(placeholder instanceof HTMLElement)
      || !(currentSourceCard instanceof HTMLElement)
    ) {
      throw new Error('Expected overlay, placeholder, and source card to exist during drag')
    }

    const overlayRect = rectSnapshot(overlayCard)
    const placeholderRect = rectSnapshot(placeholder)
    const currentSourceRect = rectSnapshot(currentSourceCard)
    const currentBacklogRect = rectSnapshot(backlogCards)

    expect(Math.abs(overlayRect.width - originalSourceRect.width)).toBeLessThan(3)
    expect(Math.abs(overlayRect.height - originalSourceRect.height)).toBeLessThan(3)
    expect(Math.abs(placeholderRect.width - originalSourceRect.width)).toBeLessThan(3)
    expect(Math.abs(placeholderRect.height - originalSourceRect.height)).toBeLessThan(3)
    expect(Math.abs(currentBacklogRect.height - originalBacklogRect.height)).toBeLessThan(3)
    expect(currentSourceRect.height).toBeLessThan(originalSourceRect.height / 2)

    document.dispatchEvent(pointer('pointerup', target))

    await expect.poll(() => readSnapshot(snapshot)).toMatchObject({
      lanes: {
        backlog: [
          { id: 'task-2' },
          { id: 'task-1' },
        ],
      },
      lastAction: expect.stringContaining('moved'),
    })

    const overlay = document.querySelector('[data-dnd-overlay="true"]')

    expect(overlay instanceof HTMLElement && overlay.hidden).toBe(true)
    expect(preview.querySelector('[data-dnd-placeholder="true"]')).toBeNull()

    reset.click()

    await expect.poll(() => readSnapshot(snapshot)).toMatchObject({
      lanes: {
        backlog: [
          { id: 'task-1' },
          { id: 'task-2' },
        ],
        doing: [
          { id: 'task-3' },
        ],
        done: [
          { id: 'task-4' },
        ],
      },
      lastAction: 'Drag cards between columns or reorder them inside a lane.',
    })
  })

  test('keeps the empty drop zone stable while hovering a card over an empty lane', async () => {
    await page.viewport(1440, 1200)
    installSandboxStyles()

    const root = document.createElement('section')
    root.className = 'worker-kanban-sandbox'
    const runtimeRoot = document.createElement('div')

    root.append(runtimeRoot)
    document.body.append(root)

    handle = await mountSortableKanbanSandbox({
      rootElement: runtimeRoot,
    }, {
      booting: 'Booting dedicated Worker runtime...',
      failed: 'Worker sandbox failed',
      ready: 'Running in a dedicated Worker runtime',
      resetLabel: 'Reset board',
      snapshotLabel: 'Board snapshot',
      snapshotUnavailable: 'Remote snapshot is unavailable.',
      unsupported: 'This browser does not support module workers.',
    })

    await expect.poll(() => {
      return root.querySelector<HTMLElement>('[data-sandbox-status]')?.textContent ?? null
    }).toBe('Running in a dedicated Worker runtime')

    const preview = required(
      root.querySelector<HTMLElement>('.worker-kanban-sandbox__preview'),
      'Worker sandbox preview was not rendered'
    )
    const snapshot = required(
      root.querySelector<HTMLElement>('[data-sandbox-snapshot]'),
      'Worker sandbox snapshot was not rendered'
    )

    const doneHandle = required(
      preview.querySelector<HTMLButtonElement>('[data-testid="sandbox-handle-task-4"]'),
      'Done lane handle was not rendered'
    )
    const doingCard = required(
      preview.querySelector<HTMLElement>('[data-testid="sandbox-card-task-3"]'),
      'Doing lane card was not rendered'
    )

    const doneStart = center(doneHandle)
    const doingRect = doingCard.getBoundingClientRect()
    const moveTask4Target = {
      clientX: doingRect.left + doingRect.width / 2,
      clientY: doingRect.bottom - 2,
    }

    doneHandle.dispatchEvent(pointer('pointerdown', doneStart))
    document.dispatchEvent(pointer('pointermove', {
      clientX: doneStart.clientX + 12,
      clientY: doneStart.clientY + 12,
    }))
    document.dispatchEvent(pointer('pointermove', moveTask4Target))
    document.dispatchEvent(pointer('pointerup', moveTask4Target))

    await expect.poll(() => readSnapshot(snapshot)).toMatchObject({
      lanes: {
        done: [],
      },
    })

    const emptyDoneZone = required(
      preview.querySelector<HTMLElement>('[data-testid="sandbox-lane-done"] .sandbox-lane__empty'),
      'Done empty drop zone was not rendered'
    )
    const emptyDoneRectBefore = rectSnapshot(emptyDoneZone)

    const backlogHandle = required(
      preview.querySelector<HTMLButtonElement>('[data-testid="sandbox-handle-task-1"]'),
      'Backlog handle was not rendered'
    )
    const emptyDoneTarget = center(emptyDoneZone)
    const backlogStart = center(backlogHandle)

    backlogHandle.dispatchEvent(pointer('pointerdown', backlogStart))
    document.dispatchEvent(pointer('pointermove', {
      clientX: backlogStart.clientX + 12,
      clientY: backlogStart.clientY + 12,
    }))
    document.dispatchEvent(pointer('pointermove', emptyDoneTarget))

    await expect.poll(() => {
      return preview.querySelectorAll('[data-dnd-placeholder="true"]').length
    }).toBe(0)

    const emptyDoneRectDuring = rectSnapshot(emptyDoneZone)

    expect(Math.abs(emptyDoneRectDuring.width - emptyDoneRectBefore.width)).toBeLessThan(1)
    expect(Math.abs(emptyDoneRectDuring.height - emptyDoneRectBefore.height)).toBeLessThan(1)

    document.dispatchEvent(pointer('pointerup', emptyDoneTarget))
  })
})
