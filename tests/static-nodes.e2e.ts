import type { WorkerRuntime } from './__fixtures__/runtime'

import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'

import { createWorkerRuntime } from './__fixtures__/runtime'

describe('staticNodes', () => {
  let runtime: WorkerRuntime<Record<string, never>> | null = null

  afterEach(async () => {
    if (runtime) {
      await runtime.tearDown()
      runtime = null
    }
  })

  test('renders static html and loader svg content from worker', async () => {
    runtime = await createWorkerRuntime<Record<string, never>>({
      worker: new Worker(new URL('./__fixtures__/workers/static-nodes.worker.ts', import.meta.url), {
        type: 'module',
      }),
      provider: {},
    })

    const root = runtime.container.querySelector('#static-root')
    const staticHtml = runtime.container.querySelector('#static-html')
    const label = runtime.container.querySelector('#static-html [data-kind="label"]')
    const image = runtime.container.querySelector('#static-image')
    const svg = runtime.container.querySelector('#loader-svg')

    if (
      !(root instanceof HTMLElement) ||
      !(staticHtml instanceof HTMLElement) ||
      !(label instanceof HTMLElement) ||
      !(image instanceof HTMLImageElement) ||
      !(svg instanceof SVGElement)
    ) {
      throw new Error('Static nodes were not rendered')
    }

    expect(label.textContent).toBe('Static content from worker')
    expect(image.getAttribute('src')).toBe('data:image/gif;base64,R0lGODlhAQABAAAAACw=')

    await expect.poll(async () => {
      await runtime?.flush()
      return svg.getAttribute('viewBox')
    }).toBe('0 0 128 128')

    expect(svg.getAttribute('fill')).toBe('currentColor')
    expect(svg.querySelectorAll('circle')).toHaveLength(8)

    const animateTransform = svg.querySelector('animateTransform')

    expect(animateTransform).not.toBeNull()
    expect(animateTransform?.getAttribute('attributeName')).toBe('transform')
    expect(animateTransform?.getAttribute('type')).toBe('rotate')
    expect(animateTransform?.getAttribute('dur')).toBe('960ms')
    expect(animateTransform?.getAttribute('repeatCount')).toBe('indefinite')
  })
})
