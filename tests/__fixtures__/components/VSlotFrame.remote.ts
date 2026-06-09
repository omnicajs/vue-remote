import { defineRemoteComponent } from '@/vue/remote'

export type VSlotFrameProps = Record<string, unknown> & {
  id: string;
  title?: string;
}

export const VSlotFrame = defineRemoteComponent<'VSlotFrame', VSlotFrameProps>(
  'VSlotFrame',
  undefined,
  ['addon']
)
