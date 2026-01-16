import { EventEmitter } from 'node:events';

import type { ProgressEvent } from '../types.js';

const emitter = new EventEmitter();

export const emitProgress = (payload: ProgressEvent) => {
  emitter.emit('progress', payload);
};

export const onProgress = (handler: (payload: ProgressEvent) => void) => {
  emitter.on('progress', handler);
  return () => emitter.off('progress', handler);
};
