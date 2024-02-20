import type { RemoteChannel } from '@remote-ui/core'

export interface Extension {
    run (channel: RemoteChannel, api: {
    }): Promise<void>;
    release (): void;
}
