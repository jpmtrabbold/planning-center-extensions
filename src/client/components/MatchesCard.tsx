import type { MatchResult } from '../../types.js';
import type { StatusState } from '../types.js';

type MatchesCardProps = {
  matches: MatchResult[];
  status: { state: StatusState; message: string };
  onLinkSong: (match: MatchResult) => void;
};

export const MatchesCard = ({ matches, status, onLinkSong }: MatchesCardProps) => (
  <div className="card">
    <div className="results-summary">
      <h2>3) Matches</h2>
      <span className={`status ${status.state}`}>
        {status.state === 'ok' ? 'Ready' : status.state === 'warn' ? 'Waiting' : 'Error'}
      </span>
    </div>
    <p className="muted">{status.message}</p>
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Item Title</th>
            <th>Suggested Song</th>
            <th>Score</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <tr key={`${match.item.plan.id}:${match.item.id}`}>
              <td>{`${match.item.plan.attributes.title} (${match.item.plan.attributes.dates})`}</td>
              <td>{match.item.attributes.title}</td>
              <td>{match.song.attributes.title}</td>
              <td>{match.score.toFixed(2)}</td>
              <td>
                <button onClick={() => onLinkSong(match)}>Link song</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
