import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
export interface Tab {
  id: string;
  label: string;
  onClose?: () => void;
  closeable?: boolean;
  isEditing?: boolean;
}
interface EnhancedTabsProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  className?: string;
  onOverflowChange?: (isOverflowing: boolean) => void;
}
export function EnhancedTabs({
  tabs,
  activeTabId,
  onTabSelect,
  className,
  onOverflowChange,
}: EnhancedTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isOverflowing = useMemo(
    () => canScrollLeft || canScrollRight,
    [canScrollLeft, canScrollRight]
  );
  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };
    const element = scrollRef.current;
    if (!element) return;
    checkScroll();
    element.addEventListener("scroll", checkScroll);
    return () => element.removeEventListener("scroll", checkScroll);
  }, [tabs]);

  useEffect(() => {
    onOverflowChange?.(isOverflowing);
  }, [isOverflowing, onOverflowChange]);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: -200,
        behavior: "smooth",
      });
    }
  };
  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: 200,
        behavior: "smooth",
      });
    }
  };
  return (
    <div
      className={cn(
        "flex items-center bg-muted rounded-lg h-12 relative",
        className
      )}
    >
      {/* Bouton scroll gauche */}
      <Button
        variant="ghost"
        size="sm"
        onClick={scrollLeft}
        className={cn(
          "h-8 w-8 p-0 shrink-0 mx-1 transition-opacity",
          canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Zone de défilement des onglets */}
      <div className="flex-1 relative mx-1">
        {isOverflowing && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-muted to-transparent z-[1]" />
        )}
        <div
          ref={scrollRef}
          className="overflow-x-auto scroll-smooth scrollbar-hide relative z-[2]"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <div className="flex space-x-1 px-2 min-w-max">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => onTabSelect(tab.id)}
                className={cn(
                  "relative group px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap shrink-0 min-w-0 max-w-40 cursor-pointer",
                  activeTabId === tab.id
                    ? tab.isEditing
                      ? "bg-orange-500 shadow-sm text-white border border-orange-600"
                      : "bg-background shadow-sm text-foreground border border-border"
                    : tab.isEditing
                    ? "bg-orange-100 hover:bg-orange-200 text-orange-900 border border-orange-300"
                    : "hover:bg-background/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="truncate block mx-[10px]">{tab.label}</span>
                {tab.closeable !== false && tabs.length > 1 && (
                  <button
                    type="button"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 bg-destructive/5 rounded-full flex items-center justify-center text-xs font-bold transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      tab.onClose?.();
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        {isOverflowing && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-muted to-transparent z-[1]" />
        )}
      </div>

      {/* Bouton scroll droite */}
      <Button
        variant="ghost"
        size="sm"
        onClick={scrollRight}
        className={cn(
          "h-8 w-8 p-0 shrink-0 mx-1 transition-opacity",
          canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
