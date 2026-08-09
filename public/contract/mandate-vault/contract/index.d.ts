import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  buyerSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  anchorMandate(context: __compactRuntime.CircuitContext<PS>,
                mandateHash_0: Uint8Array,
                buyer_0: Uint8Array,
                seller_0: Uint8Array,
                amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  anchorMandate(context: __compactRuntime.CircuitContext<PS>,
                mandateHash_0: Uint8Array,
                buyer_0: Uint8Array,
                seller_0: Uint8Array,
                amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  anchorMandate(context: __compactRuntime.CircuitContext<PS>,
                mandateHash_0: Uint8Array,
                buyer_0: Uint8Array,
                seller_0: Uint8Array,
                amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly anchored_count: bigint;
  readonly last_mandate_hash: Uint8Array;
  readonly last_buyer: Uint8Array;
  readonly last_seller: Uint8Array;
  readonly last_amount: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
