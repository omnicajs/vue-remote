import type { RemoteChannel } from '@remote-ui/core'
import type { Component } from 'vue'

import {
    defineComponent,
    h,
    ref,
} from 'vue'

import {
    createEndpoint,
    fromInsideIframe,
    release,
    retain,
} from '@remote-ui/rpc'

import {
    createRemoteRenderer,
    createRemoteRoot,
    defineRemoteComponent,
} from '../../../src/index'

const createApp = async (channel: RemoteChannel, component: Component, props: any) => {
    const remoteRoot = createRemoteRoot(channel, {
        components: [
            'VButton',
            'VInput',
        ],
    })

    await remoteRoot.mount()

    const app = createRemoteRenderer(remoteRoot).createApp(component, props)

    app.mount(remoteRoot)

    return app
}

let onRelease = () => {}

const endpoint = createEndpoint(fromInsideIframe())

const VButton = defineRemoteComponent('VButton')
const VInput = defineRemoteComponent('VInput', [
    'update:value',
] as unknown as {
    'update:value': (value: string) => true,
})

endpoint.expose({
    async run (channel, api) {
        retain(channel)
        retain(api)

        const app = await createApp(channel, defineComponent({
            setup () {
                const text = ref('')
                const hidden = ref(false)

                return () => [
                    h(VInput, { 'onUpdate:value': (value: string) => text.value = value }),
                    h(VButton, { onClick: () => {api.doSomethingOnHost(text.value); hidden.value = !hidden.value} }, 'Do'),
                    hidden.value ? h('div', ['hidden text']): '',
                ]
            },
        }), {
            api,
        })

        onRelease = () => {
            release(channel)
            release(api)

            app.unmount()
        }
    },

    release () {
        onRelease()
    },
})