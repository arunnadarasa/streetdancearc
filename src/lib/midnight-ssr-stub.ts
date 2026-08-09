// Inert stub that replaces every @midnight-ntwrk/* import during the SSR pass.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stub: any = new Proxy(function () {}, {
  get: () => stub,
  apply: () => stub,
  construct: () => stub,
});
export default stub;
export const deployContract = stub;
export const findDeployedContract = stub;
export const setNetworkId = stub;
export const NetworkId = stub;
export const FetchZkConfigProvider = stub;
export const httpClientProofProvider = stub;
export const indexerPublicDataProvider = stub;
export const ttlOneHour = stub;
export const Contract = stub;
export const CompiledContract = stub;
export const MidnightWalletProvider = stub;
export const levelPrivateStateProvider = stub;
export const NodeZkConfigProvider = stub;
