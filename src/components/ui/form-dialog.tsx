import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
}

export function FormDialog({
  trigger, title, description, children, onSubmit,
  isLoading = false, open, onOpenChange,
  submitLabel = "Salvar", cancelLabel = "Cancelar", showFooter = true,
}: FormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) await onSubmit(e);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">{children}</div>

          {showFooter && (
            <div className="flex gap-2 justify-end border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary hover:bg-[#075e54] text-white rounded-[8px] px-6"
                aria-label={`${submitLabel} - ${title.toLowerCase()}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : submitLabel}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
