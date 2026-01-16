import type { MatchResult, ProgressEvent } from '../../types.js';
import type { StatusState } from '../types.js';

type MatchesCardProps = {
  matches: MatchResult[];
  status: { state: StatusState; message: string };
  progress?: ProgressEvent | null;
  selectedMatchIds: Set<string>;
  linkItemStatus: Record<string, 'idle' | 'selected' | 'queued' | 'in_progress' | 'done' | 'error'>;
  selectedSongByItem: Record<string, string>;
  isLinking: boolean;
  onToggleAll: (checked: boolean) => void;
  onToggleMatch: (matchId: string, checked: boolean) => void;
  onSelectMatchSong: (matchId: string, songId: string) => void;
  onSelectTopScore: () => void;
  onLinkSelected: () => void;
};

export const MatchesCard = ({
  matches,
  status,
  progress,
  selectedMatchIds,
  linkItemStatus,
  selectedSongByItem,
  isLinking,
  onToggleAll,
  onToggleMatch,
  onSelectMatchSong,
  onSelectTopScore,
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
        <div className="bulk-actions-buttons">
          <button onClick={onSelectTopScore} disabled={isLinking || selectableMatches.length === 0}>
            Select top score
          </button>
          <button onClick={onLinkSelected} disabled={isLinking || selectedCount === 0}>
            {isLinking ? 'Linking...' : `Link selected (${selectedCount})`}
          </button>
        </div>
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
            <th>Best Score</th>
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
            const selectedSongId = selectedSongByItem[key] ?? match.matches[0]?.song.id ?? '';
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
              <td className="status-cell">
                <span className={`row-status ${statusValue}`}>
                  {statusLabel}
                  {statusValue === 'done' ? <span className="lock-icon">LOCK</span> : null}
                </span>
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
              <td>
                <div className="song-options">
                  {match.matches.map((option) => (
                    <label key={option.song.id} className="song-option">
                      <input
                        type="radio"
                        name={`song-option-${key}`}
                        value={option.song.id}
                        checked={selectedSongId === option.song.id}
                        onChange={() => onSelectMatchSong(key, option.song.id)}
                        disabled={isDisabled}
                      />
                      <span>
                        <a
                          href={`https://services.planningcenteronline.com/songs/${option.song.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {option.song.attributes.title}
                        </a>
                        {` (${option.score.toFixed(2)})`}
                      </span>
                    </label>
                  ))}
                </div>
              </td>
              <td>{match.bestScore.toFixed(2)}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
  );
};
