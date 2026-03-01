import type { Channel } from '@/dom/host'

export interface WorkerApi<Snapshot> {
  run (channel: Channel): Promise<void>;
  getState (): Snapshot;
  resetState (): void;
  release (): void;
}
