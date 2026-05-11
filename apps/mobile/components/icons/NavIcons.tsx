import Svg, { Path, Circle } from 'react-native-svg'

interface IconProps {
  size?: number
  color?: string
}

export function HomeIcon({ size = 26, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <Path
        d="M29.9 11.9C29.9 11.5 29.6 11.2 29.4 10.9C29.2 10.6 28.8 10.3 28.2 9.7L18.1 1.6C17 0.7 16.5 0.3 15.9 0.2C15.4 0.1 14.8 0.1 14.3 0.2C13.7 0.4 13.2 0.8 12.1 1.6L1.9 9.7C1.2 10.2 0.9 10.5 0.6 10.9C0.4 11.2 0.2 11.5 0.1 11.9C0 12.3 0 12.8 0 13.6V25.1C0 26.8 0 27.7 0.3 28.3C0.6 28.9 1 29.4 1.6 29.6C2.2 29.9 3.1 29.9 4.8 29.9H12V22.9C12 22.3 12.4 21.9 13 21.9H17C17.6 21.9 18 22.3 18 22.9V29.9H25.2C26.9 29.9 27.7 29.9 28.4 29.6C29 29.3 29.4 28.8 29.7 28.3C30 27.6 30 26.8 30 25.1V13.6C30 12.7 30 12.3 29.9 11.9Z"
        fill={color}
      />
    </Svg>
  )
}

export function PlayerIcon({ size = 26, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <Path
        d="M13.7998 1.79961C14.1998 0.699609 15.7998 0.699609 16.0998 1.79961L18.7998 9.89961C18.9998 10.3996 19.3998 10.6996 19.9998 10.6996H28.6998C29.8998 10.6996 30.3998 12.1996 29.3998 12.8996L22.2998 17.8996C21.8998 18.1996 21.6998 18.6996 21.8998 19.1996L24.5998 27.2996C24.9998 28.3996 23.6998 29.2996 22.6998 28.5996L15.5998 23.5996C15.1998 23.2996 14.5998 23.2996 14.1998 23.5996L7.0998 28.5996C6.0998 29.2996 4.7998 28.3996 5.1998 27.2996L7.8998 19.1996C8.0998 18.6996 7.8998 18.1996 7.4998 17.8996L0.499805 12.8996C-0.500195 12.1996 -0.000195384 10.6996 1.1998 10.6996H9.8998C10.3998 10.6996 10.8998 10.3996 11.0998 9.89961L13.7998 1.79961Z"
        fill={color}
      />
    </Svg>
  )
}

export function AnalysisIcon({ size = 26, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <Path
        d="M13.0999 0.6C14.1999 -0.2 15.6999 -0.2 16.7999 0.6L28.5999 9.6C29.5999 10.4 30.0999 11.7 29.6999 13L25.0999 27.8C24.6999 29.1 23.4999 30 22.1999 30H7.79994C6.39994 30 5.29994 29.1 4.89994 27.8L0.19994 13C-0.20006 11.8 0.19994 10.4 1.29994 9.6L13.0999 0.6Z"
        fill={color}
      />
    </Svg>
  )
}

export function CommunityIcon({ size = 26, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <Path
        d="M15 0C6.7 0 0 6.7 0 15V27C0 28.7 1.3 30 3 30H15C23.3 30 30 23.3 30 15C30 6.7 23.3 0 15 0ZM17 19H9C8.4 19 8 18.6 8 18C8 17.4 8.4 17 9 17H17C17.6 17 18 17.4 18 18C18 18.6 17.6 19 17 19ZM21 13H9C8.4 13 8 12.6 8 12C8 11.4 8.4 11 9 11H21C21.6 11 22 11.4 22 12C22 12.6 21.6 13 21 13Z"
        fill={color}
      />
    </Svg>
  )
}

export function MypageIcon({ size = 26, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <Circle cx="5" cy="15" r="3" fill={color} />
      <Circle cx="15" cy="15" r="3" fill={color} />
      <Circle cx="25" cy="15" r="3" fill={color} />
    </Svg>
  )
}
