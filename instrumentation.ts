// NATIVE Next.js fetch instrumentation path (NO @vercel/otel).
// This mirrors a setup where a raw OTel SDK feeds an exporter (e.g. Azure Monitor),
// and the AppRender.fetch spans are created by Next core's patch-fetch.ts.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeTracerProvider } = await import('@opentelemetry/sdk-trace-node')
    const { ConsoleSpanExporter, SimpleSpanProcessor } = await import(
      '@opentelemetry/sdk-trace-base'
    )
    const provider = new NodeTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
    })
    provider.register()
  }
}
