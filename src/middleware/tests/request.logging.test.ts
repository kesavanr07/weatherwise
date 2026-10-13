import { createLogger } from '../../common/logging/logger.js';
import { describeRequest } from '../request.logging.middleware.js';

const ERROR_OPERATION_NAME = 'ActivitySuitability';

describe('request logging', () => {
  it('records a successful operation without error codes', () => {
    const entry = describeRequest({
      requestId: 'req-1',
      method: 'POST',
      operationType: 'query',
      operationName: ERROR_OPERATION_NAME,
      startedAt: 1000,
      completedAt: 1040,
    });

    expect(entry).toEqual({
      requestId: 'req-1',
      method: 'POST',
      operationType: 'query',
      operationName: 'ActivitySuitability',
      durationMs: 40,
      status: 'ok',
      errorCodes: [],
    });
  });

  it('records the public error code when the operation fails', () => {
    const entry = describeRequest({
      requestId: 'req-2',
      method: 'POST',
      operationType: 'query',
      operationName: undefined,
      startedAt: 500,
      completedAt: 500,
      errors: [{ extensions: { code: 'LOCATION_NOT_FOUND' } }],
    });

    expect(entry.status).toBe('error');
    expect(entry.errorCodes).toEqual(['LOCATION_NOT_FOUND']);
    expect(entry.durationMs).toBe(0);
  });

  it('drops log lines below the configured level', () => {
    const lines: string[] = [];
    const log = createLogger('warn', (line) => {
      lines.push(line);
    });

    log.info(ERROR_OPERATION_NAME, { status: 'ok' });
    log.warn(ERROR_OPERATION_NAME, { status: 'error' });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({
      level: 'warn',
      message: ERROR_OPERATION_NAME,
      status: 'error',
    });
  });
});
