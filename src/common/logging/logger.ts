import { environment } from '../../config/environment.js';
import type { Logger, LogFields, LogLevel } from '../interfaces/logger.interface.js';

const LEVELS = new Map<LogLevel, number>([
  ['debug', 10],
  ['info', 20],
  ['warn', 30],
  ['error', 40],
]);

/** Write a structured log message to standard output.
@param line Serialized log event.
*/
function defaultWrite(line: string): void {
  process.stdout.write(`${line}\n`);
}

/** Create logger methods filtered by the minimum severity.
@param level Minimum severity to write.
@param write Destination for serialized events.
@returns Logger methods for each supported severity.
*/
export function createLogger(
  level: LogLevel,
  write: (line: string) => void = defaultWrite,
): Logger {
  const minimum = LEVELS.get(level) ?? 20;

  /** Serialize and write one log event.
  @param entryLevel Event severity.
  @param message Event name or message.
  @param fields Optional structured context.
  */
  const log = (entryLevel: LogLevel, message: string, fields?: LogFields): void => {
    if ((LEVELS.get(entryLevel) ?? 20) < minimum) return;
    const line = JSON.stringify({
      time: new Date().toISOString(),
      level: entryLevel,
      message,
      ...fields,
    });
    if (entryLevel === 'error' && write === defaultWrite) {
      process.stderr.write(`${line}\n`);
      return;
    }
    write(line);
  };

  return {
    /** Write a debug event.
    @param message Event name or message.
    @param fields Optional structured context.
    */
    debug: (message: string, fields?: LogFields): void => {
      log('debug', message, fields);
    },
    /** Write an informational event.
    @param message Event name or message.
    @param fields Optional structured context.
    */
    info: (message: string, fields?: LogFields): void => {
      log('info', message, fields);
    },
    /** Write a warning event.
    @param message Event name or message.
    @param fields Optional structured context.
    */
    warn: (message: string, fields?: LogFields): void => {
      log('warn', message, fields);
    },
    /** Write an error event.
    @param message Event name or message.
    @param fields Optional structured context.
    */
    error: (message: string, fields?: LogFields): void => {
      log('error', message, fields);
    },
  };
}

export const logger = createLogger(environment.LOG_LEVEL);
