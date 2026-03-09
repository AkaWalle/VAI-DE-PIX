import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveOverlay,
  type MobileOverlayVariant,
} from "@/components/ui/responsive-overlay";

interface FormDialogProps {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void | Promise<void>;
  isLoading?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  submitLabel?: string;
  cancelLabel?: string;
  showFooter?: boolean;
  contentClassName?: string;
  mobileContentClassName?: string;
  mobileVariant?: MobileOverlayVariant;
}

export function FormDialog({
  trigger,
  title,
  description,
  children,
  onSubmit,
  isLoading = false,
  open,
  onOpenChange,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  showFooter = true,
  contentClassName,
  mobileContentClassName,
  mobileVariant = "sheet",
}: FormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const formId = useId();

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      await onSubmit(e);
    }
  };

  return (
    <ResponsiveOverlay
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={trigger}
      title={title}
      description={description}
      mobileVariant={mobileVariant}
      desktopContentClassName={cn(
        "flex w-full max-h-[90vh] flex-col overflow-x-hidden overflow-y-hidden sm:max-w-lg",
        contentClassName,
      )}
      mobileContentClassName={mobileContentClassName}
      bodyClassName="px-4 pb-6 space-y-4"
      footer={
        showFooter ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="min-h-[44px] w-full sm:w-auto"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={isLoading}
              aria-label={`${submitLabel} - ${title.toLowerCase()}`}
              className="min-h-[44px] w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        ) : null
      }
    >
      <form
        id={formId}
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-col space-y-4"
      >
        {children}
      </form>
    </ResponsiveOverlay>
  );
}
