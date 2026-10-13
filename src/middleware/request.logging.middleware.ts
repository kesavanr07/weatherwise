import { randomUUID } from 'node:crypto';

import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';

import type { Logger } from '../common/interfaces/logger.interface.js';
import type { RequestContext } from './interfaces/request.context.interface.js';
import type { RequestLog } from '../common/interfaces/request.log.interface.js';

// GraphQL log records intentionally serialize absent fields as JSON null.
// eslint-disable-next-line unicorn/no-null
const NO_VALUE = null;

/** Build a structured request log from GraphQL lifecycle data.
@param input Request identifiers, timestamps, operation metadata, and errors.
@param input.requestId Request correlation identifier.
@param input.method HTTP method, when available.
@param input.operationType GraphQL operation type, when available.
@param input.operationName GraphQL operation name, when available.
@param input.startedAt Request start timestamp.
@param input.completedAt Request completion timestamp.
@param input.errors GraphQL errors returned by the operation.
@returns A normalized request log record.
*/
export function describeRequest(input: {
  requestId: string;
  method?: string | null;
  operationType?: string | null;
  operationName?: string | null;
  startedAt: number;
  completedAt?: number;
  errors?: readonly { extensions?: { code?: unknown } }[];
}): RequestLog {
  const errorCodes = (input.errors ?? [])
    .map((error) => error.extensions?.code)
    .filter((code): code is string => typeof code === 'string');

  return {
    requestId: input.requestId,
    method: input.method ?? NO_VALUE,
    operationType: input.operationType ?? NO_VALUE,
    operationName: input.operationName ?? NO_VALUE,
    durationMs: Math.max(0, (input.completedAt ?? Date.now()) - input.startedAt),
    status: errorCodes.length > 0 ? 'error' : 'ok',
    errorCodes,
  };
}

/** Create a plugin that logs completed GraphQL requests.
@param log Logger used for request events.
@returns Apollo Server request logging plugin.
*/
export function requestLoggingPlugin(log: Logger): ApolloServerPlugin<RequestContext> {
  return {
    /** Start tracking an incoming GraphQL operation.
    @param requestContext Apollo request lifecycle context.
    @returns Response logging hooks when an operation exists.
    */
    requestDidStart(requestContext): Promise<GraphQLRequestListener<RequestContext> | undefined> {
      if (
        typeof requestContext.request.query !== 'string' ||
        requestContext.request.query.length === 0
      ) {
        return Promise.resolve();
      }

      const requestId = randomUUID();
      const startedAt = Date.now();
      requestContext.response.http.headers.set('x-request-id', requestId);

      return Promise.resolve({
        /** Log the completed GraphQL response.
        @param context Apollo request lifecycle context.
        @returns Completion promise for the response hook.
        */
        willSendResponse(context): Promise<void> {
          const body = context.response.body;
          const result = body.kind === 'single' ? body.singleResult : body.initialResult;
          const entry = describeRequest({
            requestId,
            method: context.request.http?.method,
            operationType: context.operation?.operation,
            operationName: context.operationName ?? context.request.operationName,
            startedAt,
            errors: result.errors,
          });
          const write = entry.status === 'error' ? log.warn.bind(log) : log.info.bind(log);
          write('graphql.request', { ...entry });
          return Promise.resolve();
        },
      });
    },
  };
}
