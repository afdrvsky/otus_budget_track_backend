import pino from 'pino';
import { config } from '../config/env';

const isDev = config.nodeEnv === 'development';

const transport = isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
    req(req) {
      return {
        method: req.method,
        url: req.url,
      };
    },
  },
  redact: {
    paths: ['password', 'token', 'authorization', 'access_token', 'refresh_token'],
    censor: '[REDACTED]',
  },
});

export default logger;
