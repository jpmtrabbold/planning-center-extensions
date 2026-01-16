export interface ApiResponse<T> {
  data: T;
  included?: unknown[];
  meta?: {
    total_count?: number;
  };
  links?: {
    next?: string | null;
  };
}

export interface Song {
  id: string;
  type: 'Song';
  attributes: {
    title: string;
    author?: string | null;
    ccli?: string | null;
  };
}

export interface Plan {
  id: string;
  type: 'Plan';
  attributes: {
    title: string;
    dates: string;
  };
}

export interface ServiceType {
  id: string;
  type: 'ServiceType';
  attributes: {
    name: string;
  };
}

export interface Arrangement {
  id: string;
  type: 'Arrangement';
  attributes?: {
    name?: string | null;
    is_default?: boolean;
    default?: boolean;
    isDefault?: boolean;
    is_default_arrangement?: boolean;
  };
}

export interface ArrangementKey {
  id: string;
  type: 'Key';
  attributes?: {
    name?: string | null;
    is_default?: boolean;
    default?: boolean;
    isDefault?: boolean;
    is_default_key?: boolean;
  };
}

export interface PlanItem {
  id: string;
  type: 'Item';
  attributes: {
    title: string;
    position: number;
  };
  relationships?: {
    song?: {
      data: { type: 'Song'; id: string } | null;
    };
  };
}

export interface PlanItemWithPlan extends PlanItem {
  plan: Plan;
}

export interface SuggestedSong {
  song: Song;
  score: number;
}

export interface MatchResult {
  item: PlanItemWithPlan;
  matches: SuggestedSong[];
  bestScore: number;
}

export type ProgressEvent =
  | {
      type: 'scan' | 'link';
      scanId?: string;
      step: number;
      stepLabel: string;
      stepPercent: number;
      overallPercent: number;
    }
  | {
      type: 'link-item';
      scanId?: string;
      itemId: string;
      status: 'queued' | 'in_progress' | 'done' | 'error';
    };
