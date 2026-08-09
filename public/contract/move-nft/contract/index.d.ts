import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  mint(context: __compactRuntime.CircuitContext<PS>,
       to_0: Uint8Array,
       uri_0: string): __compactRuntime.CircuitResults<PS, []>;
  transfer(context: __compactRuntime.CircuitContext<PS>,
           tokenId_0: bigint,
           seller_0: Uint8Array,
           buyer_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  list(context: __compactRuntime.CircuitContext<PS>,
       tokenId_0: bigint,
       seller_0: Uint8Array,
       price_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  cancel(context: __compactRuntime.CircuitContext<PS>,
         tokenId_0: bigint,
         seller_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  buy(context: __compactRuntime.CircuitContext<PS>,
      tokenId_0: bigint,
      buyer_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  mint(context: __compactRuntime.CircuitContext<PS>,
       to_0: Uint8Array,
       uri_0: string): __compactRuntime.CircuitResults<PS, []>;
  transfer(context: __compactRuntime.CircuitContext<PS>,
           tokenId_0: bigint,
           seller_0: Uint8Array,
           buyer_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  list(context: __compactRuntime.CircuitContext<PS>,
       tokenId_0: bigint,
       seller_0: Uint8Array,
       price_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  cancel(context: __compactRuntime.CircuitContext<PS>,
         tokenId_0: bigint,
         seller_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  buy(context: __compactRuntime.CircuitContext<PS>,
      tokenId_0: bigint,
      buyer_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  mint(context: __compactRuntime.CircuitContext<PS>,
       to_0: Uint8Array,
       uri_0: string): __compactRuntime.CircuitResults<PS, []>;
  transfer(context: __compactRuntime.CircuitContext<PS>,
           tokenId_0: bigint,
           seller_0: Uint8Array,
           buyer_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  list(context: __compactRuntime.CircuitContext<PS>,
       tokenId_0: bigint,
       seller_0: Uint8Array,
       price_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  cancel(context: __compactRuntime.CircuitContext<PS>,
         tokenId_0: bigint,
         seller_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  buy(context: __compactRuntime.CircuitContext<PS>,
      tokenId_0: bigint,
      buyer_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly next_id: bigint;
  owners: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
  uris: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): string;
    [Symbol.iterator](): Iterator<[bigint, string]>
  };
  listed_price: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  listed_payee: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
  readonly last_token_id: bigint;
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
