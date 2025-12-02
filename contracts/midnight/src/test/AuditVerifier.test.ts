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
    const exploitString = new Uint8Array(Buffer.from("fetch_ai_2024"));
    const riskScore = 95n;

    const simulator0 = new AuditVerifierSimulator(
      exploitString,
      riskScore,
    );
    const simulator1 = new AuditVerifierSimulator(
      exploitString,
      riskScore,
    );

    const ledger0 = simulator0.getLedger();
    const ledger1 = simulator1.getLedger();

    // Compare sizes instead of deep equality due to WASM internal references
    expect(ledger0.proofs.size()).toEqual(ledger1.proofs.size());
    expect(ledger0.is_verified.size()).toEqual(ledger1.is_verified.size());
    expect(ledger0.auditor_id.size()).toEqual(ledger1.auditor_id.size());
    expect(ledger0.proofs.isEmpty()).toEqual(ledger1.proofs.isEmpty());
  });

  it("properly initializes ledger state and private state", () => {
    const exploitString = new Uint8Array(Buffer.from("fetch_ai_2024"));
    const riskScore = 95n;

    const simulator = new AuditVerifierSimulator(
      exploitString,
      riskScore,
    );

    const initialLedgerState = simulator.getLedger();
    // All maps should be empty initially
    expect(initialLedgerState.proofs.isEmpty()).toEqual(true);
    expect(initialLedgerState.is_verified.isEmpty()).toEqual(true);
    expect(initialLedgerState.auditor_id.isEmpty()).toEqual(true);

    const initialPrivateState = simulator.getPrivateState();
    expect(initialPrivateState.exploitString).toEqual(exploitString);
    expect(initialPrivateState.riskScore).toEqual(riskScore);
  });

  it("lets you submit an audit with valid risk_score", () => {
    const exploitString = new Uint8Array(Buffer.from("fetch_ai_2024"));
    const riskScore = 95n;
    const simulator = new AuditVerifierSimulator(
      exploitString,
      riskScore,
    );

    const initialPrivateState = simulator.getPrivateState();
    const auditId = randomBytes(32);
    const auditorId = randomBytes(32);
    const threshold = 90n;

    simulator.submitAudit(auditId, auditorId, threshold);

    // Private state shouldn't change
    expect(initialPrivateState).toEqual(simulator.getPrivateState());

    // Public ledger should be updated
    const ledgerState = simulator.getLedger();
    expect(ledgerState.proofs.size()).toEqual(1n);
    expect(ledgerState.is_verified.size()).toEqual(1n);
    expect(ledgerState.auditor_id.size()).toEqual(1n);

    // Check that the audit was stored with correct values
    expect(ledgerState.is_verified.lookup(auditId)).toEqual(1n); // Uint<1>: 1 = true
    expect(ledgerState.auditor_id.lookup(auditId)).toEqual(auditorId);
  });

  it("lets you submit multiple audits from same auditor", () => {
    const exploitString = new Uint8Array(Buffer.from("fetch_ai_2024"));
    const riskScore = 97n;
    const simulator = new AuditVerifierSimulator(
      exploitString,
      riskScore,
    );

    const initialPrivateState = simulator.getPrivateState();

    const auditId1 = randomBytes(32);
    const auditId2 = randomBytes(32);
    const auditorId = randomBytes(32);
    const threshold = 90n;

    simulator.submitAudit(auditId1, auditorId, threshold);
    simulator.submitAudit(auditId2, auditorId, threshold);

    // Private state shouldn't change
    expect(initialPrivateState).toEqual(simulator.getPrivateState());

    // Both audits should be stored
    const ledgerState = simulator.getLedger();
    expect(ledgerState.is_verified.size()).toEqual(2n);
    expect(ledgerState.is_verified.member(auditId1)).toEqual(true);
    expect(ledgerState.is_verified.member(auditId2)).toEqual(true);
  });

  it("lets a different auditor submit an audit", () => {
    const exploitString1 = new Uint8Array(Buffer.from("exploit1"));
    const simulator = new AuditVerifierSimulator(
      exploitString1,
      95n,
    );

    const auditId1 = randomBytes(32);
    const auditorId1 = randomBytes(32);
    simulator.submitAudit(auditId1, auditorId1, 90n);

    // Switch to different exploit
    const exploitString2 = new Uint8Array(Buffer.from("exploit2"));
    simulator.switchPrivateState(exploitString2, 98n);

    const auditId2 = randomBytes(32);
    const auditorId2 = randomBytes(32);
    simulator.submitAudit(auditId2, auditorId2, 90n);

    const ledgerState = simulator.getLedger();
    expect(ledgerState.is_verified.size()).toEqual(2n);
    expect(ledgerState.is_verified.member(auditId1)).toEqual(true);
    expect(ledgerState.is_verified.member(auditId2)).toEqual(true);
  });

  it("doesn't let you submit audit with risk_score below threshold", () => {
    const exploitString = new Uint8Array(Buffer.from("low_risk_exploit"));
    const riskScore = 85n; // Below threshold
    const simulator = new AuditVerifierSimulator(
      exploitString,
      riskScore,
    );

    const auditId = randomBytes(32);
    const auditorId = randomBytes(32);
    const threshold = 90n; // Higher than risk_score

    expect(() => simulator.submitAudit(auditId, auditorId, threshold)).toThrow(
      "failed assert: risk_score < threshold",
    );
  });

  it("accepts audit with risk_score exactly at threshold", () => {
    const exploitString = new Uint8Array(Buffer.from("threshold_exploit"));
    const riskScore = 90n; // Exactly at threshold
    const simulator = new AuditVerifierSimulator(
      exploitString,
      riskScore,
    );

    const auditId = randomBytes(32);
    const auditorId = randomBytes(32);
    const threshold = 90n;

    simulator.submitAudit(auditId, auditorId, threshold);

    const ledgerState = simulator.getLedger();
    expect(ledgerState.is_verified.member(auditId)).toEqual(true);
    expect(ledgerState.is_verified.lookup(auditId)).toEqual(1n); // Uint<1>: 1 = true
  });

  it("stores different proof hashes for different audits", () => {
    const exploitString = new Uint8Array(Buffer.from("test_exploit"));
    const riskScore = 95n;
    const simulator = new AuditVerifierSimulator(
      exploitString,
      riskScore,
    );

    const auditId1 = randomBytes(32);
    const auditId2 = randomBytes(32);
    const auditorId = randomBytes(32);
    const threshold = 90n;

    simulator.submitAudit(auditId1, auditorId, threshold);
    simulator.submitAudit(auditId2, auditorId, threshold);

    const ledgerState = simulator.getLedger();
    const proof1 = ledgerState.proofs.lookup(auditId1);
    const proof2 = ledgerState.proofs.lookup(auditId2);

    // Proof hashes should be different because audit IDs are different
    expect(proof1).not.toEqual(proof2);
  });

  it("allows submitting audit with maximum u64 risk_score", () => {
    const exploitString = new Uint8Array(Buffer.from("max_risk_exploit"));
    const riskScore = 18446744073709551615n; // Max u64
    const simulator = new AuditVerifierSimulator(
      exploitString,
      riskScore,
    );

    const auditId = randomBytes(32);
    const auditorId = randomBytes(32);
    const threshold = 90n;

    simulator.submitAudit(auditId, auditorId, threshold);

    const ledgerState = simulator.getLedger();
    expect(ledgerState.is_verified.member(auditId)).toEqual(true);
  });

  it("maintains separate entries in all three maps", () => {
    const exploitString = new Uint8Array(Buffer.from("test_exploit"));
    const simulator = new AuditVerifierSimulator(
      exploitString,
      95n,
    );

    const auditId = randomBytes(32);
    const auditorId = randomBytes(32);
    const threshold = 90n;

    simulator.submitAudit(auditId, auditorId, threshold);

    const ledgerState = simulator.getLedger();

    // All three maps should have the entry
    expect(ledgerState.proofs.member(auditId)).toEqual(true);
    expect(ledgerState.is_verified.member(auditId)).toEqual(true);
    expect(ledgerState.auditor_id.member(auditId)).toEqual(true);

    // Verify values are correct
    expect(ledgerState.is_verified.lookup(auditId)).toEqual(1n); // Uint<1>: 1 = true
    expect(ledgerState.auditor_id.lookup(auditId)).toEqual(auditorId);
    expect(ledgerState.proofs.lookup(auditId)).toBeDefined();
  });
});
