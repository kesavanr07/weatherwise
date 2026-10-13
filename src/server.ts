import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { GraphQLError } from 'graphql';

import { environment } from './config/environment.js';
import { AppError } from './common/error-handler/error.handler.js';
import { logger } from './common/logging/logger.js';
import { WeatherService } from './services/weather.service.js';
import { requestLoggingPlugin } from './middleware/request.logging.middleware.js';
import { schema } from './graphql/schema.js';
import { WeatherRepository } from './database/models/weather.repository.js';
import { openDatabase } from './database/client.js';
import { OpenMeteoProvider } from './provider/open.meteo.provider.js';

/**
Start the HTTP server, database, and GraphQL service.
*/
async function startServer(): Promise<void> {
  const database = openDatabase(environment.DATABASE_PATH);
  const repository = new WeatherRepository(database);
  const provider = new OpenMeteoProvider(environment.REQUEST_TIMEOUT_MS);
  const service = new WeatherService({ provider, repository });

  const server = new ApolloServer({
    schema,
    introspection: true,
    includeStacktraceInErrorResponses: false,
    plugins: [requestLoggingPlugin(logger)],
    /**
    Convert internal errors into stable client responses.
    @param formattedError GraphQL formatted error.
    @param error Original error.
    @returns Sanitized GraphQL error response.
    */
    formatError: (
      formattedError,
      error,
    ): ReturnType<typeof AppError.prototype.toClientResponse> => {
      const cause = error instanceof GraphQLError ? (error.originalError ?? error) : error;
      const appError = AppError.from(cause, formattedError.extensions?.code);
      if (appError.shouldLog) {
        const detail = appError.cause instanceof Error ? appError.cause.message : undefined;
        logger.error('graphql.failure', { code: appError.code, detail });
      }
      return appError.toClientResponse(formattedError);
    },
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: environment.PORT },
    /**
    Create the resolver context.
    @returns The weather service context.
    */
    context: (): { service: WeatherService } => ({ service }),
  });

  logger.info('server.listening', { url });

  /**
  Stop the HTTP server and close the database connection.
  */
  const shutdown = async (): Promise<void> => {
    await server.stop();
    database.close();
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

try {
  await startServer();
} catch (error: unknown) {
  logger.error('server.startup_failure', {
    detail: error instanceof Error ? error.message : String(error),
  });
  throw error;
}
