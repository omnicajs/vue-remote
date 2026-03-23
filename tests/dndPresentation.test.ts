import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'

import { createDndOverlayPresentation } from '@/dnd'

const setRect = (
  element: Element,
  rect: { bottom: number; height: number; left: number; right: number; top: number; width: number; }
) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      ...rect,
      x: rect.left,
      y: rect.top,
      toJSON: () => rect,
    }),
  })
}

describe('dnd presentation', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('returns the original clone for non-table elements', () => {
    const source = document.createElement('div')
    const clone = document.createElement('div')

    const overlay = createDndOverlayPresentation(source, clone)

    expect(overlay).toBe(clone)
  })

  test('wraps detached table rows and tolerates missing clone cells', () => {
    const source = document.createElement('tr')
    const firstSourceCell = document.createElement('td')
    const secondSourceCell = document.createElement('td')
    const clone = document.createElement('tr')
    const cloneCell = document.createElement('td')

    source.append(firstSourceCell, secondSourceCell)
    clone.append(cloneCell)

    setRect(firstSourceCell, { bottom: 40, height: 20, left: 0, right: 80, top: 20, width: 80 })
    setRect(secondSourceCell, { bottom: 40, height: 20, left: 80, right: 200, top: 20, width: 120 })

    const overlay = createDndOverlayPresentation(source, clone)

    expect(overlay.tagName).toBe('TABLE')
    expect(overlay.querySelector('tbody')).not.toBeNull()
    expect(overlay.querySelector('tr')).toBe(clone)
    expect(cloneCell.style.width).toBe('80px')
    expect(cloneCell.style.minWidth).toBe('80px')
    expect(cloneCell.style.maxWidth).toBe('80px')
  })
})
