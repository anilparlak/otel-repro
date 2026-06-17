import { registerOTel } from '@vercel/otel'
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node'

// Console exporter prints every span (including its `status`) to stdout,
// so no APM backend is needed to observe the bug.
export function register() {
  registerOTel({
    serviceName: 'otel-fetch-status-repro',
    spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
  })
}
