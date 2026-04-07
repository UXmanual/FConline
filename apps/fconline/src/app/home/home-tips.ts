export type HomeTipItem = {
  id: string
  label: string
  content: string
}

export const HOME_TIPS: HomeTipItem[] = [
  {
    id: 'tempo-reset',
    label: '운영',
    content: '볼타는 급하게 전진만 하면 끊기는 경우가 많아요. 압박이 붙으면 한 번 뒤로 빼서 템포를 다시 잡는 쪽이 더 안전합니다.',
  },
  {
    id: 'first-touch-angle',
    label: '터치',
    content: '첫 터치를 정면으로 받기보다 빈 공간 쪽으로 살짝 흘리면 바로 다음 패스 각도가 열립니다. 공을 멈추는 것보다 방향을 만드는 터치가 중요해요.',
  },
  {
    id: 'simple-pass-chain',
    label: '패스',
    content: '짧은 패스를 두세 번 이어서 수비를 흔든 뒤 전진 패스를 넣어보세요. 한 번에 찢으려는 패스보다 성공률이 훨씬 좋습니다.',
  },
  {
    id: 'middle-cut',
    label: '수비',
    content: '수비할 때는 공만 따라가기보다 중앙 패스 길을 먼저 막는 습관이 좋아요. 측면으로 돌리게 만드는 것만으로도 위협이 많이 줄어듭니다.',
  },
  {
    id: 'late-sprint',
    label: '움직임',
    content: '항상 전력질주로 움직이면 받기 전에 몸이 무너질 수 있어요. 받을 순간 직전에만 가속하는 편이 터치와 연계가 더 안정적입니다.',
  },
  {
    id: 'triangle-support',
    label: '팀플레이',
    content: '공 주변에 일직선으로 서지 말고 삼각형 각도를 만들어 주세요. 패스 선택지가 두 개만 생겨도 턴오버 빈도가 확 줄어듭니다.',
  },
  {
    id: 'far-post-choice',
    label: '마무리',
    content: '골키퍼와 가까운 쪽으로 억지 슈팅하기보다 반대 포스트를 보는 습관이 좋아요. 한 박자 여유를 만들면 성공률이 눈에 띄게 올라갑니다.',
  },
  {
    id: 'one-touch-restraint',
    label: '패스',
    content: '원터치는 멋있지만 준비되지 않은 상태에선 실수가 큽니다. 등진 상황이나 압박이 강할 때는 한 번 잡고 주는 편이 더 낫습니다.',
  },
  {
    id: 'cover-not-dive',
    label: '수비',
    content: '태클 버튼을 먼저 누르기보다 몸으로 지연시키는 수비를 우선해 보세요. 상대가 실수할 시간을 주는 편이 무리한 태클보다 효율적입니다.',
  },
  {
    id: 'weak-foot-check',
    label: '선수선택',
    content: '볼타에서는 약발 체감이 생각보다 크게 느껴집니다. 마무리나 탈압박 역할을 맡길 선수는 양발 균형도 같이 보는 편이 좋아요.',
  },
  {
    id: 'wall-pass-timing',
    label: '연계',
    content: '투터치 벽패스는 타이밍이 전부예요. 먼저 주고 뛰기보다, 동료가 몸을 연 상태인지 보고 넣는 편이 성공 확률이 높습니다.',
  },
  {
    id: 'switch-side',
    label: '운영',
    content: '한쪽에서 공간이 막히면 같은 라인을 다시 파지 말고 반대쪽으로 크게 전환해 보세요. 수비 진형이 접힌 상태라면 전환 한 번이 가장 강합니다.',
  },
  {
    id: 'back-post-run',
    label: '침투',
    content: '가까운 쪽만 파고들면 수비가 읽기 쉬워져요. 반대편 뒤쪽으로 늦게 들어가는 움직임이 오히려 마무리 찬스를 더 자주 만듭니다.',
  },
  {
    id: 'rating-context',
    label: '분석',
    content: '평점만 높고 결과가 안 나오면 유효 슈팅과 패스 성공 장면을 같이 보세요. 숫자 하나보다 어떤 플레이가 누적됐는지가 더 중요합니다.',
  },
  {
    id: 'short-clearance',
    label: '탈압박',
    content: '위험 지역에서 억지 드리블을 하기보다 가까운 팀원에게 짧게 넘기는 편이 좋습니다. 볼타는 공을 오래 갖는 것보다 잃지 않는 게 더 중요해요.',
  },
  {
    id: 'delay-shot',
    label: '마무리',
    content: '슈팅 각이 애매하면 바로 차지 말고 한 번 접거나 터치로 수비를 눕혀보세요. 짧은 지연만으로도 골키퍼 반응이 크게 갈립니다.',
  },
  {
    id: 'lane-discipline',
    label: '포지션',
    content: '모두가 공 쪽으로 몰리면 쉬운 패스도 막힙니다. 내가 공이 없어도 한 줄은 넓게 유지해 주는 것이 팀 전개를 살립니다.',
  },
  {
    id: 'second-ball-focus',
    label: '반응',
    content: '볼타는 세컨드볼 대처가 자주 승부를 갈라요. 첫 경합이 끝난 뒤 바로 다음 낙하지점을 보는 습관을 들이면 기회가 늘어납니다.',
  },
  {
    id: 'nearby-option',
    label: '팀플레이',
    content: '공 가진 팀원에게 항상 먼 선택지만 주지 말고, 가까운 안전 패스 옵션도 같이 만들어 주세요. 쉬운 연결점 하나가 빌드업 전체를 살립니다.',
  },
  {
    id: 'press-trigger',
    label: '수비',
    content: '압박은 아무 때나 같이 뛰는 것보다 상대가 등졌을 때 맞춰 들어가는 편이 효과적입니다. 트리거를 맞추면 적은 움직임으로도 공을 뺏을 수 있어요.',
  },
  {
    id: 'turn-scan',
    label: '시야',
    content: '받기 전에 한 번만 주변을 보면 턴 방향이 달라집니다. 공 받고 나서 찾기 시작하면 이미 압박이 붙은 경우가 많아요.',
  },
  {
    id: 'through-pass-restraint',
    label: '패스',
    content: '스루패스는 공간이 보일 때만 써도 충분합니다. 애매한 각도에서 반복하면 상대 수비에게 리듬만 넘겨주게 돼요.',
  },
  {
    id: 'body-block-lane',
    label: '수비',
    content: '직선 추격보다 몸 방향으로 길을 막는 수비가 더 강합니다. 공을 빼앗지 못해도 원하는 코스로 보내지 않는 것이 핵심이에요.',
  },
  {
    id: 'quick-recycle',
    label: '운영',
    content: '공격이 막혔다고 느껴지면 억지 돌파 대신 뒤로 돌려 다시 시작해 보세요. 빠른 재순환이 오히려 수비 균형을 더 잘 무너뜨립니다.',
  },
  {
    id: 'safe-center',
    label: '침투',
    content: '중앙 침투는 가장 위협적이지만 가장 위험하기도 해요. 볼을 가진 선수가 여유 없을 때는 먼저 옆으로 벌려서 수비를 흔든 뒤 들어가는 편이 좋습니다.',
  },
  {
    id: 'pass-before-dribble',
    label: '운영',
    content: '드리블이 잘 되는 판이어도 패스로 먼저 상대를 움직인 뒤 들어가세요. 서 있는 수비를 혼자 벗기는 것보다 훨씬 재현성이 높습니다.',
  },
  {
    id: 'stamina-rhythm',
    label: '체력',
    content: '짧은 거리까지 계속 질주하면 후반에 판단이 무너집니다. 필요할 때만 강하게 뛰고, 나머지는 위치 선정으로 해결하는 리듬이 중요해요.',
  },
  {
    id: 'give-and-move',
    label: '연계',
    content: '패스 후 멈추지 말고 한 칸 더 움직여 보세요. 다시 받을 길이 생기면 공격이 훨씬 부드러워집니다.',
  },
  {
    id: 'loss-review',
    label: '분석',
    content: '최근 5경기에서 패가 많다면 패스 성공률보다 실점 장면 시작 위치를 먼저 보세요. 같은 구역에서 자꾸 잃는 패턴이 있으면 개선이 빨라집니다.',
  },
  {
    id: 'communication-role',
    label: '팀플레이',
    content: '팀플레이에선 누가 마무리하고 누가 연결할지 감각적으로라도 나누는 편이 좋습니다. 역할이 겹치면 좋은 장면도 서로 먹히기 쉬워요.',
  },
]

function getKoreaDayKey() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'

  return Number(`${year}${month}${day}`)
}

export function getTodayTips(count = 4) {
  if (HOME_TIPS.length === 0 || count <= 0) {
    return []
  }

  const dayKey = getKoreaDayKey()
  const startIndex = dayKey % HOME_TIPS.length

  return Array.from({ length: Math.min(count, HOME_TIPS.length) }, (_, index) => {
    return HOME_TIPS[(startIndex + index) % HOME_TIPS.length]
  })
}
