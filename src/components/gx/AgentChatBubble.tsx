import { Bot, User } from "lucide-react";

export type ChatTurn = {
  role: "buyer" | "seller";
  message: string;
  quote?: { sku: string; title: string; quantity: number; unitPriceUsdc: number; totalUsdc: number } | null;
  action?: "offer" | "counter" | "accept" | "reject";
};

export function AgentChatBubble({ turn }: { turn: ChatTurn }) {
  const isSeller = turn.role === "seller";
  return (
    <div className={`flex gap-3 ${isSeller ? "" : "flex-row-reverse"}`}>
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          isSeller ? "bg-primary text-primary-foreground" : "bg-glow text-glow-foreground"
        }`}
      >
        {isSeller ? <Bot size={16} /> : <User size={16} />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed ${
          isSeller
            ? "rounded-tl-none bg-card/80 text-foreground"
            : "rounded-tr-none bg-primary/15 text-foreground"
        }`}
      >
        <p className="font-medium">{turn.message}</p>
        {turn.quote && (
          <div className="mt-2 rounded-xl border border-border/60 bg-background/60 p-2 text-xs">
            <p className="font-bold text-glow">{turn.quote.title}</p>
            <p className="text-muted-foreground">
              {turn.quote.quantity} × {turn.quote.unitPriceUsdc.toFixed(6)} USDC ={" "}
              <span className="font-bold text-foreground">{turn.quote.totalUsdc.toFixed(6)} USDC</span>
            </p>
            {turn.action && (
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  turn.action === "accept"
                    ? "bg-green-500/15 text-green-400"
                    : turn.action === "reject"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-amber-500/15 text-amber-400"
                }`}
              >
                {turn.action}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
