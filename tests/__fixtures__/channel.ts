import type { Channel } from '@/dom/common/channel'

export const createNoopChannel = (): Channel => (() => undefined) as Channel
