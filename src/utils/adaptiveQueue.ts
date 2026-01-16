type Task<T> = {
  id: string;
  run: () => Promise<T>;
};

type AdaptiveQueueOptions = {
  initialConcurrency?: number;
  minConcurrency?: number;
  maxConcurrency?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  delayStepMs?: number;
  successIncreaseEvery?: number;
  maxRetries?: number;
  taskTimeoutMs?: number;
  onAdjust?: (state: { concurrency: number; delayMs: number; reason: string }) => void;
  onTaskStart?: (taskId: string) => void;
  onTaskComplete?: (taskId: string) => void;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRateLimitError = (error: unknown) =>
  error instanceof Error && /API 429|rate limit/i.test(error.message);

export const runAdaptiveQueue = async <T>(
  tasks: Task<T>[],
  options: AdaptiveQueueOptions = {}
): Promise<T[]> => {
  const {
    initialConcurrency = 6,
    minConcurrency = 1,
    maxConcurrency = 10,
    initialDelayMs = 0,
    maxDelayMs = 2000,
    delayStepMs = 200,
    successIncreaseEvery = 6,
    maxRetries = 3,
    taskTimeoutMs = 30000,
    onAdjust,
    onTaskStart,
    onTaskComplete,
  } = options;

  let concurrency = Math.min(Math.max(initialConcurrency, minConcurrency), maxConcurrency);
  let delayMs = Math.max(0, initialDelayMs);
  let active = 0;
  let successStreak = 0;
  const results = new Map<string, T>();
  const queue = tasks.map((task) => ({ task, attempts: 0 }));

  return new Promise<T[]>((resolve, reject) => {
    const schedule = () => {
      while (active < concurrency && queue.length > 0) {
        const entry = queue.shift();
        if (!entry) {
          break;
        }
        active += 1;
        void (async () => {
          if (delayMs > 0) {
            await sleep(delayMs);
          }
          try {
            onTaskStart?.(entry.task.id);
            const value = (await Promise.race([
              entry.task.run(),
              new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error('Task timed out.')), taskTimeoutMs)
              ),
            ])) as T;
            results.set(entry.task.id, value);
            onTaskComplete?.(entry.task.id);
            successStreak += 1;
            if (successStreak >= successIncreaseEvery) {
              if (delayMs > 0) {
                delayMs = Math.max(0, delayMs - delayStepMs);
                onAdjust?.({ concurrency, delayMs, reason: 'reduce delay after success' });
              } else if (concurrency < maxConcurrency) {
                concurrency += 1;
                onAdjust?.({ concurrency, delayMs, reason: 'increase concurrency after success' });
              }
              successStreak = 0;
            }
          } catch (error) {
            successStreak = 0;
            if (process.env.NODE_ENV !== 'production') {
              const message = error instanceof Error ? error.message : String(error);
              console.log(`[scan] task ${entry.task.id} failed (attempt ${entry.attempts + 1}): ${message}`);
            }
            const rateLimited = isRateLimitError(error);
            if (rateLimited) {
              const nextConcurrency = Math.max(minConcurrency, Math.floor(concurrency / 2));
              if (nextConcurrency !== concurrency) {
                concurrency = nextConcurrency;
              }
              delayMs = Math.min(maxDelayMs, delayMs + delayStepMs);
              onAdjust?.({ concurrency, delayMs, reason: 'rate limited; slow down' });
            } else {
              delayMs = Math.min(maxDelayMs, delayMs + delayStepMs);
              onAdjust?.({ concurrency, delayMs, reason: 'error; slow down' });
            }

            entry.attempts += 1;
            if (entry.attempts <= maxRetries) {
              queue.push(entry);
            } else {
              reject(error);
              return;
            }
          } finally {
            active -= 1;
            if (results.size === tasks.length) {
              const ordered = tasks.map((task) => results.get(task.id) as T);
              resolve(ordered);
              return;
            }
            schedule();
          }
        })();
      }
    };

    schedule();
  });
};
