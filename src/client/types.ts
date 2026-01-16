export type StatusState = 'ok' | 'warn' | 'error';

export type Toast = {
  id: string;
  title: string;
  message: string;
  details: string;
};
