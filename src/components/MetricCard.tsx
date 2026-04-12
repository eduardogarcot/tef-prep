interface MetricCardProps {
  label: string
  value: string | number
  subtitle?: string
}

export function MetricCard({ label, value, subtitle }: MetricCardProps) {
  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] border-t-2 border-t-[#2563EB] p-5 flex flex-col gap-1 shadow-sm">
      <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-semibold text-[#0F172A] tabular-nums">
        {value}
        {subtitle && (
          <span className="text-sm font-normal text-[#94A3B8] ml-0.5">{subtitle}</span>
        )}
      </p>
    </div>
  )
}
