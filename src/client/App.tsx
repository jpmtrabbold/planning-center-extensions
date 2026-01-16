import { useEffect, useMemo, useState } from 'react';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

import type { AppRouter } from '../trpc/router.js';
import type { MatchResult } from '../types.js';
import type { StatusState, Toast } from './types.js';
import { toErrorDetails, toErrorMessage } from './utils/errors.js';
import { loadCachedForm, saveCachedForm } from './utils/storage.js';
import { ApiCredentialsCard } from './components/ApiCredentialsCard.js';
import { MatchesCard } from './components/MatchesCard.js';
import { NotesCard } from './components/NotesCard.js';
import { ScanOptionsCard } from './components/ScanOptionsCard.js';
import { Toasts } from './components/Toasts.js';

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
  const [isScanning, setIsScanning] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

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

      const trimmedServiceType = serviceTypeId.trim();
      if (!trimmedServiceType) {
        throw new Error('Please provide a service type ID.');
      }

      const parsedPageSize = Number.parseInt(pageSize, 10) || 10;
      const parsedThreshold = Number.parseFloat(scoreThreshold) || 0.7;

      const results = await trpcClient.scanMatches.query({
        credentials: getCredentials(),
        serviceTypeId: trimmedServiceType,
        pageSize: parsedPageSize,
        scoreThreshold: parsedThreshold,
      });
      setMatches(results);
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
    setStatus({ state: 'warn', message: 'Results cleared. Ready for another scan.' });
  };

  const handleLinkSong = async (match: MatchResult) => {
    try {
      await trpcClient.updatePlanItemSong.mutate({
        credentials: getCredentials(),
        serviceTypeId: serviceTypeId.trim(),
        planId: match.item.plan.id,
        itemId: match.item.id,
        songId: match.song.id,
      });
      setMatches((prev) =>
        prev.map((item) =>
          item.item.id === match.item.id ? { ...item, score: item.score } : item
        )
      );
    } catch (error) {
      setStatus({ state: 'error', message: toErrorMessage(error) });
      pushToast('Failed to link song', error);
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
        onServiceTypeChange={setServiceTypeId}
        onPageSizeChange={setPageSize}
        onScoreThresholdChange={setScoreThreshold}
        onScan={() => void handleScan()}
        onClear={handleClear}
      />

      <MatchesCard matches={matches} status={status} onLinkSong={(match) => void handleLinkSong(match)} />

      <NotesCard />

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </main>
  );
};
