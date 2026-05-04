// Dev-only logger. `debug` and `info` no-op in production so we don't pay the
// stringification + bridge cost on user devices. `warn` and `error` always log.
const noop = (..._args: any[]): void => {};

export const log = {
  debug: __DEV__ ? (...args: any[]) => console.log(...args) : noop,
  info: __DEV__ ? (...args: any[]) => console.info(...args) : noop,
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
};
