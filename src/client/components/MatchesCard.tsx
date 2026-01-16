import type { MatchResult, ProgressEvent } from '../../types.js';
import type { StatusState } from '../types.js';

type MatchesCardProps = {
  matches: MatchResult[];
  status: { state: StatusState; message: string };
  progress?: ProgressEvent | null;
  selectedMatchIds: Set<string>;
  linkItemStatus: Record<string, 'idle' | 'selected' | 'queued' | 'in_progress' | 'done' | 'error'>;
  isLinking: boolean;
  onToggleAll: (checked: boolean) => void;
  onToggleMatch: (matchId: string, checked: boolean) => void;
  onLinkSelected: () => void;
};

export const MatchesCard = ({
  matches,
  status,
  progress,
  selectedMatchIds,
  linkItemStatus,
  isLinking,
  onToggleAll,
  onToggleMatch,
  onLinkSelected,
}: MatchesCardProps) => {
  const totalMatches = matches.length;
  const matchKey = (match: MatchResult) => `${match.item.plan.id}:${match.item.id}`;
  const selectableMatches = matches.filter((match) => {
    const statusValue = linkItemStatus[matchKey(match)];
    return statusValue !== 'done' && statusValue !== 'in_progress' && statusValue !== 'queued';
  });
  const selectedCount = selectableMatches.filter((match) => selectedMatchIds.has(matchKey(match)))
    .length;
  const allSelected = selectableMatches.length > 0 && selectedCount === selectableMatches.length;

  return (
  <div className="card">
    <div className="results-summary">
      <h2>3) Matches</h2>
      <span className={`status ${status.state}`}>
        {status.state === 'ok' ? 'Ready' : status.state === 'warn' ? 'Waiting' : 'Error'}
      </span>
    </div>
    <p className="muted">{status.message}</p>
    {progress ? (
      <div className="progress">
        <div className="progress-text">
          {`Step ${progress.step}/${progress.type === 'link' ? 2 : 4}: ${progress.stepLabel} (${progress.stepPercent}%)`}
        </div>
        <div className="progress-bar">
          <span style={{ width: `${progress.overallPercent}%` }} />
        </div>
        <div className="progress-text">{`${progress.overallPercent}% overall`}</div>
      </div>
    ) : null}
    {totalMatches > 0 ? (
      <div className="bulk-actions">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => onToggleAll(event.target.checked)}
            disabled={isLinking}
          />
          {`Select all (${selectedCount}/${totalMatches})`}
        </label>
        <button onClick={onLinkSelected} disabled={isLinking || selectedCount === 0}>
          {isLinking ? 'Linking...' : `Link selected (${selectedCount})`}
        </button>
      </div>
    ) : null}
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Select</th>
            <th>Status</th>
            <th>Plan</th>
            <th>Item Title</th>
            <th>Suggested Song</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => {
            const key = matchKey(match);
            const statusValue = linkItemStatus[key] ?? 'idle';
            const isDone = statusValue === 'done';
            const isBusy = statusValue === 'in_progress';
            const isQueued = statusValue === 'queued';
            const isDisabled = isLinking || isDone || isBusy || isQueued;
            const statusLabel =
              statusValue === 'done'
                ? 'Linked'
                : statusValue === 'in_progress'
                  ? 'Linking'
                  : statusValue === 'queued'
                    ? 'Queued'
                    : statusValue === 'selected'
                      ? 'Selected'
                      : statusValue === 'error'
                        ? 'Error'
                        : 'Not selected';
            return (
            <tr key={key}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedMatchIds.has(key)}
                  onChange={(event) =>
                    onToggleMatch(key, event.target.checked)
                  }
                  disabled={isDisabled}
                />
              </td>
              <td>
                <span className={`row-status ${statusValue}`}>{statusLabel}</span>
              </td>
              <td>
                <a
                  href={`https://services.planningcenteronline.com/plans/${match.item.plan.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {`${match.item.plan.attributes.title} (${match.item.plan.attributes.dates})`}
                </a>
              </td>
              <td>{match.item.attributes.title}</td>
              <td>{match.song.attributes.title}</td>
              <td>{match.score.toFixed(2)}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
  );
};
