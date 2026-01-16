type CachedForm = {
  appId?: string;
  appSecret?: string;
  serviceTypeId?: string;
  pageSize?: string;
  scoreThreshold?: string;
  scoreDelta?: string;
  rememberCredentials?: boolean;
};

const STORAGE_KEY = 'pce:form';

export const loadCachedForm = (): CachedForm | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as CachedForm;
  } catch {
    return null;
  }
};

export const saveCachedForm = (form: CachedForm) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  } catch {
    // If storage is unavailable, ignore and continue without caching.
  }
};
