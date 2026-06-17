# AppRender.fetch spans never set span status to ERROR for failed (4xx/5xx) responses

### Summary

Next.js's native fetch instrumentation (`patch-fetch.ts`) creates
`AppRender.fetch` spans but never calls
`span.setStatus({ code: SpanStatusCode.ERROR })` when the response status is
4xx/5xx. As a result, OTel-compatible APM backends (Azure Application
Insights, Datadog, Honeycomb, etc.) that consume these native spans record
failed backend dependencies as successful.

### Reproduction

Minimal repro (no APM backend needed — a `ConsoleSpanExporter` prints each
span's `status`): <https://github.com/anilparlak/otel-repro>

Two instrumentation paths are included. With a raw OTel SDK (no
`@vercel/otel`), the `fetch` spans come from Next core and carry
`next.span_type: AppRender.fetch`:

```
name: 'fetch GET .../api/fail',
attributes: {
  'next.span_type': 'AppRender.fetch',
  'http.method': 'GET',
  ...                       // note: no http.status_code attribute
},
status: { code: 0 },        // UNSET, despite the upstream HTTP 503
```

Observed status across paths:

| Path                      | Response | span.status.code |
|---------------------------|----------|------------------|
| native (`patch-fetch.ts`) | 503      | 0 (UNSET)        |
| native (`patch-fetch.ts`) | 404      | 0 (UNSET)        |
| `@vercel/otel`            | 503      | 2 (ERROR)        |
| `@vercel/otel`            | 404      | 0 (UNSET)        |

Note `@vercel/otel` only marks `status >= 500`, so 4xx is unmarked on every
path, and the native path marks neither.

### Concrete impact — Azure Application Insights

A server-side fetch returning HTTP 503 is recorded as a successful
dependency:

| name                           | resultCode | success |
|--------------------------------|------------|---------|
| fetch POST https://api/v1/play | 0          | True    |

customDimensions show `next.span_type: AppRender.fetch` with no error
status. Consequences in the APM UI: the Failures → Dependencies panel is
empty, the Application Map shows a 0% failure rate (looks healthy), and
operators cannot diagnose backend errors from the APM UI alone.

### Related work

Two PRs add a status-code attribute but neither sets span status to ERROR:

- #57646 (open since Oct 2023) — adds the deprecated `http.status_code`.
- #84039 (open since Sep 2025) — uses the current
  `http.response.status_code` convention; also stalled.

### Suggested fix

In the same place the status-code attribute is set
(`packages/next/src/server/lib/patch-fetch.ts`), also set the span status
for failed responses:

```ts
import { SpanStatusCode } from '@opentelemetry/api'

if (response.status >= 400) {
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: `HTTP ${response.status}`,
  })
}
```

This makes the native `AppRender.fetch` spans report failures correctly for
any OTel exporter, independent of `@vercel/otel`.
