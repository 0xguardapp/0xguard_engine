import { AuditVerifierSimulator } from "./audit-simulator.js";
import {
  NetworkId,
  setNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";

setNetworkId(NetworkId.Undeployed);

describe("AuditVerifier smart contract", () => {
  it("generates initial ledger state deterministically", () => {
    const nonce = randomBytes(32);
    const riskScore = 95n;
    const attackerWallet = randomBytes(32);

    const simulator0 = new AuditVerifierSimulator(
      nonce,
      riskScore,
      attackerWallet,
    );
    const simulator1 = new AuditVerifierSimulator(
      nonce,
      riskScore,
      attackerWallet,
    );

    expect(simulator0.getLedger()).toEqual(simulator1.getLedger());
  });

  it("properly initializes ledger state and private state", () => {
    const nonce = randomBytes(32);
    const riskScore = 95n;
    const attackerWallet = randomBytes(32);

    const simulator = new AuditVerifierSimulator(
      nonce,
      riskScore,
      attackerWallet,
    );

    const initialLedgerState = simulator.getLedger();
    // All maps should be empty initially
    expect(initialLedgerState.proofs.isEmpty()).toEqual(true);
    expect(initialLedgerState.verified_audits.isEmpty()).toEqual(true);
    expect(initialLedgerState.accepted_at.isEmpty()).toEqual(true);

    const initialPrivateState = simulator.getPrivateState();
    expect(initialPrivateState.nonce).toEqual(nonce);
    expect(initialPrivateState.riskScore).toEqual(riskScore);
    expect(initialPrivateState.attackerWallet).toEqual(attackerWallet);
  });

  it("lets you submit an audit with valid risk_score", () => {
    const nonce = randomBytes(32);
    const riskScore = 95n;
    const attackerWallet = randomBytes(32);
    const simulator = new AuditVerifierSimulator(
      nonce,
      riskScore,
      attackerWallet,
    );

    const initialPrivateState = simulator.getPrivateState();
    const auditId = randomBytes(32);
    const threshold = 90n;
    const expiresAt = BigInt(Date.now() + 86400000);

    simulator.submitAudit(auditId, threshold, expiresAt);

    // Private state shouldn't change
    expect(initialPrivateState).toEqual(simulator.getPrivateState());

    // Public ledger should be updated
    const ledgerState = simulator.getLedger();
    expect(ledgerState.proofs.size()).toEqual(1);
    expect(ledgerState.verified_audits.size()).toEqual(1);
    expect(ledgerState.accepted_at.size()).toEqual(1);

    // Check that the audit was stored with correct timestamp
    expect(ledgerState.accepted_at.lookup(auditId)).toEqual(expiresAt);
  });

  it("lets you submit multiple audits from same attacker", () => {
    const nonce = randomBytes(32);
    const riskScore = 97n;
    const attackerWallet = randomBytes(32);
    const simulator = new AuditVerifierSimulator(
      nonce,
      riskScore,
      attackerWallet,
    );

    const initialPrivateState = simulator.getPrivateState();

    const auditId1 = randomBytes(32);
    const auditId2 = randomBytes(32);
    const threshold = 90n;
    const expiresAt = BigInt(Date.now() + 86400000);

    simulator.submitAudit(auditId1, threshold, expiresAt);
    simulator.submitAudit(auditId2, threshold, expiresAt);

    // Private state shouldn't change
    expect(initialPrivateState).toEqual(simulator.getPrivateState());

    // Both audits should be stored
    const ledgerState = simulator.getLedger();
    expect(ledgerState.verified_audits.size()).toEqual(2);
    expect(ledgerState.verified_audits.member(auditId1)).toEqual(true);
    expect(ledgerState.verified_audits.member(auditId2)).toEqual(true);
  });

  it("lets a different attacker submit an audit", () => {
    const simulator = new AuditVerifierSimulator(
      randomBytes(32),
      95n,
      randomBytes(32),
    );

    const auditId1 = randomBytes(32);
    simulator.submitAudit(auditId1, 90n, BigInt(Date.now() + 86400000));

    // Switch to different attacker
    simulator.switchPrivateState(randomBytes(32), 98n, randomBytes(32));

    const auditId2 = randomBytes(32);
    simulator.submitAudit(auditId2, 90n, BigInt(Date.now() + 86400000));

    const ledgerState = simulator.getLedger();
    expect(ledgerState.verified_audits.size()).toEqual(2);
    expect(ledgerState.verified_audits.member(auditId1)).toEqual(true);
    expect(ledgerState.verified_audits.member(auditId2)).toEqual(true);
  });

  it("doesn't let you submit audit with risk_score below threshold", () => {
    const nonce = randomBytes(32);
    const riskScore = 85n; // Below threshold
    const attackerWallet = randomBytes(32);
    const simulator = new AuditVerifierSimulator(
      nonce,
      riskScore,
      attackerWallet,
    );

    const auditId = randomBytes(32);
    const threshold = 90n; // Higher than risk_score
    const expiresAt = BigInt(Date.now() + 86400000);

    expect(() => simulator.submitAudit(auditId, threshold, expiresAt)).toThrow(
      "failed assert: risk_score < threshold",
    );
  });

  it("accepts audit with risk_score exactly at threshold", () => {
    const nonce = randomBytes(32);
    const riskScore = 90n; // Exactly at threshold
    const attackerWallet = randomBytes(32);
    const simulator = new AuditVerifierSimulator(
      nonce,
      riskScore,
      attackerWallet,
    );

    const auditId = randomBytes(32);
    const threshold = 90n;
    const expiresAt = BigInt(Date.now() + 86400000);

    simulator.submitAudit(auditId, threshold, expiresAt);

    const ledgerState = simulator.getLedger();
    expect(ledgerState.verified_audits.member(auditId)).toEqual(true);
  });

  it("stores different proof hashes for different audits", () => {
    const nonce = randomBytes(32);
    const riskScore = 95n;
    const attackerWallet = randomBytes(32);
    const simulator = new AuditVerifierSimulator(
      nonce,
      riskScore,
      attackerWallet,
    );

    const auditId1 = randomBytes(32);
    const auditId2 = randomBytes(32);
    const threshold = 90n;
    const expiresAt = BigInt(Date.now() + 86400000);

    simulator.submitAudit(auditId1, threshold, expiresAt);
    simulator.submitAudit(auditId2, threshold, expiresAt);

    const ledgerState = simulator.getLedger();
    const proof1 = ledgerState.proofs.lookup(auditId1);
    const proof2 = ledgerState.proofs.lookup(auditId2);

    // Proof hashes should be different because audit IDs are different
    expect(proof1).not.toEqual(proof2);
  });

  it("allows submitting audit with maximum u64 risk_score", () => {
    const nonce = randomBytes(32);
    const riskScore = 18446744073709551615n; // Max u64
    const attackerWallet = randomBytes(32);
    const simulator = new AuditVerifierSimulator(
      nonce,
      riskScore,
      attackerWallet,
    );

    const auditId = randomBytes(32);
    const threshold = 90n;
    const expiresAt = BigInt(Date.now() + 86400000);

    simulator.submitAudit(auditId, threshold, expiresAt);

    const ledgerState = simulator.getLedger();
    expect(ledgerState.verified_audits.member(auditId)).toEqual(true);
  });

  it("maintains separate entries in all three maps", () => {
    const simulator = new AuditVerifierSimulator(
      randomBytes(32),
      95n,
      randomBytes(32),
    );

    const auditId = randomBytes(32);
    const threshold = 90n;
    const expiresAt = BigInt(Date.now() + 86400000);

    simulator.submitAudit(auditId, threshold, expiresAt);

    const ledgerState = simulator.getLedger();

    // All three maps should have the entry
    expect(ledgerState.proofs.member(auditId)).toEqual(true);
    expect(ledgerState.verified_audits.member(auditId)).toEqual(true);
    expect(ledgerState.accepted_at.member(auditId)).toEqual(true);

    // Verify they all reference the same audit ID
    const proofHash = ledgerState.proofs.lookup(auditId);
    const verifiedProofHash = ledgerState.verified_audits.lookup(auditId);
    expect(proofHash).toEqual(verifiedProofHash);
  });
});
