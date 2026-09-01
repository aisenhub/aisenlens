import { useState } from "react"
import { MessageSquarePlus } from "lucide-react"
import { toast } from "sonner"
import PageIntro from "../../../components/layout/PageIntro"
import { Button } from "../../../components/ui/button"
import SurfaceCard from "../../../components/ui/surface-card"
import { canAccessSupporterFeedback } from "../../../services/aisenhub/feedback"
import RedemptionCodeCard from "./RedemptionCodeCard"
import SupporterFeedbackAccessDialog from "./SupporterFeedbackAccessDialog"
import SupporterFeedbackDialog from "./SupporterFeedbackDialog"

interface SupportContentProps {
  isLoggedIn: boolean
  onRequireAuth: () => void
  onNavigate: (page: number) => void
}

export default function SupportContent({
  isLoggedIn,
  onRequireAuth,
  onNavigate,
}: SupportContentProps) {
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false)
  const [isFeedbackAccessDeniedOpen, setIsFeedbackAccessDeniedOpen] =
    useState(false)
  const [isCheckingFeedbackAccess, setIsCheckingFeedbackAccess] =
    useState(false)

  const openSupporterFeedback = async () => {
    if (!isLoggedIn) {
      onRequireAuth()
      return
    }
    setIsCheckingFeedbackAccess(true)
    try {
      if (await canAccessSupporterFeedback()) setIsFeedbackDialogOpen(true)
      else setIsFeedbackAccessDeniedOpen(true)
    } catch {
      toast.error("暂时无法验证平台权益，请稍后重试。")
    } finally {
      setIsCheckingFeedbackAccess(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-12 sm:py-16">
      <PageIntro
        className="mx-auto mb-10 max-w-3xl"
        align="center"
        eyebrow="SUPPORT"
        title="支持 AisenLens"
        description="支持权益由 AisenHub 平台统一管理，兑换和访问状态会立即同步到所有产品。"
      />

      <SurfaceCard className="mb-6 flex flex-col justify-between border-accent/20 bg-accent/[0.04] p-6 sm:flex-row sm:items-end sm:gap-8">
        <div>
          <p className="font-mono text-xs tracking-widest text-accent">
            CO-CREATION
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold text-white">
            支持者共创通道
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
            支持者权益只通过平台 feature code
            授权，不再使用产品本地角色。提交专属反馈前，AisenLens
            会向平台实时确认访问权限。
          </p>
        </div>
        <Button
          type="button"
          disabled={isCheckingFeedbackAccess}
          onClick={() => void openSupporterFeedback()}
          className="mt-7 h-11 w-full shrink-0 rounded-xl bg-accent font-semibold text-white hover:bg-accent/90 sm:mt-0 sm:w-auto"
        >
          <MessageSquarePlus className="size-4" />
          {isCheckingFeedbackAccess ? "正在验证权限…" : "提交专属反馈"}
        </Button>
      </SurfaceCard>

      <SurfaceCard className="mb-10 border-accent/20 bg-accent/[0.04] p-6 sm:p-8">
        <p className="font-mono text-xs tracking-widest text-accent">
          PLATFORM CATALOG
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-white">
          支持产品即将上线
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          正式商品上线后会在 Account
          中展示。当前可使用下方兑换码领取平台授予的权益。
        </p>
      </SurfaceCard>

      <RedemptionCodeCard
        isLoggedIn={isLoggedIn}
        onRequireAuth={onRequireAuth}
      />

      <div className="border-t border-border py-10 text-center">
        <p className="mb-3 font-mono text-xs text-text-muted">Made with ♥ by</p>
        <p className="mb-2 font-display text-2xl font-black text-white">
          AisenLens
        </p>
      </div>

      <SupporterFeedbackDialog
        open={isFeedbackDialogOpen}
        onOpenChange={setIsFeedbackDialogOpen}
        isLoggedIn={isLoggedIn}
        onRequireAuth={onRequireAuth}
      />
      <SupporterFeedbackAccessDialog
        open={isFeedbackAccessDeniedOpen}
        onOpenChange={setIsFeedbackAccessDeniedOpen}
        onNavigateToFeedback={() => {
          setIsFeedbackAccessDeniedOpen(false)
          onNavigate(6)
        }}
      />
    </div>
  )
}
