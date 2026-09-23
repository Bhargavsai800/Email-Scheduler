type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface Logger {
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  debug(message: string, meta?: unknown): void;
}

const formatMessage = (level: LogLevel, message: string, meta?: unknown): string => {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${typeof meta === 'object' ? JSON.stringify(meta) : String(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
};

export const logger: Logger = {
  info: (message, meta) => console.log(formatMessage('info', message, meta)),
  warn: (message, meta) => console.warn(formatMessage('warn', message, meta)),
  error: (message, meta) => console.error(formatMessage('error', message, meta)),
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message, meta));
    }
  },
};
