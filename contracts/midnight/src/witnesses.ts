import type { Ledger } from "../build/contract/index.cjs";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

/**
 * Private state containing audit data that never goes on-chain
 */
export type AuditPrivateState = {
  readonly exploitString: Uint8Array; // Exploit payload string (up to 64 bytes)
  readonly riskScore: bigint; // Risk score as bigint (Uint<64>)
};

/**
 * Create initial private state for an audit
 */
export const createAuditPrivateState = (
  exploitString: Uint8Array,
  riskScore: bigint
): AuditPrivateState => ({
  exploitString,
  riskScore,
});

/**
 * Witness implementations - these provide private data to the ZK circuits
 * Each function returns: [newPrivateState, returnValue]
 */
/**
 * Pad a Uint8Array to exactly 64 bytes
 */
const padTo64Bytes = (data: Uint8Array): Uint8Array => {
  if (data.length === 64) {
    return data;
  }
  if (data.length > 64) {
    return data.slice(0, 64);
  }
  const padded = new Uint8Array(64);
  padded.set(data, 0);
  return padded;
};

export const witnesses = {
  // Provides the exploit string (padded to exactly 64 bytes)
  exploit_string: ({
    privateState,
  }: WitnessContext<Ledger, AuditPrivateState>): [
    AuditPrivateState,
    Uint8Array
  ] => [privateState, padTo64Bytes(privateState.exploitString)],

  // Provides the risk score
  risk_score: ({
    privateState,
  }: WitnessContext<Ledger, AuditPrivateState>): [
    AuditPrivateState,
    bigint
  ] => [privateState, privateState.riskScore],
};
