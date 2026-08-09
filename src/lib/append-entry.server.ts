import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { PRIVATE_STATE_ID, PRIMARY_CONTRACT } from "./midnight-shared";
import {
  buildCompiledContract,
  buildUndeployedProviders,
  initialPrivateStateFor,
} from "./midnight-providers.server";
import { deployerSecretBytes } from "./midnight-shared";

const STATE_ID = `${PRIVATE_STATE_ID}-${PRIMARY_CONTRACT}`;

export type AppendInput = {
  contractAddress: string;
  appTag: string;
  message: string;
  payload?: unknown;
};

type Ctx = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  midnightWallet: { stop: () => Promise<void> };
};

let ctxPromise: Promise<Ctx> | null = null;
let cachedAddress: string | null = null;

async function getCtx(contractAddress: string): Promise<Ctx> {
  if (ctxPromise && cachedAddress === contractAddress) return ctxPromise;
  cachedAddress = contractAddress;
  ctxPromise = (async () => {
    const { providers, midnightWallet } = await buildUndeployedProviders({
      contractName: PRIMARY_CONTRACT,
    });
    await providers.privateStateProvider.setContractAddress(contractAddress);
    return { providers, midnightWallet };
  })();
  return ctxPromise;
}

export async function appendEntry(input: AppendInput): Promise<{
  txId: string;
  blockHeight?: number;
  simulated?: boolean;
}> {
  const ctx = await getCtx(input.contractAddress);
  const secret = deployerSecretBytes();
  const compiledContract = await buildCompiledContract({
    contractName: PRIMARY_CONTRACT,
  });

  let found;
  try {
    found = await findDeployedContract(ctx.providers, {
      compiledContract,
      contractAddress: input.contractAddress,
      privateStateId: STATE_ID,
      initialPrivateState: initialPrivateStateFor(PRIMARY_CONTRACT, secret),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/private state|IncompleteFind|not found|missing/i.test(msg)) throw e;
    found = await findDeployedContract(ctx.providers, {
      compiledContract: await buildCompiledContract({
        contractName: PRIMARY_CONTRACT,
        secretForDeploy: secret,
      }),
      contractAddress: input.contractAddress,
      privateStateId: STATE_ID,
      initialPrivateState: initialPrivateStateFor(PRIMARY_CONTRACT, secret),
    });
  }

  const result = await found.callTx.appendEntry(input.message);
  const publicData = result.public as {
    txId?: string;
    txHash?: string;
    blockHeight?: number;
  };
  const txId = publicData.txId ?? publicData.txHash;
  if (!txId) {
    throw new Error("appendEntry succeeded but no txId/txHash in public result");
  }
  return { txId, blockHeight: publicData.blockHeight };
}
