import type { ApiResponse, MatchResult, Plan, PlanItem, PlanItemWithPlan, Song } from './types.js';
import { runAdaptiveQueue } from './utils/adaptiveQueue.js';
import { buildMatchResults } from './utils/match.js';

const API_BASE = 'https://api.planningcenteronline.com/services/v2';
const REQUEST_TIMEOUT_MS = 30000;

type Credentials = {
  appId: string;
  appSecret: string;
};

const buildAuthHeader = (credentials: Credentials) => {
  const encoded = (() => {
    if (typeof btoa === 'function') {
      return btoa(`${credentials.appId}:${credentials.appSecret}`);
    }
    const BufferRef = (globalThis as { Buffer?: { from: (value: string, encoding: string) => { toString: (encoding: string) => string } } })
      .Buffer;
    if (!BufferRef) {
      throw new Error('Base64 encoder is not available in this environment.');
    }
    return BufferRef.from(`${credentials.appId}:${credentials.appSecret}`, 'utf-8').toString('base64');
  })();
  return `Basic ${encoded}`;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseRetryAfterMs = (value: string | null) => {
  if (!value) {
    return null;
  }
  const seconds = Number.parseFloat(value);
  if (!Number.isNaN(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const retryDate = new Date(value);
  const delay = retryDate.getTime() - Date.now();
  return Number.isNaN(retryDate.getTime()) ? null : Math.max(0, delay);
};

const parseRateLimitWindowMs = (errorText: string) => {
  const match = errorText.match(/rate limit exceeded: \d+ of \d+ requests per ([\d.]+) seconds/i);
  if (!match) {
    return null;
  }
  const seconds = Number.parseFloat(match[1] ?? '');
  return Number.isNaN(seconds) ? null : Math.max(0, seconds * 1000);
};

const fetchJson = async <T>(
  url: string,
  credentials: Credentials,
  options?: RequestInit,
  attempt = 0
): Promise<ApiResponse<T>> => {
  const controller = options?.signal ? null : new AbortController();
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      signal: options?.signal ?? controller?.signal,
      headers: {
        Authorization: buildAuthHeader(credentials),
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[pco] ${options?.method ?? 'GET'} ${url} -> fetch error (${message})`);
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[pco] ${options?.method ?? 'GET'} ${url} -> ${response.status}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[pco] ${options?.method ?? 'GET'} ${url} -> ${response.status} (${errorText.trim() || 'no body'})`
      );
    }
    if (response.status === 429 && attempt < 3) {
      const retryAfterMs = parseRetryAfterMs(response.headers.get('Retry-After'));
      const rateLimitWindowMs = parseRateLimitWindowMs(errorText);
      const backoffMs = retryAfterMs ?? rateLimitWindowMs ?? (attempt + 1) * 1000;
      if (process.env.NODE_ENV !== 'production') {
        const source = retryAfterMs ? 'Retry-After' : rateLimitWindowMs ? 'rate-limit window' : 'backoff';
        console.log(
          `[pco] 429 retry in ${Math.round(backoffMs)}ms (attempt ${attempt + 1}, ${source})`
        );
      }
      await sleep(backoffMs);
      return fetchJson(url, credentials, options, attempt + 1);
    }
    throw new Error(`API ${response.status}: ${errorText}`);
  }

  return (await response.json()) as ApiResponse<T>;
};

type ListProgress = {
  loaded: number;
  total?: number;
  done?: boolean;
};

type ListOptions = {
  onProgress?: (progress: ListProgress) => void;
};

export const listSongs = async (
  credentials: Credentials,
  options: ListOptions = {}
): Promise<Song[]> => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[pco] listSongs: start');
  }
  const songs: Song[] = [];
  let nextUrl: string | null = `${API_BASE}/songs?per_page=100`;
  let totalCount: number | undefined;

  while (nextUrl) {
    const response: ApiResponse<Song[]> = await fetchJson<Song[]>(nextUrl, credentials);
    songs.push(...response.data);
    if (totalCount === undefined && typeof response.meta?.total_count === 'number') {
      totalCount = response.meta.total_count;
    }
    nextUrl = response.links?.next ?? null;
    options.onProgress?.({ loaded: songs.length, total: totalCount, done: !nextUrl });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[pco] listSongs: done (${songs.length})`);
  }
  return songs;
};

export const listPlans = async (
  credentials: Credentials,
  serviceTypeId: string,
  pageSize: number,
  options: ListOptions = {}
): Promise<Plan[]> => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[pco] listPlans: start (${serviceTypeId}, ${pageSize})`);
  }
  const plans: Plan[] = [];
  const maxPerPage = 50;
  const requested = Math.max(1, pageSize);
  let totalCount: number | undefined;
  let nextUrl: string | null = `${API_BASE}/service_types/${serviceTypeId}/plans?order=sort_date&per_page=${Math.min(
    maxPerPage,
    requested
  )}`;

  while (nextUrl && plans.length < requested) {
    const response: ApiResponse<Plan[]> = await fetchJson<Plan[]>(nextUrl, credentials);
    plans.push(...response.data);
    if (totalCount === undefined && typeof response.meta?.total_count === 'number') {
      totalCount = response.meta.total_count;
    }
    const total = totalCount ? Math.min(totalCount, requested) : requested;
    nextUrl = response.links?.next ?? null;
    const done = !nextUrl || plans.length >= requested;
    options.onProgress?.({ loaded: Math.min(plans.length, total), total, done });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[pco] listPlans: done (${plans.length})`);
  }
  return plans.slice(0, requested);
};

export const listPlanItems = async (
  credentials: Credentials,
  serviceTypeId: string,
  planId: string,
  options: ListOptions = {}
): Promise<PlanItem[]> => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[pco] listPlanItems: start (${planId})`);
  }
  const items: PlanItem[] = [];
  let nextUrl: string | null = `${API_BASE}/service_types/${serviceTypeId}/plans/${planId}/items?per_page=100&include=song`;
  let totalCount: number | undefined;

  while (nextUrl) {
    const response: ApiResponse<PlanItem[]> = await fetchJson<PlanItem[]>(nextUrl, credentials);
    items.push(...response.data);
    if (totalCount === undefined && typeof response.meta?.total_count === 'number') {
      totalCount = response.meta.total_count;
    }
    nextUrl = response.links?.next ?? null;
    options.onProgress?.({ loaded: items.length, total: totalCount, done: !nextUrl });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[pco] listPlanItems: done (${planId}, ${items.length})`);
  }
  return items;
};

const loadUnlinkedItems = async (
  credentials: Credentials,
  serviceTypeId: string,
  plans: Plan[],
  options: {
    onPlanComplete?: (completed: number, total: number) => void;
  } = {}
): Promise<PlanItemWithPlan[]> => {
  let completedPlans = 0;
  const tasks = plans.map((plan) => ({
    id: plan.id,
    plan,
    run: () => listPlanItems(credentials, serviceTypeId, plan.id),
  }));

  const itemsPerPlan = await runAdaptiveQueue(
    tasks.map((task) => ({ id: task.id, run: task.run })),
    {
      onAdjust: ({ concurrency, delayMs, reason }) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[scan] adjust: concurrency=${concurrency} delay=${delayMs}ms (${reason})`);
        }
      },
      onTaskComplete: () => {
        completedPlans += 1;
        options.onPlanComplete?.(completedPlans, plans.length);
      },
    }
  );

  const unlinked: PlanItemWithPlan[] = [];
  itemsPerPlan.forEach((items, index) => {
    const plan = tasks[index]?.plan;
    if (!plan) {
      return;
    }
    for (const item of items) {
      const hasSong = item.relationships?.song?.data?.id;
      if (!hasSong && item.attributes.title) {
        unlinked.push({ ...item, plan });
      }
    }
  });
  return unlinked;
};

export const scanMatches = async (
  credentials: Credentials,
  serviceTypeId: string,
  pageSize: number,
  scoreThreshold: number
): Promise<MatchResult[]> => {
  const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));
  const stepPercents = [0, 0, 0, 0];
  const lastLogged = { step: [-1, -1, -1, -1], overall: -1 };

  const logProgress = (stepIndex: number, label: string, percent: number, force = false) => {
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    const stepPercent = clampPercent(percent);
    stepPercents[stepIndex] = stepPercent;
    const overall = clampPercent(stepPercents.reduce((sum, value) => sum + value, 0) / 4);
    const stepChanged = Math.abs(stepPercent - lastLogged.step[stepIndex]) >= 5;
    const overallChanged = Math.abs(overall - lastLogged.overall) >= 5;
    if (force || stepChanged || overallChanged) {
      console.log(`[scan] Step ${stepIndex + 1}/4: ${label} (${stepPercent}% | overall ${overall}%)`);
      lastLogged.step[stepIndex] = stepPercent;
      lastLogged.overall = overall;
    }
  };

  const percentFromList = (progress: ListProgress) => {
    if (progress.total && progress.total > 0) {
      return (progress.loaded / progress.total) * 100;
    }
    return progress.done ? 100 : 0;
  };

  if (process.env.NODE_ENV !== 'production') {
    logProgress(0, 'validating inputs', 0, true);
  }

  const trimmedServiceType = serviceTypeId.trim();
  if (!trimmedServiceType) {
    throw new Error('Please provide a service type ID.');
  }

  const requested = Math.max(1, pageSize);
  const threshold = Number.isFinite(scoreThreshold) ? scoreThreshold : 0.7;

  if (process.env.NODE_ENV !== 'production') {
    logProgress(0, 'validating inputs', 100, true);
    logProgress(1, 'loading songs and plans', 0, true);
  }

  let songsProgress: ListProgress = { loaded: 0, done: false };
  let plansProgress: ListProgress = { loaded: 0, total: requested, done: false };
  const updateStep2 = () => {
    const songsPercent = percentFromList(songsProgress);
    const plansPercent = percentFromList(plansProgress);
    const percent = (songsPercent + plansPercent) / 2;
    logProgress(1, 'loading songs and plans', percent);
  };

  const [songs, plans] = await Promise.all([
    listSongs(credentials, {
      onProgress: (progress) => {
        songsProgress = progress;
        updateStep2();
      },
    }),
    listPlans(credentials, trimmedServiceType, requested, {
      onProgress: (progress) => {
        plansProgress = progress;
        updateStep2();
      },
    }),
  ]);
  if (process.env.NODE_ENV !== 'production') {
    logProgress(1, 'loading songs and plans', 100, true);
  }

  if (process.env.NODE_ENV !== 'production') {
    logProgress(2, `loading plan items (0/${plans.length} plans)`, 0, true);
  }
  const unlinkedItems = await loadUnlinkedItems(credentials, trimmedServiceType, plans, {
    onPlanComplete: (completed, total) => {
      if (process.env.NODE_ENV !== 'production') {
        const percent = total > 0 ? (completed / total) * 100 : 100;
        logProgress(2, `loading plan items (${completed}/${total} plans)`, percent);
      }
    },
  });
  if (process.env.NODE_ENV !== 'production') {
    logProgress(2, `loading plan items (${plans.length}/${plans.length} plans)`, 100, true);
  }

  if (process.env.NODE_ENV !== 'production') {
    logProgress(3, `matching ${unlinkedItems.length} items`, 0, true);
  }
  const results = buildMatchResults(unlinkedItems, songs, threshold, {
    onProgress: ({ processed, total }) => {
      if (process.env.NODE_ENV !== 'production') {
        const percent = total > 0 ? (processed / total) * 100 : 100;
        logProgress(3, `matching ${total} items`, percent);
      }
    },
  });
  if (process.env.NODE_ENV !== 'production') {
    logProgress(3, `matching ${unlinkedItems.length} items`, 100, true);
  }
  return results;
};

export const updatePlanItemSong = async (
  credentials: Credentials,
  serviceTypeId: string,
  planId: string,
  itemId: string,
  songId: string
): Promise<void> => {
  const url = `${API_BASE}/service_types/${serviceTypeId}/plans/${planId}/items/${itemId}`;
  await fetchJson(url, credentials, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        type: 'Item',
        id: itemId,
        relationships: {
          song: {
            data: {
              type: 'Song',
              id: songId,
            },
          },
        },
      },
    }),
  });
};
