export async function GET() {
  const headers = {
    'x-nxopen-api-key': process.env.NEXON_API_KEY!,
  }

  // 선수 메타데이터 (전체 목록)
  const spidRes = await fetch('https://open.api.nexon.com/static/fconline/meta/spid.json', { headers })
  const spidData = await spidRes.json().catch(() => null)

  return Response.json({
    status: spidRes.status,
    ok: spidRes.ok,
    sample: Array.isArray(spidData) ? spidData.slice(0, 3) : spidData,
  })
}
