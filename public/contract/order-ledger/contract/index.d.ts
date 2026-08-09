import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  merchantSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  recordSigningKey(context: __compactRuntime.CircuitContext<PS>,
                   fpr_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  recordOrder(context: __compactRuntime.CircuitContext<PS>,
              orderId_0: Uint8Array,
              itemHash_0: Uint8Array,
              buyer_0: Uint8Array,
              amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  recordSigningKey(context: __compactRuntime.CircuitContext<PS>,
                   fpr_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  recordOrder(context: __compactRuntime.CircuitContext<PS>,
              orderId_0: Uint8Array,
              itemHash_0: Uint8Array,
              buyer_0: Uint8Array,
              amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  recordSigningKey(context: __compactRuntime.CircuitContext<PS>,
                   fpr_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  recordOrder(context: __compactRuntime.CircuitContext<PS>,
              orderId_0: Uint8Array,
              itemHash_0: Uint8Array,
              buyer_0: Uint8Array,
              amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly order_count: bigint;
  readonly last_order_id: Uint8Array;
  readonly last_item_hash: Uint8Array;
  readonly last_buyer: Uint8Array;
  readonly last_amount: bigint;
  readonly signing_key_fpr: Uint8Array;
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
