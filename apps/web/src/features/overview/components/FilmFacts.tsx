import type { FilmOverviewFacts } from "../services/deriveFilmOverview"

interface FilmFactsProps { facts: FilmOverviewFacts; frameRate: number | null }

const formatSeconds = (value: number | null) => value === null ? "不可用" : `${value.toFixed(2)} s`

export default function FilmFacts({ facts, frameRate }: FilmFactsProps) {
  const items = [["正式镜头", `${facts.shotCount}`], ["人工结构", `${facts.groupCount}`], ["标记", `${facts.markerCount}`], ["全片时长", formatSeconds(facts.totalDurationSeconds)], ["平均镜头", formatSeconds(facts.averageShotSeconds)], ["中位镜头", formatSeconds(facts.medianShotSeconds)], ["最短 / 最长", `${formatSeconds(facts.shortestShotSeconds)} / ${formatSeconds(facts.longestShotSeconds)}`], ["切点密度", facts.cutsPerMinute === null ? "fps 未知" : `${facts.cutsPerMinute.toFixed(2)} cuts/min`]]
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-4 sm:grid-cols-4">{items.map(([label, value]) => <div key={label}><dt className="text-[11px] text-text-muted">{label}</dt><dd className="mt-1 font-mono text-sm text-text-base">{value}</dd></div>)}<p className="col-span-full text-[11px] leading-5 text-text-muted">时长基于正式镜头区间与实际 fps；切点密度以正式镜头起点计算，统计窗口为 {facts.cutsWindowSeconds} 秒。{frameRate ? `当前 ${frameRate} fps。` : "当前未读取到可靠 fps，因此不生成假时间指标。"}</p></dl>
}
