import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type MobileOverlayVariant = "dialog" | "sheet" | "fullscreen";

interface ResponsiveOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  mobileVariant?: MobileOverlayVariant;
  desktopContentClassName?: string;
  mobileContentClassName?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
}

const DEFAULT_DIALOG_CLASSNAME =
  "flex w-full max-h-[90vh] flex-col overflow-x-hidden overflow-y-hidden sm:max-w-lg";

const DEFAULT_SHEET_CLASSNAME =
  "max-h-[92vh] rounded-t-3xl px-0 pb-0 pt-0";

const DEFAULT_FULLSCREEN_CLASSNAME =
  "flex h-[100dvh] w-screen max-w-none translate-x-[-50%] translate-y-[-50%] flex-col gap-0 rounded-none border-0 p-0 sm:rounded-none";

export function ResponsiveOverlay({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  mobileVariant = "sheet",
  desktopContentClassName,
  mobileContentClassName,
  bodyClassName,
  headerClassName,
  footerClassName,
}: ResponsiveOverlayProps) {
  const isMobile = useIsMobile();
  const useSheet = isMobile && mobileVariant === "sheet";
  const useFullscreen = isMobile && mobileVariant === "fullscreen";

  if (useSheet) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
        <SheetContent
          side="bottom"
          className={cn(DEFAULT_SHEET_CLASSNAME, mobileContentClassName)}
        >
          <SheetHeader className={cn("px-4 pt-4 text-left", headerClassName)}>
            <SheetTitle className="pr-8">{title}</SheetTitle>
            {description ? (
              <SheetDescription>{description}</SheetDescription>
            ) : null}
          </SheetHeader>

          <div
            className={cn(
              "modal-body px-4 pb-6 pt-4",
              bodyClassName,
            )}
          >
            {children}
          </div>

          {footer ? (
            <div className={cn("border-t px-4 py-4", footerClassName)}>
              {footer}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className={cn(
          useFullscreen ? DEFAULT_FULLSCREEN_CLASSNAME : DEFAULT_DIALOG_CLASSNAME,
          !useFullscreen && desktopContentClassName,
          useFullscreen && mobileContentClassName,
        )}
      >
        <DialogHeader
          className={cn(
            useFullscreen ? "px-4 py-4 text-left" : "flex-shrink-0",
            headerClassName,
          )}
        >
          <DialogTitle className={cn(useFullscreen && "pr-8")}>
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div
          className={cn(
            useFullscreen
              ? "flex-1 overflow-y-auto overflow-x-hidden"
              : "modal-body",
            useFullscreen ? "px-4 pb-6" : undefined,
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer ? (
          <div
            className={cn(
              useFullscreen ? "border-t px-4 py-4" : "flex-shrink-0",
              footerClassName,
            )}
          >
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
