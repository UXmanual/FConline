import { useState } from 'react'
import { Image, View } from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

function getPlayerImageCandidates(spid: number | string) {
  const numericSpid = Number(spid)
  const playerId = numericSpid % 1000000
  return [
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${numericSpid}.png`,
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${playerId}.png`,
    `https://ssl.nexon.com/s2/game/fc/online/obt/externalAssets/common/playersAction/p${numericSpid}.png`,
    `https://ssl.nexon.com/s2/game/fc/online/obt/externalAssets/common/playersAction/p${playerId}.png`,
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${numericSpid}.png`,
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${playerId}.png`,
  ]
}

function PlayerFallback({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" fill="none">
      <Rect width="240" height="240" rx="24" fill="#F4F5F6" />
      <Circle cx="120" cy="82" r="34" fill="#CBD2D9" />
      <Path d="M58 194C58 159.758 85.758 132 120 132C154.242 132 182 159.758 182 194V200H58V194Z" fill="#CBD2D9" />
    </Svg>
  )
}

type Props = {
  spid: number | string
  size: number
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center'
  style?: object
}

export function PlayerImage({ spid, size, resizeMode = 'contain', style }: Props) {
  const candidates = getPlayerImageCandidates(spid)
  const [index, setIndex] = useState(0)

  if (index >= candidates.length) {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <PlayerFallback size={size} />
      </View>
    )
  }

  return (
    <Image
      source={{ uri: candidates[index] }}
      style={[{ width: size, height: size }, style]}
      resizeMode={resizeMode}
      onError={() => setIndex((i) => i + 1)}
    />
  )
}
