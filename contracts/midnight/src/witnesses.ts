import type { Ledger } from "../build/contract/index.cjs";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

/**
 * Private state containing audit data that never goes on-chain
 */
export type AuditPrivateState = {
  readonly nonce: Uint8Array; // 32-byte random nonce
  readonly riskScore: bigint; // Risk score as bigint (Uint<64>)
  readonly attackerWallet: Uint8Array; // 32-byte attacker wallet address
};

/**
 * Create initial private state for an audit
 */
export const createAuditPrivateState = (
  nonce: Uint8Array,
  riskScore: bigint,
  attackerWallet: Uint8Array
): AuditPrivateState => ({
  nonce,
  riskScore,
  attackerWallet,
});

/**
 * Witness implementations - these provide private data to the ZK circuits
 * Each function returns: [newPrivateState, returnValue]
 */
export const witnesses = {
  // Provides the random nonce
  nonce: ({
    privateState,
  }: WitnessContext<Ledger, AuditPrivateState>): [
    AuditPrivateState,
    Uint8Array
  ] => [privateState, privateState.nonce],

  // Provides the risk score
  risk_score: ({
    privateState,
  }: WitnessContext<Ledger, AuditPrivateState>): [
    AuditPrivateState,
    bigint
  ] => [privateState, privateState.riskScore],

  // Provides the attacker wallet address
  attacker_wallet: ({
    privateState,
  }: WitnessContext<Ledger, AuditPrivateState>): [
    AuditPrivateState,
    Uint8Array
  ] => [privateState, privateState.attackerWallet],
};
