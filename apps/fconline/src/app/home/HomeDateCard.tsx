type HomeDateCardProps = {
  seasonLabel: string
  seasonPeriod: string
}

export default function HomeDateCard({
  seasonLabel,
  seasonPeriod,
}: HomeDateCardProps) {
  return (
    <div className="rounded-lg bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-4 text-lg font-bold tracking-[-0.02em] text-[#111827]">
        <span className="text-[#457ae5]">{seasonLabel}</span>
        <span className="text-right">{seasonPeriod}</span>
      </div>
    </div>
  )
}
