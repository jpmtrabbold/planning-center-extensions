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

export interface MatchResult {
  item: PlanItemWithPlan;
  song: Song;
  score: number;
}
