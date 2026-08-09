export type AppendInput = {
  contractAddress: string;
  appTag: string;
  message: string;
  payload?: unknown;
};
export async function appendEntry(_input: AppendInput): Promise<never> {
  throw new Error(
    "append-entry is a local Undeployed route. Run Docker + bun run midnight:deploy, then vite dev.",
  );
}
