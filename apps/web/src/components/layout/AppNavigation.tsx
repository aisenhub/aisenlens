import { useState } from "react";
import BrandLogo from "../branding/BrandLogo";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { NAVIGATION_ITEMS } from "../../constants/navigation";
import type { AppTheme } from "../../types/theme";
import { Heart, Moon, Settings, Sun, UserRound } from "lucide-react";

interface AppNavigationProps {
  activePage: number;
  isLoggedIn: boolean;
  userName?: string;
  userEmail?: string;
  onNavigate: (page: number) => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  onOpenAuth: () => void;
  onOpenLiteSettings: () => void;
  onOpenUserCenter: () => void;
  onSignOut: () => void;
}

export default function AppNavigation({
  activePage,
  isLoggedIn,
  userName,
  userEmail,
  onNavigate,
  theme,
  onThemeChange,
  onOpenAuth,
  onOpenLiteSettings,
  onOpenUserCenter,
  onSignOut,
}: AppNavigationProps) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const avatarLetter = userName?.slice(0, 1) || "A";
  const nextThemeLabel = theme === "dark" ? "切换到浅色主题" : "切换到深色主题";

  const openUserCenter = () => {
    setIsAccountMenuOpen(false);
    onOpenUserCenter();
  };

  const signOut = () => {
    setIsAccountMenuOpen(false);
    onSignOut();
  };

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 flex h-14 items-center border-b border-border bg-bg-nav/90 px-4 backdrop-blur-xl sm:px-6">
        <Button type="button" variant="ghost" onClick={() => onNavigate(1)} className="group mr-4 h-auto shrink-0 rounded-lg px-0 py-0 hover:bg-transparent sm:mr-10">
          <BrandLogo className="h-[30px] w-9" />
          <span className="hidden flex-col text-left leading-none sm:flex">
            <span className="font-display text-base font-black tracking-wide text-white transition-colors group-hover:text-accent">艾申拉片</span>
            <span className="mt-0.5 font-mono text-[10px] tracking-widest text-text-muted">AisenLens</span>
          </span>
        </Button>

        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="主导航">
          {NAVIGATION_ITEMS.map((item) => (
            <Button key={item.id} type="button" variant="ghost" size="sm" onClick={() => onNavigate(item.id)} className={activePage === item.id ? "bg-white/6 text-white hover:bg-white/8 hover:text-white" : "text-text-dim hover:bg-white/4 hover:text-white"}>
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" aria-label={nextThemeLabel} className="text-text-muted hover:bg-white/6 hover:text-white" />} onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun /> : <Moon />}
            </TooltipTrigger>
            <TooltipContent>{nextThemeLabel}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="支持 AisenLens" className={`hover:bg-red-500/10 ${activePage === 5 ? "text-red-500" : "text-red-400"}`} />} onClick={() => onNavigate(5)}>
              <Heart className="fill-red-500 text-red-500" />
            </TooltipTrigger>
            <TooltipContent>支持 AisenLens</TooltipContent>
          </Tooltip>

          {activePage === 2 && (
            <Tooltip>
              <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="项目库设置" className="text-text-muted hover:bg-white/6 hover:text-white" />} onClick={onOpenLiteSettings}>
                <Settings />
              </TooltipTrigger>
              <TooltipContent>项目库设置</TooltipContent>
            </Tooltip>
          )}

          {!isLoggedIn ? (
            <Button type="button" variant="outline" size="sm" onClick={onOpenAuth} className="border-border text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white">
              登录 / 注册
            </Button>
          ) : (
            <div className="relative">
              <Button type="button" variant="ghost" size="icon" aria-expanded={isAccountMenuOpen} aria-haspopup="menu" aria-label="打开用户菜单" onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)} className="rounded-full border border-border-mid bg-accent/20 text-accent hover:border-accent/40 hover:bg-accent/25 hover:text-accent">
                {avatarLetter}
              </Button>
              {isAccountMenuOpen && (
                <>
                  <button type="button" aria-label="关闭用户菜单" className="fixed inset-0 z-40 cursor-default" onClick={() => setIsAccountMenuOpen(false)} />
                  <div role="menu" className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl">
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-sm font-medium text-white">{userName || "AisenLens 用户"}</p>
                      {userEmail && <p className="mt-0.5 font-mono text-xs text-text-muted">{userEmail}</p>}
                    </div>
                    <div className="p-1">
                      <Button type="button" variant="ghost" size="sm" role="menuitem" onClick={openUserCenter} className="h-9 w-full justify-start px-3 text-text-dim hover:bg-white/5 hover:text-white">
                        <UserRound />
                        用户中心
                      </Button>
                      <div className="mt-1 border-t border-border pt-1">
                        <Button type="button" variant="ghost" size="sm" role="menuitem" onClick={signOut} className="h-9 w-full justify-start px-3 text-red-400/80 hover:bg-red-500/5 hover:text-red-400">
                          退出登录
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <nav className="fixed bottom-0 inset-x-0 z-40 flex border-t border-border bg-bg-nav/95 backdrop-blur-xl md:hidden" aria-label="移动端导航">
        {NAVIGATION_ITEMS.map((item) => (
          <Button key={item.id} type="button" variant="ghost" size="sm" onClick={() => onNavigate(item.id)} className={`h-auto flex-1 rounded-none py-3 text-xs ${activePage === item.id ? "text-accent hover:text-accent" : "text-text-muted hover:text-text-dim"}`}>
            {item.label}
          </Button>
        ))}
      </nav>
    </>
  );
}
