import { Clapperboard, Download, FileSpreadsheet, FileText, Printer, Table2 } from "lucide-react";
import ModalShell from "../../../components/ui/modal-shell";
import { Button } from "../../../components/ui/button";
import type { ReportExportInput } from "../types";
import type { ExportFormat } from "../types";

interface ReportExportDialogProps {
  input: ReportExportInput;
  isExporting: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
  onOpenVideoExport: () => void;
}

export default function ReportExportDialog({ input, isExporting, onClose, onExport, onOpenVideoExport }: ReportExportDialogProps) {
  const fieldCount = input.fields.filter((field) => !field.isFixed).length;
  return <ModalShell title="导出拉片报告" description="所有内容只在当前浏览器中生成，不会上传视频或分析数据。" onClose={onClose} closeDisabled={isExporting} className="max-w-2xl">
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-bg-deep p-3 text-center text-xs text-text-muted"><div><p className="font-mono text-base text-white">{input.shots.length}</p><p>分镜</p></div><div><p className="font-mono text-base text-white">{input.groups.length}</p><p>分组章节</p></div><div><p className="font-mono text-base text-white">{fieldCount}</p><p>分析维度</p></div></div>
      <Button type="button" variant="outline" onClick={onOpenVideoExport} disabled={isExporting} className="h-auto w-full justify-start border-accent/30 bg-accent/8 p-3 text-left text-accent hover:bg-accent/15"><Clapperboard className="size-5" /><span><span className="block text-sm">导出分析视频</span><span className="mt-1 block editor-meta font-normal text-text-muted">合成画面分析、构图蒙版与项目音频。</span></span></Button>
      <div><p className="mb-2 font-mono text-xs tracking-wider text-text-muted">导出格式</p><div className="grid gap-2 sm:grid-cols-2"><Button type="button" variant="outline" onClick={() => onExport("csv")} disabled={isExporting} className="h-auto justify-start p-4 text-left"><FileSpreadsheet className="size-5 text-emerald-400" /><span><span className="block text-sm text-white">CSV 分镜表</span><span className="mt-1 block text-xs font-normal text-text-muted">轻量表格数据。</span></span></Button><Button type="button" variant="outline" onClick={() => onExport("xlsx")} disabled={isExporting} className="h-auto justify-start p-4 text-left"><Table2 className="size-5 text-emerald-300" /><span><span className="block text-sm text-white">Excel 工作簿</span><span className="mt-1 block text-xs font-normal text-text-muted">含分组页和代表截图。</span></span></Button><Button type="button" variant="outline" onClick={() => onExport("html")} disabled={isExporting} className="h-auto justify-start p-4 text-left"><FileText className="size-5 text-accent" /><span><span className="block text-sm text-white">HTML 阅读报告</span><span className="mt-1 block text-xs font-normal text-text-muted">可浏览或打印。</span></span></Button><Button type="button" variant="outline" onClick={() => onExport("pdf")} disabled={isExporting} className="h-auto justify-start p-4 text-left"><Printer className="size-5 text-violet-300" /><span><span className="block text-sm text-white">PDF 打印版</span><span className="mt-1 block text-xs font-normal text-text-muted">打开系统打印窗口后另存为 PDF。</span></span></Button></div></div>
      {isExporting && <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/8 px-3 py-2 text-xs text-accent"><Download className="size-4 animate-pulse" />正在读取代表截图并生成报告…</div>}
      <p className="text-xs leading-relaxed text-text-muted">Excel 工作簿包含“分镜表”和“分组章节”两张工作表，代表截图会嵌入分镜表。</p>
    </div>
  </ModalShell>;
}
