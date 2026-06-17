# Repro: `AppRender.fetch` spans don't set ERROR status on failed responses

Minimal Next.js App Router app that demonstrates how server-side `fetch`
spans report failed backend dependencies (4xx/5xx) without an OTel error
status, which makes APM backends (Azure Application Insights, Datadog,
Honeycomb, …) treat them as successful dependencies.

No APM backend is required: a `ConsoleSpanExporter` prints each span's
`status` to stdout, so the bug is visible directly in the dev server logs.

## Run

```bash
npm install
npm run dev
# in another shell:
curl http://localhost:3000/
# then read the dev-server console for the `fetch ...` span
```

`app/api/fail/route.ts` returns the failing status (503 by default; change
to 404 to test 4xx). `app/page.tsx` is a server component that fetches it.

## Two instrumentation paths

Swap `instrumentation.ts` between the two variants in this folder:

- `instrumentation.native.ts` — raw OTel SDK, **no `@vercel/otel`**. The
  `fetch` spans are created by Next core (`patch-fetch.ts`) and carry
  `next.span_type: AppRender.fetch`. This mirrors a setup where Azure
  Monitor / a manual OTel SDK consumes Next's native spans.
- `instrumentation.vercel.ts` — registers `@vercel/otel`.

## Observed span status (Next 16 canary, `@opentelemetry/sdk-trace-node` 1.x)

| Path                       | Response | `span.status.code` | Result        |
|----------------------------|----------|--------------------|---------------|
| native (`patch-fetch.ts`)  | 503      | 0 (UNSET)          | not an error  |
| native (`patch-fetch.ts`)  | 404      | 0 (UNSET)          | not an error  |
| `@vercel/otel`             | 503      | 2 (ERROR)          | error ✓       |
| `@vercel/otel`             | 404      | 0 (UNSET)          | not an error  |

Key points:

1. **Next core `patch-fetch.ts` never calls `span.setStatus(...)`.** It only
   reads the response status for dev logging. So on the native path neither
   4xx nor 5xx is marked as an error.
2. **`@vercel/otel` sets ERROR only for `status >= 500`,** not for 4xx. So
   4xx failures are silently "successful" on every path tested.

## Native-path span (503), abbreviated console output

```
name: 'fetch GET http://localhost:3000/api/fail',
attributes: {
  'next.span_name': 'fetch GET http://localhost:3000/api/fail',
  'next.span_type': 'AppRender.fetch',
  'http.url': 'http://localhost:3000/api/fail',
  'http.method': 'GET',
  ...
},
status: { code: 0 },   // UNSET, despite HTTP 503
```
