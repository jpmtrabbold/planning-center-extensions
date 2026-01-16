import { useEffect, useMemo, useRef, useState } from 'react';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

import type { AppRouter } from '../trpc/router.js';
import type { MatchResult, ProgressEvent, ServiceType } from '../types.js';
import type { StatusState, Toast } from './types.js';
import { toErrorDetails, toErrorMessage } from './utils/errors.js';
import { loadCachedForm, saveCachedForm } from './utils/storage.js';
import { ApiCredentialsCard } from './components/ApiCredentialsCard.js';
import { MatchesCard } from './components/MatchesCard.js';
import { NotesCard } from './components/NotesCard.js';
import { ScanOptionsCard } from './components/ScanOptionsCard.js';
import { Toasts } from './components/Toasts.js';

const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws`;
};

export const App = () => {
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [pageSize, setPageSize] = useState('10');
  const [scoreThreshold, setScoreThreshold] = useState('0.7');
  const [rememberCredentials, setRememberCredentials] = useState(false);

  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [status, setStatus] = useState<{ state: StatusState; message: string }>({
    state: 'warn',
    message: 'No scan started yet.',
  });
  const [scanProgress, setScanProgress] = useState<ProgressEvent | null>(null);
  const [linkProgress, setLinkProgress] = useState<ProgressEvent | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const activeScanIdRef = useRef<string | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(() => new Set());
  const [linkItemStatus, setLinkItemStatus] = useState<
    Record<string, 'idle' | 'selected' | 'queued' | 'in_progress' | 'done' | 'error'>
  >({});
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [serviceTypesState, setServiceTypesState] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle'
  );
  const serviceTypesKeyRef = useRef<string | null>(null);

  const getMatchKey = (match: MatchResult) => `${match.item.plan.id}:${match.item.id}`;
  const parseServiceTypeId = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    const match = trimmed.match(/\((\d+)\)\s*$/);
    return match ? match[1] : trimmed;
  };

  const trpcClient = useMemo(
    () =>
      createTRPCProxyClient<AppRouter>({
        transformer: superjson,
        links: [
          httpBatchLink({
            url: '/trpc',
          }),
        ],
      }),
    []
  );

  useEffect(() => {
    const cached = loadCachedForm();
    if (!cached) {
      return;
    }
    if (cached.serviceTypeId) {
      setServiceTypeId(cached.serviceTypeId);
    }
    if (cached.pageSize) {
      setPageSize(cached.pageSize);
    }
    if (cached.scoreThreshold) {
      setScoreThreshold(cached.scoreThreshold);
    }
    if (cached.rememberCredentials) {
      setRememberCredentials(true);
      if (cached.appId) {
        setAppId(cached.appId);
      }
      if (cached.appSecret) {
        setAppSecret(cached.appSecret);
      }
    }
  }, []);

  useEffect(() => {
    saveCachedForm({
      serviceTypeId,
      pageSize,
      scoreThreshold,
      rememberCredentials,
      ...(rememberCredentials ? { appId, appSecret } : {}),
    });
  }, [appId, appSecret, serviceTypeId, pageSize, scoreThreshold, rememberCredentials]);

  useEffect(() => {
    const trimmedId = appId.trim();
    const trimmedSecret = appSecret.trim();
    if (!trimmedId || !trimmedSecret) {
      setServiceTypes([]);
      setServiceTypesState('idle');
      serviceTypesKeyRef.current = null;
      return;
    }
    const key = `${trimmedId}:${trimmedSecret}`;
    const timer = setTimeout(() => {
      serviceTypesKeyRef.current = key;
      setServiceTypesState('loading');
      trpcClient.listServiceTypes
        .query({ appId: trimmedId, appSecret: trimmedSecret })
        .then((types) => {
          setServiceTypes(types);
          setServiceTypesState('ready');
        })
        .catch((error) => {
          setServiceTypes([]);
          setServiceTypesState('error');
          pushToast('Failed to load service types', error);
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [appId, appSecret, trpcClient]);

  useEffect(() => {
    const socket = new WebSocket(getWebSocketUrl());
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProgressEvent;
        if (data.type !== 'scan' && data.type !== 'link') {
          return;
        }
        const activeId = activeScanIdRef.current;
        if (!activeId) {
          return;
        }
        if (data.scanId && data.scanId !== activeId) {
          return;
        }
        if (data.type === 'scan') {
          setScanProgress(data);
        } else if (data.type === 'link') {
          setLinkProgress(data);
        } else if (data.type === 'link-item') {
          setLinkItemStatus((prev) => ({
            ...prev,
            [data.itemId]: data.status,
          }));
          if (data.status === 'done') {
            setSelectedMatchIds((prev) => {
              if (!prev.has(data.itemId)) {
                return prev;
              }
              const next = new Set(prev);
              next.delete(data.itemId);
              return next;
            });
          }
        }
      } catch {
        // Ignore malformed payloads.
      }
    };
    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, []);

  const pushToast = (title: string, error: unknown) => {
    const toast: Toast = {
      id: crypto.randomUUID(),
      title,
      message: toErrorMessage(error),
      details: toErrorDetails(error),
    };
    setToasts((prev) => [toast, ...prev].slice(0, 3));
  };

  const getCredentials = () => {
    const trimmedId = appId.trim();
    const trimmedSecret = appSecret.trim();
    if (!trimmedId || !trimmedSecret) {
      throw new Error('Please provide an application ID and secret.');
    }
    return { appId: trimmedId, appSecret: trimmedSecret };
  };

  const handleScan = async () => {
    try {
      setIsScanning(true);
      setStatus({ state: 'warn', message: 'Scanning Planning Center...' });

      const trimmedServiceType = parseServiceTypeId(serviceTypeId);
      if (!trimmedServiceType) {
        throw new Error('Please provide a service type ID.');
      }

      const parsedPageSize = Number.parseInt(pageSize, 10) || 10;
      const parsedThreshold = Number.parseFloat(scoreThreshold) || 0.7;
      const scanId = crypto.randomUUID();
      activeScanIdRef.current = scanId;
      setLinkProgress(null);
      setScanProgress({
        type: 'scan',
        scanId,
        step: 1,
        stepLabel: 'starting',
        stepPercent: 0,
        overallPercent: 0,
      });

      const results = await trpcClient.scanMatches.query({
        credentials: getCredentials(),
        serviceTypeId: trimmedServiceType,
        pageSize: parsedPageSize,
        scoreThreshold: parsedThreshold,
        scanId,
      });
      setMatches(results);
      const nextIds = new Set(results.map((match) => getMatchKey(match)));
      setSelectedMatchIds(nextIds);
      setLinkItemStatus(
        results.reduce<Record<string, 'idle' | 'selected' | 'queued' | 'in_progress' | 'done' | 'error'>>(
          (acc, match) => {
            acc[getMatchKey(match)] = 'selected';
            return acc;
          },
          {}
        )
      );
      if (results.length === 0) {
        setStatus({ state: 'warn', message: 'No matching unlinked songs found.' });
      } else {
        setStatus({ state: 'ok', message: `Found ${results.length} potential matches.` });
      }
    } catch (error) {
      setStatus({ state: 'error', message: toErrorMessage(error) });
      pushToast('Scan failed', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleClear = () => {
    setMatches([]);
    setSelectedMatchIds(new Set());
    setScanProgress(null);
    setLinkProgress(null);
    setLinkItemStatus({});
    setStatus({ state: 'warn', message: 'Results cleared. Ready for another scan.' });
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      const nextIds = new Set(
        matches
          .filter((match) => {
            const statusValue = linkItemStatus[getMatchKey(match)];
            return statusValue !== 'done' && statusValue !== 'in_progress' && statusValue !== 'queued';
          })
          .map((match) => getMatchKey(match))
      );
      setSelectedMatchIds(nextIds);
      setLinkItemStatus((prev) => {
        const next = { ...prev };
        matches.forEach((match) => {
          const key = getMatchKey(match);
          if (next[key] !== 'done' && next[key] !== 'in_progress') {
            next[key] = 'selected';
          }
        });
        return next;
      });
    } else {
      setSelectedMatchIds(new Set());
      setLinkItemStatus((prev) => {
        const next = { ...prev };
        matches.forEach((match) => {
          const key = getMatchKey(match);
          if (next[key] !== 'done' && next[key] !== 'in_progress') {
            next[key] = 'idle';
          }
        });
        return next;
      });
    }
  };

  const handleToggleMatch = (matchId: string, checked: boolean) => {
    setSelectedMatchIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(matchId);
      } else {
        next.delete(matchId);
      }
      return next;
    });
    setLinkItemStatus((prev) => {
      const current = prev[matchId];
      if (current === 'done' || current === 'in_progress' || current === 'queued') {
        return prev;
      }
      return {
        ...prev,
        [matchId]: checked ? 'selected' : 'idle',
      };
    });
  };

  const handleLinkSelected = async () => {
    if (matches.length === 0) {
      return;
    }
    const selected = matches.filter((match) => {
      const key = getMatchKey(match);
      const statusValue = linkItemStatus[key];
      return (
        selectedMatchIds.has(key) &&
        statusValue !== 'done' &&
        statusValue !== 'in_progress' &&
        statusValue !== 'queued'
      );
    });
    if (selected.length === 0) {
      setStatus({ state: 'warn', message: 'Select at least one match to link.' });
      return;
    }
    try {
      setIsLinking(true);
      const scanId = activeScanIdRef.current ?? crypto.randomUUID();
      activeScanIdRef.current = scanId;
      setLinkProgress({
        type: 'link',
        scanId,
        step: 1,
        stepLabel: 'starting',
        stepPercent: 0,
        overallPercent: 0,
      });
      setLinkItemStatus((prev) => {
        const next = { ...prev };
        selected.forEach((match) => {
          const key = getMatchKey(match);
          if (next[key] !== 'done') {
            next[key] = 'queued';
          }
        });
        return next;
      });
      const trimmedServiceType = parseServiceTypeId(serviceTypeId);
      if (!trimmedServiceType) {
        throw new Error('Please provide a service type ID.');
      }
      await trpcClient.linkMatches.mutate({
        credentials: getCredentials(),
        serviceTypeId: trimmedServiceType,
        scanId,
        selections: selected.map((match) => ({
          planId: match.item.plan.id,
          itemId: match.item.id,
          songId: match.song.id,
          selectionKey: getMatchKey(match),
        })),
      });
      setStatus({
        state: 'ok',
        message: `Linked ${selected.length} plan item${selected.length === 1 ? '' : 's'}.`,
      });
    } catch (error) {
      setStatus({ state: 'error', message: toErrorMessage(error) });
      pushToast('Bulk link failed', error);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <main>
      <h1>Planning Center Song Linker</h1>
      <p>
        Find plan items that were entered by name (no linked song) and propose fuzzy matches to
        existing songs. Provide your Planning Center API credentials and the service type to scan.
      </p>

      <ApiCredentialsCard
        appId={appId}
        appSecret={appSecret}
        rememberCredentials={rememberCredentials}
        onAppIdChange={setAppId}
        onAppSecretChange={setAppSecret}
        onRememberChange={setRememberCredentials}
      />

      <ScanOptionsCard
        serviceTypeId={serviceTypeId}
        pageSize={pageSize}
        scoreThreshold={scoreThreshold}
        isScanning={isScanning}
        serviceTypes={serviceTypes.map((serviceType) => ({
          id: serviceType.id,
          name: serviceType.attributes.name,
        }))}
        serviceTypesState={serviceTypesState}
        onServiceTypeChange={setServiceTypeId}
        onPageSizeChange={setPageSize}
        onScoreThresholdChange={setScoreThreshold}
        onScan={() => void handleScan()}
        onClear={handleClear}
      />

      <MatchesCard
        matches={matches}
        status={status}
        progress={isLinking ? linkProgress : scanProgress}
        selectedMatchIds={selectedMatchIds}
        linkItemStatus={linkItemStatus}
        isLinking={isLinking}
        onToggleAll={handleToggleAll}
        onToggleMatch={handleToggleMatch}
        onLinkSelected={() => void handleLinkSelected()}
      />

      <NotesCard />

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </main>
  );
};
