import { useEffect, useState } from "react"

import ModalShell from "../../../components/ui/modal-shell"

import type { UserProfile } from "../types"
import { getCurrentProfile } from "../../../services/aisenhub/profile"

interface UserCenterModalProps {
  onClose: () => void
  onProfileUpdated: (profile: UserProfile) => void
}
const formatDate = (date: string) =>
  new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(
    new Date(date),
  )

export default function UserCenterModal({
  onClose,
  onProfileUpdated,
}: UserCenterModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    void getCurrentProfile()
      .then((current) => {
        setProfile(current)
        if (current) onProfileUpdated(current)
      })
      .catch((error) =>
        setErrorMessage(
          error instanceof Error ? error.message : "用户资料加载失败。",
        ),
      )
      .finally(() => setIsLoading(false))
  }, [onProfileUpdated])
  const avatarLetter = profile?.displayName.slice(0, 1) || "A"

  return (
    <ModalShell title="用户中心" onClose={onClose}>
      {isLoading ? (
        <div className="py-12 text-center text-sm text-text-muted">
          正在加载用户资料…
        </div>
      ) : profile ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/20 text-xl font-bold text-accent">
              {avatarLetter}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-white">
                {profile.displayName}
              </p>
              <p className="truncate text-xs text-text-muted">
                {profile.email}
              </p>
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between gap-4 py-1">
            <span className="text-sm text-text-muted">用户昵称</span>
            <span className="text-sm font-mono text-white">
              {profile.displayName}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 py-1">
            <span className="text-sm text-text-muted">邮箱</span>
            <span className="text-sm font-mono text-white">
              {profile.email}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 py-1">
            <span className="text-sm text-text-muted">注册时间</span>
            <span className="text-sm font-mono text-white">
              {formatDate(profile.createdAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 py-1">
            <span className="text-sm text-text-muted">专属反馈</span>
            <span className="text-sm font-mono text-white">
              {profile.hasSupporterFeedbackAccess ? "已开放" : "未开放"}
            </span>
          </div>
          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300"
            >
              {errorMessage}
            </p>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-text-muted">
          未找到登录用户资料。
        </div>
      )}
    </ModalShell>
  )
}
