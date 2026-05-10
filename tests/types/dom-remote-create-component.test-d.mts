import {
  describe,
  test,
} from 'vitest'

import type { SchemaType } from '@/dom/remote'

import {
  createChannel,
  createRemoteRoot,
} from '@/dom/remote'

describe('dom remote createComponent type tests', () => {
  test('preserves properties and children contracts', () => {
    type VImage = SchemaType<'VImage'>
    type VButton = SchemaType<'VButton'>
    type VCard = SchemaType<'VCard', {}, {}, VImage>
    type VPanel = SchemaType<'VPanel', { title: string }, {}, VButton>
    type VOptionalPanel = SchemaType<'VOptionalPanel', { title?: string }, {}, VImage>

    const VImage = 'VImage' as VImage
    const VButton = 'VButton' as VButton
    const VCard = 'VCard' as VCard
    const VPanel = 'VPanel' as VPanel
    const VOptionalPanel = 'VOptionalPanel' as VOptionalPanel

    const root = createRemoteRoot(createChannel({
      mount: () => {},
      insertChild: () => {},
      removeChild: () => {},
      updateProperties: () => {},
      updateText: () => {},
      invoke: (_id, _method, _payload, resolve) => resolve(undefined),
      systemCall: async () => undefined,
    }), {
      components: [
        VImage,
        VButton,
        VCard,
        VPanel,
        VOptionalPanel,
      ],
    })

    const image = root.createComponent(VImage)
    const button = root.createComponent(VButton)

    root.createComponent(VCard)
    root.createComponent(VCard, image)
    root.createComponent(VCard, [image])
    root.createComponent(VCard, null, image)
    root.createComponent(VCard, {}, [image])

    root.createComponent(VOptionalPanel)
    root.createComponent(VOptionalPanel, { title: 'Details' }, image)

    root.createComponent(VPanel, { title: 'Actions' })
    root.createComponent(VPanel, { title: 'Actions' }, button)

    // @ts-expect-error required properties must be provided
    root.createComponent(VPanel)
    // @ts-expect-error required properties cannot be replaced with a child
    root.createComponent(VPanel, button)
    // @ts-expect-error required properties cannot be replaced with a child array
    root.createComponent(VPanel, [button])
    // @ts-expect-error children must be supported by the created component type
    root.createComponent(VCard, null, button)
  })
})
