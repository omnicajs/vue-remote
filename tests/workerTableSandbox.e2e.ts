import type { SortableTableSandboxHandle } from '../web/sandboxes/sortable-table/host'

import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'
import { page } from 'vitest/browser'

import sandboxCss from '../web/components/WorkerTableSandbox.css?raw'
import { mountSortableTableSandbox } from '../web/sandboxes/sortable-table/host'

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
  pointerId: 21,
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
    lastAction: string;
    rowIds: string[];
  }
}

const installSandboxStyles = () => {
  const style = document.createElement('style')

  style.dataset.testid = 'worker-table-sandbox-styles'
  style.textContent = sandboxCss
  document.head.append(style)
}

describe('workerTableSandbox', () => {
  let handle: SortableTableSandboxHandle | null = null

  afterEach(async () => {
    if (handle != null) {
      await handle.destroy()
      handle = null
    }

    document.body.innerHTML = ''
    document.head.querySelectorAll<HTMLStyleElement>('style[data-testid="worker-table-sandbox-styles"]').forEach(node => node.remove())
  })

  test('mounts a dedicated worker sandbox, reorders rows, and restores the initial order', async () => {
    await page.viewport(1440, 1200)
    installSandboxStyles()

    const root = document.createElement('section')
    root.className = 'worker-table-sandbox'
    const runtimeRoot = document.createElement('div')

    root.append(runtimeRoot)
    document.body.append(root)

    handle = await mountSortableTableSandbox({
      rootElement: runtimeRoot,
    }, {
      booting: 'Booting dedicated Worker runtime...',
      failed: 'Worker sandbox failed',
      ready: 'Running in a dedicated Worker runtime',
      resetLabel: 'Reset table',
      snapshotLabel: 'Table snapshot',
      snapshotUnavailable: 'Remote snapshot is unavailable.',
      unsupported: 'This browser does not support module workers.',
    })

    await expect.poll(() => {
      return root.querySelector<HTMLElement>('[data-sandbox-status]')?.textContent ?? null
    }).toBe('Running in a dedicated Worker runtime')

    const preview = required(
      root.querySelector<HTMLElement>('.worker-table-sandbox__preview'),
      'Worker table sandbox preview was not rendered'
    )
    const snapshot = required(
      root.querySelector<HTMLElement>('[data-sandbox-snapshot]'),
      'Worker table sandbox snapshot was not rendered'
    )
    const reset = required(
      root.querySelector<HTMLButtonElement>('[data-sandbox-reset]'),
      'Worker table sandbox reset button was not rendered'
    )

    await expect.poll(() => readSnapshot(snapshot).rowIds).toEqual(['row-1', 'row-2', 'row-3', 'row-4'])

    const startHandle = preview.querySelector('[data-testid="sandbox-handle-row-1"]')
    const targetRow = preview.querySelector('[data-testid="sandbox-row-row-3"]')
    const sourceRow = preview.querySelector('[data-testid="sandbox-row-row-1"]')
    const tableBody = preview.querySelector('[data-testid="sandbox-table-body"]')

    if (
      !(startHandle instanceof HTMLButtonElement)
      || !(targetRow instanceof HTMLTableRowElement)
      || !(sourceRow instanceof HTMLTableRowElement)
      || !(tableBody instanceof HTMLTableSectionElement)
    ) {
      throw new Error('Worker sortable table was not rendered')
    }

    const tableBodyHeight = tableBody.getBoundingClientRect().height
    const start = center(startHandle)
    const targetRect = targetRow.getBoundingClientRect()
    const target = {
      clientX: targetRect.left + targetRect.width / 2,
      clientY: targetRect.top + targetRect.height * 0.75,
    }

    startHandle.dispatchEvent(pointer('pointerdown', start))
    document.dispatchEvent(pointer('pointermove', {
      clientX: start.clientX,
      clientY: start.clientY + 14,
    }))
    document.dispatchEvent(pointer('pointermove', target))

    await expect.poll(() => document.querySelector('[data-dnd-overlay="true"] table') != null).toBe(true)
    await expect.poll(() => preview.querySelector('[data-dnd-placeholder="true"]') != null).toBe(true)
    await expect.poll(() => {
      return preview.querySelector<HTMLElement>('[data-dnd-placeholder="true"]')?.tagName ?? null
    }).toBe('TR')

    const overlayRow = required(
      document.querySelector('[data-dnd-overlay="true"] .sandbox-table__row'),
      'Overlay row was not rendered for the sortable table'
    )

    expect(overlayRow.querySelectorAll('.sandbox-table__cell').length).toBe(5)
    expect(Math.round(tableBody.getBoundingClientRect().height)).toBe(Math.round(tableBodyHeight))

    document.dispatchEvent(pointer('pointerup', target))

    await expect.poll(() => readSnapshot(snapshot).rowIds).toEqual(['row-2', 'row-3', 'row-1', 'row-4'])
    await expect.poll(() => document.querySelector('[data-dnd-overlay="true"] table') == null).toBe(true)

    reset.click()

    await expect.poll(() => readSnapshot(snapshot).rowIds).toEqual(['row-1', 'row-2', 'row-3', 'row-4'])
    expect(readSnapshot(snapshot).lastAction).toBe('Drag rows by their handle to reorder the release queue.')
    expect(sourceRow.isConnected).toBe(true)
  })
})
