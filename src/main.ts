import { listPlanItems, listPlans, listSongs, updatePlanItemSong } from './api.js';
import { similarityScore } from './fuzzy.js';
import type { MatchResult, Plan, PlanItemWithPlan, Song } from './types.js';

const appIdInput = document.querySelector<HTMLInputElement>('#app-id');
const appSecretInput = document.querySelector<HTMLInputElement>('#app-secret');
const serviceTypeInput = document.querySelector<HTMLInputElement>('#service-type-id');
const pageSizeInput = document.querySelector<HTMLInputElement>('#page-size');
const scoreThresholdInput = document.querySelector<HTMLInputElement>('#score-threshold');
const scanButton = document.querySelector<HTMLButtonElement>('#scan-button');
const clearButton = document.querySelector<HTMLButtonElement>('#clear-button');
const resultsBody = document.querySelector<HTMLTableSectionElement>('#results-body');
const statusBadge = document.querySelector<HTMLSpanElement>('#status');
const statusMessage = document.querySelector<HTMLParagraphElement>('#status-message');

const assertElement = <T extends HTMLElement>(element: T | null, name: string): T => {
  if (!element) {
    throw new Error(`Missing element: ${name}`);
  }
  return element;
};

const elements = {
  appIdInput: assertElement(appIdInput, 'app-id'),
  appSecretInput: assertElement(appSecretInput, 'app-secret'),
  serviceTypeInput: assertElement(serviceTypeInput, 'service-type-id'),
  pageSizeInput: assertElement(pageSizeInput, 'page-size'),
  scoreThresholdInput: assertElement(scoreThresholdInput, 'score-threshold'),
  scanButton: assertElement(scanButton, 'scan-button'),
  clearButton: assertElement(clearButton, 'clear-button'),
  resultsBody: assertElement(resultsBody, 'results-body'),
  statusBadge: assertElement(statusBadge, 'status'),
  statusMessage: assertElement(statusMessage, 'status-message'),
};

const setStatus = (state: 'ok' | 'warn' | 'error', message: string) => {
  elements.statusBadge.className = `status ${state}`;
  elements.statusBadge.textContent =
    state === 'ok' ? 'Ready' : state === 'warn' ? 'Waiting' : 'Error';
  elements.statusMessage.textContent = message;
};

const getCredentials = () => {
  const appId = elements.appIdInput.value.trim();
  const appSecret = elements.appSecretInput.value.trim();
  if (!appId || !appSecret) {
    throw new Error('Please provide an application ID and secret.');
  }
  return { appId, appSecret };
};

const buildMatchResults = (
  items: PlanItemWithPlan[],
  songs: Song[],
  threshold: number
): MatchResult[] => {
  const results: MatchResult[] = [];
  for (const item of items) {
    if (!item.attributes.title) {
      continue;
    }
    let bestScore = 0;
    let bestSong: Song | null = null;
    for (const song of songs) {
      const score = similarityScore(item.attributes.title, song.attributes.title);
      if (score > bestScore) {
        bestScore = score;
        bestSong = song;
      }
    }
    if (bestSong && bestScore >= threshold) {
      results.push({ item, song: bestSong, score: bestScore });
    }
  }
  return results.sort((a, b) => b.score - a.score);
};

const renderResults = (matches: MatchResult[], serviceTypeId: string) => {
  elements.resultsBody.innerHTML = '';

  if (matches.length === 0) {
    setStatus('warn', 'No matching unlinked songs found.');
    return;
  }

  for (const match of matches) {
    const row = document.createElement('tr');
    const planCell = document.createElement('td');
    planCell.textContent = `${match.item.plan.attributes.title} (${match.item.plan.attributes.dates})`;

    const itemCell = document.createElement('td');
    itemCell.textContent = match.item.attributes.title;

    const songCell = document.createElement('td');
    songCell.textContent = match.song.attributes.title;

    const scoreCell = document.createElement('td');
    scoreCell.textContent = match.score.toFixed(2);

    const actionCell = document.createElement('td');
    const linkButton = document.createElement('button');
    linkButton.textContent = 'Link song';
    linkButton.addEventListener('click', async () => {
      try {
        linkButton.disabled = true;
        linkButton.textContent = 'Linking...';
        await updatePlanItemSong(
          getCredentials(),
          serviceTypeId,
          match.item.plan.id,
          match.item.id,
          match.song.id
        );
        linkButton.textContent = 'Linked ✓';
      } catch (error) {
        linkButton.disabled = false;
        linkButton.textContent = 'Retry';
        setStatus('error', (error as Error).message);
      }
    });
    actionCell.append(linkButton);

    row.append(planCell, itemCell, songCell, scoreCell, actionCell);
    elements.resultsBody.appendChild(row);
  }

  setStatus('ok', `Found ${matches.length} potential matches.`);
};

const loadUnlinkedItems = async (plans: Plan[], serviceTypeId: string) => {
  const unlinked: PlanItemWithPlan[] = [];
  for (const plan of plans) {
    const items = await listPlanItems(getCredentials(), serviceTypeId, plan.id);
    for (const item of items) {
      const hasSong = item.relationships?.song?.data?.id;
      if (!hasSong && item.attributes.title) {
        unlinked.push({ ...item, plan });
      }
    }
  }
  return unlinked;
};

const handleScan = async () => {
  try {
    elements.scanButton.disabled = true;
    setStatus('warn', 'Scanning Planning Center...');

    const serviceTypeId = elements.serviceTypeInput.value.trim();
    if (!serviceTypeId) {
      throw new Error('Please provide a service type ID.');
    }

    const pageSize = Number.parseInt(elements.pageSizeInput.value, 10) || 10;
    const threshold = Number.parseFloat(elements.scoreThresholdInput.value) || 0.7;

    const [songs, plans] = await Promise.all([
      listSongs(getCredentials()),
      listPlans(getCredentials(), serviceTypeId, pageSize),
    ]);

    const unlinkedItems = await loadUnlinkedItems(plans, serviceTypeId);
    const matches = buildMatchResults(unlinkedItems, songs, threshold);
    renderResults(matches, serviceTypeId);
  } catch (error) {
    setStatus('error', (error as Error).message);
  } finally {
    elements.scanButton.disabled = false;
  }
};

const handleClear = () => {
  elements.resultsBody.innerHTML = '';
  setStatus('warn', 'Results cleared. Ready for another scan.');
};

elements.scanButton.addEventListener('click', () => {
  void handleScan();
});

elements.clearButton.addEventListener('click', handleClear);
