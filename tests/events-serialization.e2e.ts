import type { WorkerRuntime } from './__fixtures__/runtime'

import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'

import { VButton } from './__fixtures__/components/VButton.host'

import { createWorkerRuntime } from './__fixtures__/runtime'

describe('eventsSerialization', () => {
  let runtime: WorkerRuntime<{ events: unknown[] }> | null = null

  afterEach(async () => {
    if (runtime) {
      await runtime.tearDown()
      runtime = null
    }
  })

  test('serializes input, keydown and mousedown events with exact payload shape', async () => {
    runtime = await createWorkerRuntime<{ events: unknown[] }>({
      worker: new Worker(new URL('./__fixtures__/workers/events-serialization.worker.ts', import.meta.url), {
        type: 'module',
      }),
      provider: {
        VButton,
      },
    })

    const input = runtime.container.querySelector('#serialization-input')
    const button = runtime.container.querySelector('#serialization-button')
    const model = runtime.container.querySelector('#serialization-model')

    if (!(input instanceof HTMLInputElement) || !(button instanceof HTMLButtonElement) || !(model instanceof HTMLElement)) {
      throw new Error('Serialization controls were not rendered')
    }

    await runtime.reset()

    input.value = 'Hello from host'
    input.dispatchEvent(new InputEvent('input', {
      data: 'h',
      bubbles: true,
      cancelable: true,
      composed: true,
    }))

    await expect.poll(async () => {
      await runtime?.flush()
      return model.textContent
    }).toBe('Hello from host')

    button.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'K',
      code: 'KeyK',
      altKey: true,
      ctrlKey: true,
      shiftKey: false,
      metaKey: true,
      bubbles: true,
      cancelable: true,
      composed: true,
    }))

    await runtime.flush()

    button.dispatchEvent(new MouseEvent('mousedown', {
      altKey: true,
      button: 1,
      clientX: 42,
      clientY: 24,
      bubbles: true,
      cancelable: true,
      composed: true,
      ctrlKey: false,
      metaKey: true,
      shiftKey: true,
    }))

    await expect.poll(async () => {
      await runtime?.flush()
      return (await runtime?.read())?.events
    }).toMatchObject([
      {
        type: 'input',
        payload: {
          type: 'input',
          target: {
            value: 'Hello from host',
            checked: false,
          },
          currentTarget: {
            value: 'Hello from host',
            checked: false,
          },
          bubbles: true,
          cancelable: true,
          composed: true,
          defaultPrevented: false,
          eventPhase: 2,
          isTrusted: false,
          data: 'h',
        },
      },
      {
        type: 'keydown',
        payload: {
          type: 'keydown',
          target: {},
          currentTarget: {},
          bubbles: true,
          cancelable: true,
          composed: true,
          defaultPrevented: false,
          eventPhase: 2,
          isTrusted: false,
          key: 'K',
          code: 'KeyK',
          altKey: true,
          ctrlKey: true,
          shiftKey: false,
          metaKey: true,
        },
      },
      {
        type: 'mousedown',
        payload: {
          type: 'mousedown',
          target: {},
          currentTarget: {},
          bubbles: true,
          cancelable: true,
          composed: true,
          defaultPrevented: false,
          eventPhase: 2,
          isTrusted: false,
          altKey: true,
          clientX: 42,
          clientY: 24,
          button: 1,
          ctrlKey: false,
          metaKey: true,
          shiftKey: true,
        },
      },
    ])
  })

  test('serializes focus, pointerdown, wheel and dragstart events', async () => {
    runtime = await createWorkerRuntime<{ events: unknown[] }>({
      worker: new Worker(new URL('./__fixtures__/workers/events-serialization.worker.ts', import.meta.url), {
        type: 'module',
      }),
      provider: {
        VButton,
      },
    })

    const input = runtime.container.querySelector('#serialization-input')
    const button = runtime.container.querySelector('#serialization-button')

    if (!(input instanceof HTMLInputElement) || !(button instanceof HTMLButtonElement)) {
      throw new Error('Serialization controls were not rendered')
    }

    await runtime.reset()

    input.focus()

    button.dispatchEvent(new PointerEvent('pointerdown', {
      altKey: true,
      button: 0,
      clientX: 18,
      clientY: 36,
      bubbles: true,
      cancelable: true,
      composed: true,
      ctrlKey: false,
      pointerType: 'mouse',
      isPrimary: true,
      metaKey: true,
      pointerId: 5,
      pressure: 0.5,
      shiftKey: true,
      tangentialPressure: 0.1,
      tiltX: 1,
      tiltY: 2,
      twist: 3,
      width: 4,
      height: 5,
    }))

    input.dispatchEvent(new WheelEvent('wheel', {
      altKey: false,
      deltaMode: WheelEvent.DOM_DELTA_LINE,
      deltaX: 7,
      deltaY: 8,
      deltaZ: 9,
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: 11,
      clientY: 22,
      button: 0,
      ctrlKey: true,
      metaKey: false,
      shiftKey: true,
    }))

    button.dispatchEvent(new DragEvent('dragstart', {
      altKey: true,
      bubbles: true,
      cancelable: true,
      composed: true,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      ...(typeof DataTransfer === 'function' && { dataTransfer: new DataTransfer() }),
    }))

    await expect.poll(async () => {
      await runtime?.flush()
      return (await runtime?.read())?.events
    }).toMatchObject([
      {
        type: 'focus',
        payload: {
          type: 'focus',
          target: {
            value: '',
            checked: false,
          },
          currentTarget: {
            value: '',
            checked: false,
          },
          bubbles: false,
          cancelable: false,
          composed: true,
          defaultPrevented: false,
          eventPhase: 2,
          isTrusted: true,
          relatedTarget: null,
        },
      },
      {
        type: 'pointerdown',
        payload: {
          type: 'pointerdown',
          target: {},
          currentTarget: {},
          bubbles: true,
          cancelable: true,
          composed: true,
          defaultPrevented: false,
          eventPhase: 2,
          isTrusted: false,
          altKey: true,
          clientX: 18,
          clientY: 36,
          button: 0,
          ctrlKey: false,
          metaKey: true,
          pointerId: expect.any(Number),
          pointerType: expect.any(String),
          pressure: expect.any(Number),
          shiftKey: true,
          tangentialPressure: expect.any(Number),
          tiltX: expect.any(Number),
          tiltY: expect.any(Number),
          twist: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
          isPrimary: expect.any(Boolean),
        },
      },
      {
        type: 'wheel',
        payload: {
          type: 'wheel',
          target: {
            value: '',
            checked: false,
          },
          currentTarget: {
            value: '',
            checked: false,
          },
          bubbles: true,
          cancelable: true,
          composed: true,
          defaultPrevented: false,
          eventPhase: 2,
          isTrusted: false,
          altKey: false,
          button: 0,
          clientX: 11,
          clientY: 22,
          ctrlKey: true,
          deltaMode: WheelEvent.DOM_DELTA_LINE,
          deltaX: 7,
          deltaY: 8,
          deltaZ: 9,
          DOM_DELTA_PIXEL: WheelEvent.DOM_DELTA_PIXEL,
          DOM_DELTA_LINE: WheelEvent.DOM_DELTA_LINE,
          DOM_DELTA_PAGE: WheelEvent.DOM_DELTA_PAGE,
          metaKey: false,
          shiftKey: true,
        },
      },
      {
        type: 'dragstart',
        payload: {
          type: 'dragstart',
          target: {},
          currentTarget: {},
          bubbles: true,
          cancelable: true,
          composed: true,
          defaultPrevented: false,
          eventPhase: 2,
          isTrusted: false,
          altKey: true,
          button: 0,
          clientX: 0,
          clientY: 0,
          ctrlKey: true,
          dataTransfer: typeof DataTransfer === 'function' ? {
            dropEffect: expect.any(String),
            effectAllowed: expect.any(String),
            files: expect.any(Array),
            types: expect.any(Array),
          } : null,
          metaKey: false,
          shiftKey: false,
        },
      },
    ])
  })

  test.runIf(
    typeof TouchEvent === 'function'
  )('serializes touchstart events', async () => {
    runtime = await createWorkerRuntime<{ events: unknown[] }>({
      worker: new Worker(new URL('./__fixtures__/workers/events-serialization.worker.ts', import.meta.url), {
        type: 'module',
      }),
      provider: {
        VButton,
      },
    })

    const button = runtime.container.querySelector('#serialization-button')

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Serialization button was not rendered')
    }

    await runtime.reset()

    button.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      composed: true,
      altKey: true,
      ctrlKey: false,
      shiftKey: true,
      metaKey: false,
    }))

    await expect.poll(async () => {
      await runtime?.flush()
      return (await runtime?.read())?.events
    }).toMatchObject([
      {
        type: 'touchstart',
        payload: {
          type: 'touchstart',
          target: {},
          currentTarget: {},
          bubbles: true,
          cancelable: true,
          composed: true,
          defaultPrevented: false,
          eventPhase: 2,
          isTrusted: false,
          altKey: true,
          ctrlKey: false,
          shiftKey: true,
          metaKey: false,
          changedTouches: expect.any(Array),
          targetTouches: expect.any(Array),
          touches: expect.any(Array),
        },
      },
    ])
  })
})
