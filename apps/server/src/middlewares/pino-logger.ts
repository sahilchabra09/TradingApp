import { pinoLogger } from 'hono-pino'
import pino from 'pino'
import pretty from 'pino-pretty'

export function logger() {
    return pinoLogger({
        pino: pino(pretty()),
        http: {
            reqId: () => crypto.randomUUID()
        }
    })
}