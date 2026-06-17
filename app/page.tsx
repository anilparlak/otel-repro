export const dynamic = 'force-dynamic'

// Server-side fetch to a dependency that returns 503.
// Next.js auto-instrumentation creates an `AppRender.fetch` span for this call.
export default async function Page() {
  let status = 'unknown'
  try {
    const res = await fetch('http://localhost:3000/api/fail', {
      cache: 'no-store',
    })
    status = String(res.status)
  } catch {
    status = 'fetch threw'
  }

  return (
    <main style={{ fontFamily: 'monospace', padding: 24 }}>
      <p>Server fetch returned HTTP {status}.</p>
      <p>Look at the server console: the `AppRender.fetch` span has</p>
      <p>status code 0 (UNSET) instead of 2 (ERROR).</p>
    </main>
  )
}
