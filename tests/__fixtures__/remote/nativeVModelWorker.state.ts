export interface NativeVModelWorkerState {
  eventInfo: {
    isEventInstance: boolean;
    targetHasAddEventListener: boolean;
    targetKeys: string[];
    type: string;
  };
  text: string;
}

export const nativeVModelWorkerState: NativeVModelWorkerState = {
  eventInfo: {
    isEventInstance: false,
    targetHasAddEventListener: false,
    targetKeys: [],
    type: '',
  },
  text: '',
}

export const captureNativeVModelWorkerEvent = (event: unknown) => {
  const target = event != null && typeof event === 'object' && 'target' in event
    ? (event as { target?: unknown }).target
    : undefined

  nativeVModelWorkerState.eventInfo = {
    isEventInstance: event instanceof Event,
    targetHasAddEventListener: target != null &&
      typeof target === 'object' &&
      'addEventListener' in target,
    targetKeys: target != null && typeof target === 'object'
      ? Object.keys(target as Record<string, unknown>).sort()
      : [],
    type: event != null && typeof event === 'object' && 'type' in event
      ? String((event as { type?: unknown }).type ?? '')
      : '',
  }
}

export const resetNativeVModelWorkerState = () => {
  nativeVModelWorkerState.text = ''
  nativeVModelWorkerState.eventInfo = {
    isEventInstance: false,
    targetHasAddEventListener: false,
    targetKeys: [],
    type: '',
  }
}

export const snapshotNativeVModelWorkerState = () => ({
  text: nativeVModelWorkerState.text,
  eventInfo: {
    ...nativeVModelWorkerState.eventInfo,
    targetKeys: [...nativeVModelWorkerState.eventInfo.targetKeys],
  },
})
