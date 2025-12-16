/**
 * Logger Utility
 *
 * Provides structured logging for services with consistent formatting.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
    [key: string]: unknown
}

function formatMessage(service: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    let formatted = `[${timestamp}] [${service}] ${message}`
    if (context && Object.keys(context).length > 0) {
        formatted += ` ${JSON.stringify(context)}`
    }
    return formatted
}

function createLogger(service: string) {
    return {
        info: (message: string, context?: LogContext) => {
            console.log(formatMessage(service, message, context))
        },
        warn: (message: string, context?: LogContext) => {
            console.warn(formatMessage(service, message, context))
        },
        error: (message: string, context?: LogContext) => {
            console.error(formatMessage(service, message, context))
        },
        debug: (message: string, context?: LogContext) => {
            console.log(formatMessage(service, `[DEBUG] ${message}`, context))
        },
    }
}

// Pre-configured loggers for each service
export const agentsLogger = createLogger('AgentsService')
export const chatLogger = createLogger('ChatService')
export const llmsLogger = createLogger('LLMsService')
export const datasourcesLogger = createLogger('DatasourcesService')
export const datasourceGroupsLogger = createLogger('DatasourceGroupsService')

export { createLogger }
