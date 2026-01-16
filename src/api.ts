import type { ApiResponse, Plan, PlanItem, Song } from './types.js';

const API_BASE = 'https://api.planningcenteronline.com/services/v2';

type Credentials = {
  appId: string;
  appSecret: string;
};

const buildAuthHeader = (credentials: Credentials) => {
  const encoded = btoa(`${credentials.appId}:${credentials.appSecret}`);
  return `Basic ${encoded}`;
};

const fetchJson = async <T>(url: string, credentials: Credentials, options?: RequestInit) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: buildAuthHeader(credentials),
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API ${response.status}: ${errorText}`);
  }

  return (await response.json()) as ApiResponse<T>;
};

export const listSongs = async (credentials: Credentials): Promise<Song[]> => {
  const songs: Song[] = [];
  let nextUrl: string | null = `${API_BASE}/songs?per_page=100`;

  while (nextUrl) {
    const response = await fetchJson<Song[]>(nextUrl, credentials);
    songs.push(...response.data);
    nextUrl = response.links?.next ?? null;
  }

  return songs;
};

export const listPlans = async (
  credentials: Credentials,
  serviceTypeId: string,
  pageSize: number
): Promise<Plan[]> => {
  const url = `${API_BASE}/service_types/${serviceTypeId}/plans?order=sort_date&per_page=${pageSize}`;
  const response = await fetchJson<Plan[]>(url, credentials);
  return response.data;
};

export const listPlanItems = async (
  credentials: Credentials,
  serviceTypeId: string,
  planId: string
): Promise<PlanItem[]> => {
  const items: PlanItem[] = [];
  let nextUrl: string | null = `${API_BASE}/service_types/${serviceTypeId}/plans/${planId}/items?per_page=100&include=song`;

  while (nextUrl) {
    const response = await fetchJson<PlanItem[]>(nextUrl, credentials);
    items.push(...response.data);
    nextUrl = response.links?.next ?? null;
  }

  return items;
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
