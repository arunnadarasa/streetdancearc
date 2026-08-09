export async function recordOrderOnUndeployed(): Promise<never> {
  throw new Error("record-order is a local Undeployed route.");
}
