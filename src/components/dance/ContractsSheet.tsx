import { useEffect, useState } from "react";
import { FileCode2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ContractsPanel } from "@/components/dance/ContractsPanel";

const OPEN_EVENT = "streetrail:open-contracts";

/** Lets any part of the app (e.g. the footer link) open the contracts drawer. */
export function openContractsDrawer() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_EVENT));
}

export function ContractsSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="View deployed contracts"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <FileCode2 className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Contracts</span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-[min(26rem,calc(100vw-2rem))] flex-col border-border bg-card p-0"
      >
        <SheetHeader className="shrink-0 border-b border-border p-4 text-left">
          <SheetTitle className="display text-left text-sm">Deployed contracts</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Four Compact contracts on Midnight Local Undeployed. Verify via the local indexer.
          </p>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ContractsPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}
