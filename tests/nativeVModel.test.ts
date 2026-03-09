import type {
  RemoteComponent,
  RemoteRoot,
} from '@/vue/remote'

import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  createRemoteRoot,
} from '@/vue/remote'

import {
  augmentNativeVModelElement,
  isNativeVModelElement,
  isNativeVModelTag,
  patchNativeVModelElementProperty,
} from '@/vue/remote/nativeVModel'

type TestNativeElement = ReturnType<typeof createAugmented> & {
  _falseValue?: unknown;
  _trueValue?: unknown;
  addEventListener: (name: string, listener: unknown, options?: unknown) => void;
  checked?: boolean;
  dispatchEvent: (event: Event) => boolean;
  multiple?: boolean;
  options?: TestNativeElement[];
  removeEventListener: (name: string, listener: unknown) => void;
  selected?: boolean;
  selectedIndex?: number;
  type?: string;
  value?: unknown;
}

const createAugmented = (tag: string) => {
  const root = createRemoteRoot(() => {}, {
    strict: false,
  })

  return augmentNativeVModelElement(
    root.createComponent(tag) as RemoteComponent<string, RemoteRoot>
  )
}

describe('nativeVModel', () => {
  test('identifies supported tags and augments elements only once', () => {
    const input = createAugmented('input') as TestNativeElement

    expect(isNativeVModelTag('input')).toBe(true)
    expect(isNativeVModelTag('div')).toBe(false)
    expect(isNativeVModelElement(input)).toBe(true)
    expect(isNativeVModelElement({})).toBe(false)
    expect(augmentNativeVModelElement(input)).toBe(input)
    expect(input.tagName).toBe('INPUT')
  })

  test('normalizes patched properties and local pseudo-dom state', () => {
    const input = createAugmented('input') as TestNativeElement

    patchNativeVModelElementProperty(input, 'checked', 'yes')
    patchNativeVModelElementProperty(input, 'selected', true)
    patchNativeVModelElementProperty(input, 'multiple', '')
    patchNativeVModelElementProperty(input, 'selectedIndex', 2)
    patchNativeVModelElementProperty(input, 'selectedIndex', 'wrong')
    patchNativeVModelElementProperty(input, 'true-value', 'YES')
    patchNativeVModelElementProperty(input, 'false-value', 'NO')
    patchNativeVModelElementProperty(input, 'value', 'hello')

    expect(input.checked).toBe(false)
    expect(input.selected).toBe(true)
    expect(input.multiple).toBe(true)
    expect(input.selectedIndex).toBe(-1)
    expect(input._trueValue).toBe('YES')
    expect(input._falseValue).toBe('NO')
    expect(input.value).toBe('hello')

    input.checked = true
    input.selected = false
    input.multiple = false
    input.selectedIndex = 3
    input.selectedIndex = 'wrong' as unknown as number
    input.type = 'number'
    input.value = '42'

    expect(input.checked).toBe(true)
    expect(input.selected).toBe(false)
    expect(input.multiple).toBe(false)
    expect(input.selectedIndex).toBe(-1)
    expect(input.type).toBe('number')
    expect(input.value).toBe('42')
  })

  test('restricts runtime listeners and updates properties as listeners are added and removed', () => {
    const input = createAugmented('input') as TestNativeElement
    const listener = vi.fn()
    const secondListener = vi.fn()

    expect(() => input.addEventListener('click', listener)).toThrow(/only supports/)
    expect(() => input.addEventListener('input', 1 as never)).toThrow(/must be a function/)
    expect(() => input.addEventListener('input', listener, { capture: true })).toThrow(/does not support addEventListener options/)
    expect(() => input.removeEventListener('change', 1 as never)).toThrow(/must be a function/)
    expect(() => input.dispatchEvent(new Event('click'))).toThrow(/only supports/)

    expect(input.dispatchEvent(new Event('input'))).toBe(true)

    input.removeEventListener('input', listener)
    expect(input.properties['__vModel:onInput']).toBeUndefined()

    input.addEventListener('input', listener)
    expect(typeof input.properties['__vModel:onInput']).toBe('function')

    input.addEventListener('input', secondListener)
    input.removeEventListener('input', listener)
    expect(typeof input.properties['__vModel:onInput']).toBe('function')

    input.removeEventListener('input', listener)
    input.removeEventListener('input', secondListener)
    expect(input.properties['__vModel:onInput']).toBeUndefined()
  })

  test('converts serialized host events into pseudo-dom events for text inputs', () => {
    const input = createAugmented('input') as TestNativeElement
    const listener = vi.fn((event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    })

    input.addEventListener('input', listener)

    ;(input.properties['__vModel:onInput'] as (event?: unknown) => void)({
      currentTarget: {
        checked: true,
        value: 'world',
      },
    })

    expect(input.checked).toBe(true)
    expect(input.value).toBe('world')
    expect(listener).toHaveBeenCalledOnce()
    expect(listener.mock.calls[0][0]).toMatchObject({
      type: 'input',
      currentTarget: input,
      target: input,
    })

    ;(input.properties['__vModel:onInput'] as (event?: unknown) => void)(null)
    expect(listener).toHaveBeenCalledTimes(2)

    expect(input.dispatchEvent(new Event('input'))).toBe(true)
    expect(listener).toHaveBeenCalledTimes(3)
  })

  test('tracks select option state for nested options and single or multiple selection', () => {
    const root = createRemoteRoot(() => {}, {
      strict: false,
    })
    const select = augmentNativeVModelElement(
      root.createComponent('select') as RemoteComponent<string, RemoteRoot>
    ) as TestNativeElement
    const group = root.createComponent('optgroup') as RemoteComponent<string, RemoteRoot>
    const optionOne = augmentNativeVModelElement(
      root.createComponent('option') as RemoteComponent<string, RemoteRoot>
    ) as TestNativeElement
    const optionTwo = augmentNativeVModelElement(
      root.createComponent('option') as RemoteComponent<string, RemoteRoot>
    ) as TestNativeElement
    const optionThree = augmentNativeVModelElement(
      root.createComponent('option') as RemoteComponent<string, RemoteRoot>
    ) as TestNativeElement
    const span = root.createComponent('span') as RemoteComponent<string, RemoteRoot>

    span.append('One')
    optionOne.append(span)
    optionOne.append(root.createComment('ignored'))
    optionTwo.append('Two')
    optionThree.append('Three')

    optionOne.value = 'one'
    optionOne._value = undefined
    optionThree._value = undefined

    group.append(optionOne)
    select.append('ignored', group, optionTwo, optionThree)

    expect(select.options).toHaveLength(3)
    expect(select.options?.[0]).toBe(optionOne)

    select.multiple = true
    select.addEventListener('change', vi.fn())

    ;(select.properties['__vModel:onChange'] as (event: unknown) => void)({
      target: {
        selectedOptions: [
          { value: 'one', text: 'One', selected: true },
          { value: '', text: 'Two', selected: true },
        ],
      },
    })

    expect(optionOne.selected).toBe(true)
    expect(optionTwo.selected).toBe(true)
    expect(optionThree.selected).toBe(false)

    select.multiple = false

    ;(select.properties['__vModel:onChange'] as (event: unknown) => void)({
      currentTarget: {
        selectedIndex: undefined,
      },
    })

    expect(select.selectedIndex).toBe(-1)

    ;(select.properties['__vModel:onChange'] as (event: unknown) => void)({
      currentTarget: {
        selectedIndex: 1,
      },
    })

    expect(select.selectedIndex).toBe(1)
    expect(optionOne.selected).toBe(false)
    expect(optionTwo.selected).toBe(true)
    expect(optionThree.selected).toBe(false)
  })
})
