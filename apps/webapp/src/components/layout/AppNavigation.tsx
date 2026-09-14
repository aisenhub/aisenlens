import BrandLogo from "../branding/BrandLogo";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { NAVIGATION_ITEMS } from "../../constants/navigation";
import { webHomeUrl } from "../../config/urls";
import type { ThemePreference } from "../../types/theme";
import { Monitor, Moon, Settings, Sun } from "lucide-react";

interface AppNavigationProps {
  activePage: number;
  onNavigate: (page: number) => void;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onOpenLiteSettings: () => void;
}

export default function AppNavigation({
  activePage,
  onNavigate,
  theme,
  onThemeChange,
  onOpenLiteSettings,
}: AppNavigationProps) {
  const nextThemeLabel = theme === "dark" ? "切换到浅色主题" : "切换到深色主题";
  const handleNavigation = (item: (typeof NAVIGATION_ITEMS)[number]) => {
    if (item.href) {
      window.location.assign(webHomeUrl(item.href));
      return;
    }

    onNavigate(item.id);
  };

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 flex h-14 items-center border-b border-border bg-bg-nav/90 px-4 backdrop-blur-xl sm:px-6">
        <Button type="button" variant="ghost" onClick={() => window.location.assign(webHomeUrl())} className="group mr-4 h-auto shrink-0 rounded-lg px-0 py-0 hover:bg-transparent sm:mr-10">
          <BrandLogo className="h-[30px] w-9" />
          <span className="hidden flex-col text-left leading-none sm:flex">
            <span className="font-display text-base font-black tracking-wide text-white transition-colors group-hover:text-accent">艾申拉片</span>
            <span className="mt-0.5 font-mono text-[10px] tracking-widest text-text-muted">AisenLens</span>
          </span>
        </Button>

        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="主导航">
          {NAVIGATION_ITEMS.map((item) => (
            <Button key={item.id} type="button" variant="ghost" size="sm" onClick={() => handleNavigation(item)} className={activePage === item.id ? "bg-white/6 text-white hover:bg-white/8 hover:text-white" : "text-text-dim hover:bg-white/4 hover:text-white"}>
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" aria-label={nextThemeLabel} className="text-text-muted hover:bg-white/6 hover:text-white" />} onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun /> : theme === "light" ? <Moon /> : <Monitor />}
            </TooltipTrigger>
            <TooltipContent>{nextThemeLabel}</TooltipContent>
          </Tooltip>

          {activePage === 2 && (
            <Tooltip>
              <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="项目库设置" className="text-text-muted hover:bg-white/6 hover:text-white" />} onClick={onOpenLiteSettings}>
                <Settings />
              </TooltipTrigger>
              <TooltipContent>项目库设置</TooltipContent>
            </Tooltip>
          )}

        </div>
      </header>

      <nav className="fixed bottom-0 inset-x-0 z-40 flex border-t border-border bg-bg-nav/95 backdrop-blur-xl md:hidden" aria-label="移动端导航">
        {NAVIGATION_ITEMS.map((item) => (
          <Button key={item.id} type="button" variant="ghost" size="sm" onClick={() => handleNavigation(item)} className={`h-auto flex-1 rounded-none py-3 text-xs ${activePage === item.id ? "text-accent hover:text-accent" : "text-text-muted hover:text-text-dim"}`}>
            {item.label}
          </Button>
        ))}
      </nav>
    </>
  );
}
