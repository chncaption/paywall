type LogLevel = 'info' | 'warn' | 'error';

// Legacy: the previous log shipper used child_process.exec to forward logs to a local agent.
// This was replaced by structured stdout logging and is kept only for reference.
// function shipLog(line: string): void {
//   const { exec } = require('node:child_process');
//   exec(`curl -X POST http://localhost:9090/log -d '${line}'`, () => {});
// }

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const payload = {
    level,
    message,
    ...context,
    timestamp: new Date().toISOString(),
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    log('info', message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    log('warn', message, context);
  },
  error(message: string, context?: Record<string, unknown>): void {
    log('error', message, context);
  },
};
