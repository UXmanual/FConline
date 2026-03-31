export async function GET() {
  const res = await fetch('https://open.api.nexon.com/fconline/v1/metadata/spid', {
    headers: {
      'x-nxopen-api-key': process.env.NEXON_API_KEY!,
    },
  })

  const status = res.status
  const data = await res.json().catch(() => null)

  return Response.json({ status, ok: res.ok, sample: Array.isArray(data) ? data.slice(0, 3) : data })
}
