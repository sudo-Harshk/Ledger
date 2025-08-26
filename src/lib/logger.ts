// Simple dev-only logger to avoid leaking PII in production
// Debug/info/warn logs are suppressed in production builds
const isDev = import.meta.env.MODE === 'development'

type LogArgs = [message?: unknown, ...optionalParams: unknown[]]

export const logger = {
  debug: (...args: LogArgs) => {
    if (isDev) console.debug(...args)
  },
  info: (...args: LogArgs) => {
    if (isDev) console.info(...args)
  },
  warn: (...args: LogArgs) => {
    if (isDev) console.warn(...args)
  },
  error: (...args: LogArgs) => {
    // Always log errors, but avoid sensitive details in production when possible
    if (isDev) {
      console.error(...args)
    } else {
      const [first] = args
      // Print only first arg if it is a string; otherwise generic
      if (typeof first === 'string') {
        console.error(first)
      } else {
        console.error('An unexpected error occurred')
      }
      // Optionally, integrate with a remote error reporter here
    }
  }
}

export default logger


