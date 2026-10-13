export interface RequestLog {
  requestId: string;
  method: string | null;
  operationType: string | null;
  operationName: string | null;
  durationMs: number;
  status: 'ok' | 'error';
  errorCodes: string[];
}
