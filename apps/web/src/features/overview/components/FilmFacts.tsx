import type { FilmOverviewFacts } from "../services/deriveFilmOverview"

interface FilmFactsProps { facts: FilmOverviewFacts; frameRate: number | null }

const formatSeconds = (value: number | null) => value === null ? "不可用" : `${value.toFixed(2)} s`

export default function FilmFacts({ facts, frameRate }: FilmFactsProps) {
  const items = [["正式镜头", `${facts.shotCount}`], ["人工结构", `${facts.groupCount}`], ["标记", `${facts.markerCount}`], ["全片时长", formatSeconds(facts.totalDurationSeconds)], ["平均镜头", formatSeconds(facts.averageShotSeconds)], ["中位镜头", formatSeconds(facts.medianShotSeconds)], ["最短 / 最长", `${formatSeconds(facts.shortestShotSeconds)} / ${formatSeconds(facts.longestShotSeconds)}`], ["切点密度", facts.cutsPerMinute === null ? "fps 未知" : `${facts.cutsPerMinute.toFixed(2)} cuts/min`]]
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-4 sm:grid-cols-4">{items.map(([label, value]) => <div key={label}><dt className="text-[11px] text-text-muted">{label}</dt><dd className="mt-1 font-mono text-sm text-text-base">{value}</dd></div>)}<div className="col-span-full grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-4">{facts.densityWindows.slice(0, 4).map((window) => <div key={window.startSeconds} className="bg-bg-panel px-2 py-1.5"><dt className="text-[10px] text-text-muted">{window.startSeconds.toFixed(0)}–{(window.startSeconds + window.durationSeconds).toFixed(0)} s</dt><dd className="mt-0.5 font-mono text-xs text-text-base">{window.cutCount} cuts · {window.cutsPerMinute === null ? "不可用" : `${window.cutsPerMinute.toFixed(1)}/min`}</dd></div>)}</div><p className="col-span-full text-[11px] leading-5 text-text-muted">时长基于正式镜头区间与实际媒体时间；全片切点密度按有效覆盖时间计算，局部密度按真实 {facts.cutsWindowSeconds} 秒分箱。{frameRate ? `当前 ${frameRate} fps。` : "当前未读取到可靠 fps，优先使用镜头自身时间。"}</p></dl>
}
