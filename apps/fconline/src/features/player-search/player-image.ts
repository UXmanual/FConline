export function getPlayerId(spid: number | string) {
  return Number(spid) % 1000000
}

export function getPlayerImageCandidates(spid: number | string) {
  const playerId = getPlayerId(spid)
  const numericSpid = Number(spid)

  return [
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${numericSpid}.png`,
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${playerId}.png`,
    `https://ssl.nexon.com/s2/game/fc/online/obt/externalAssets/common/playersAction/p${numericSpid}.png`,
    `https://ssl.nexon.com/s2/game/fc/online/obt/externalAssets/common/playersAction/p${playerId}.png`,
    // /playersAction/이 없는 구 시즌은 /players/ 경로가 access 제한 없이 존재함
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${numericSpid}.png`,
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${playerId}.png`,
  ]
}
