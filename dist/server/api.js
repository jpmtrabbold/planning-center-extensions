const API_BASE = 'https://api.planningcenteronline.com/services/v2';
const buildAuthHeader = (credentials) => {
    const encoded = (() => {
        if (typeof btoa === 'function') {
            return btoa(`${credentials.appId}:${credentials.appSecret}`);
        }
        const BufferRef = globalThis
            .Buffer;
        if (!BufferRef) {
            throw new Error('Base64 encoder is not available in this environment.');
        }
        return BufferRef.from(`${credentials.appId}:${credentials.appSecret}`, 'utf-8').toString('base64');
    })();
    return `Basic ${encoded}`;
};
const fetchJson = async (url, credentials, options) => {
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
    return (await response.json());
};
export const listSongs = async (credentials) => {
    const songs = [];
    let nextUrl = `${API_BASE}/songs?per_page=100`;
    while (nextUrl) {
        const response = await fetchJson(nextUrl, credentials);
        songs.push(...response.data);
        nextUrl = response.links?.next ?? null;
    }
    return songs;
};
export const listPlans = async (credentials, serviceTypeId, pageSize) => {
    const url = `${API_BASE}/service_types/${serviceTypeId}/plans?order=sort_date&per_page=${pageSize}`;
    const response = await fetchJson(url, credentials);
    return response.data;
};
export const listPlanItems = async (credentials, serviceTypeId, planId) => {
    const items = [];
    let nextUrl = `${API_BASE}/service_types/${serviceTypeId}/plans/${planId}/items?per_page=100&include=song`;
    while (nextUrl) {
        const response = await fetchJson(nextUrl, credentials);
        items.push(...response.data);
        nextUrl = response.links?.next ?? null;
    }
    return items;
};
export const updatePlanItemSong = async (credentials, serviceTypeId, planId, itemId, songId) => {
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
