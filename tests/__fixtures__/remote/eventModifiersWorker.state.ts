export interface EventModifiersWorkerState {
  componentClicks: number;
  componentDefaultPrevented: boolean;
  domClicks: number;
  domDefaultPrevented: boolean;
  keyHits: number;
  parentClicks: number;
  selfClicks: number;
}

export const eventModifiersWorkerState: EventModifiersWorkerState = {
  componentClicks: 0,
  componentDefaultPrevented: false,
  domClicks: 0,
  domDefaultPrevented: false,
  keyHits: 0,
  parentClicks: 0,
  selfClicks: 0,
}

export const resetEventModifiersWorkerState = () => {
  eventModifiersWorkerState.componentClicks = 0
  eventModifiersWorkerState.componentDefaultPrevented = false
  eventModifiersWorkerState.domClicks = 0
  eventModifiersWorkerState.domDefaultPrevented = false
  eventModifiersWorkerState.keyHits = 0
  eventModifiersWorkerState.parentClicks = 0
  eventModifiersWorkerState.selfClicks = 0
}

export const snapshotEventModifiersWorkerState = () => ({
  componentClicks: eventModifiersWorkerState.componentClicks,
  componentDefaultPrevented: eventModifiersWorkerState.componentDefaultPrevented,
  domClicks: eventModifiersWorkerState.domClicks,
  domDefaultPrevented: eventModifiersWorkerState.domDefaultPrevented,
  keyHits: eventModifiersWorkerState.keyHits,
  parentClicks: eventModifiersWorkerState.parentClicks,
  selfClicks: eventModifiersWorkerState.selfClicks,
})
