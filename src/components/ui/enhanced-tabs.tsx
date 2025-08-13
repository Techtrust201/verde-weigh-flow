import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
  onClose?: () => void;
  closeable?: boolean;
}

interface EnhancedTabsProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onNewTab: () => void;
  maxVisibleTabs?: number;
  className?: string;
}

export function EnhancedTabs({
  tabs,
  activeTabId,
  onTabSelect,
  onNewTab,
  maxVisibleTabs = 6,
  className,
}: EnhancedTabsProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const visibleTabs = tabs.slice(0, maxVisibleTabs);
  const hiddenTabs = tabs.slice(maxVisibleTabs);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    checkScroll();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      return () => scrollElement.removeEventListener('scroll', checkScroll);
    }
  }, [tabs]);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className={cn("flex items-center bg-muted rounded-lg h-12", className)}>
      {/* Bouton scroll gauche */}
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollLeft}
          className="h-8 w-8 p-0 shrink-0 mx-1"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Zone de défilement des onglets */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto scroll-smooth scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex space-x-1 px-2 min-w-max"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              className={cn(
                "relative group px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap shrink-0 min-w-0 max-w-40",
                activeTabId === tab.id
                  ? "bg-background shadow-sm text-foreground border border-border"
                  : "hover:bg-background/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="truncate block">
                {tab.label}
              </span>
              {tab.closeable !== false && tabs.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 bg-destructive/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    tab.onClose?.();
                  }}
                >
                  ×
                </Button>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bouton scroll droite */}
      {canScrollRight && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollRight}
          className="h-8 w-8 p-0 shrink-0 mx-1"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Menu déroulant pour onglets cachés */}
      {hiddenTabs.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0 mx-1"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
            {hiddenTabs.map((tab) => (
              <DropdownMenuItem
                key={tab.id}
                onClick={() => onTabSelect(tab.id)}
                className={cn(
                  "flex items-center justify-between",
                  activeTabId === tab.id && "bg-accent"
                )}
              >
                <span className="truncate">{tab.label}</span>
                {tab.closeable !== false && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-2 hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      tab.onClose?.();
                    }}
                  >
                    ×
                  </Button>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Bouton nouveau onglet */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onNewTab}
        className="h-8 w-8 p-0 shrink-0 mx-1 hover:bg-primary/10"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}