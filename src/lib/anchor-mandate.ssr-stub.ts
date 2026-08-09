export async function anchorMandateOnUndeployed(): Promise<never> {
  throw new Error("anchor-mandate is a local Undeployed route.");
}
