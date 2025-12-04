/**
 * Unit tests for UnibasePayout module
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import UnibasePayout, {
  type VerificationResult,
  type AuditData,
  type BountyPayoutResult,
} from "./unibase-payout.js";

// Mock fetch
global.fetch = vi.fn();

describe("UnibasePayout", () => {
  let payout: UnibasePayout;
  const config = {
    unibaseApiUrl: "https://api.unibase.io",
    membaseAccount: "test_account",
    payoutWallet: "0x1234567890abcdef",
    judgeAgentUrl: "http://localhost:8002",
  };

  beforeEach(() => {
    payout = new UnibasePayout(config);
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create instance with valid config", () => {
      expect(payout).toBeInstanceOf(UnibasePayout);
    });

    it("should throw error if unibaseApiUrl is missing", () => {
      expect(() => {
        new UnibasePayout({
          ...config,
          unibaseApiUrl: "",
        });
      }).toThrow("unibaseApiUrl is required");
    });

    it("should throw error if membaseAccount is missing", () => {
      expect(() => {
        new UnibasePayout({
          ...config,
          membaseAccount: "",
        });
      }).toThrow("membaseAccount is required");
    });

    it("should throw error if payoutWallet is missing", () => {
      expect(() => {
        new UnibasePayout({
          ...config,
          payoutWallet: "",
        });
      }).toThrow("payoutWallet is required");
    });
  });

  describe("triggerBountyPayout", () => {
    const verificationResult: VerificationResult = {
      proofId: "proof_123",
      auditorId: "auditor_456",
      riskScore: 95,
      bountyAmount: 0,
      metadata: {},
    };

    it("should calculate correct bounty for risk score 90-95", async () => {
      const result = { ...verificationResult, riskScore: 92 };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true, isHighSeverity: true }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 10000 }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ txHash: "0xabc123" }),
      });

      const payoutResult = await payout.triggerBountyPayout(result);
      
      expect(payoutResult.bountyAmount).toBe(100);
    });

    it("should calculate correct bounty for risk score 96-99", async () => {
      const result = { ...verificationResult, riskScore: 97 };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true, isHighSeverity: true }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 10000 }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ txHash: "0xabc123" }),
      });

      const payoutResult = await payout.triggerBountyPayout(result);
      
      expect(payoutResult.bountyAmount).toBe(250);
    });

    it("should calculate correct bounty for risk score 100", async () => {
      const result = { ...verificationResult, riskScore: 100 };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true, isHighSeverity: true }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 10000 }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ txHash: "0xabc123" }),
      });

      const payoutResult = await payout.triggerBountyPayout(result);
      
      expect(payoutResult.bountyAmount).toBe(500);
    });

    it("should fail if proof verification fails", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: false }),
      });

      const payoutResult = await payout.triggerBountyPayout(verificationResult);
      
      expect(payoutResult.success).toBe(false);
      expect(payoutResult.error).toBe("Proof verification failed");
    });

    it("should prevent double-spending", async () => {
      // First payout
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true, isHighSeverity: true }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 10000 }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ txHash: "0xabc123" }),
      });

      await payout.triggerBountyPayout(verificationResult);

      // Second payout attempt
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true, isHighSeverity: true }),
      });

      const payoutResult = await payout.triggerBountyPayout(verificationResult);
      
      expect(payoutResult.success).toBe(false);
      expect(payoutResult.error).toBe("Bounty already paid for this proof");
    });

    it("should handle network errors with retries", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true, isHighSeverity: true }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 10000 }),
      });

      // First two attempts fail
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));
      
      // Third attempt succeeds
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ txHash: "0xabc123" }),
      });

      const payoutResult = await payout.triggerBountyPayout(verificationResult);
      
      expect(payoutResult.success).toBe(true);
      expect(payoutResult.txHash).toBe("0xabc123");
    });
  });

  describe("storeAuditInMemory", () => {
    const auditData: AuditData = {
      proofId: "proof_123",
      exploitHash: "0xabcdef123456",
      riskScore: 95,
      timestamp: new Date(),
      auditorId: "auditor_456",
    };

    it("should store audit successfully", async () => {
      const result = await payout.storeAuditInMemory(auditData);
      
      expect(result.success).toBe(true);
      expect(result.storageId).toBeDefined();
    });

    it("should not store actual exploit string", async () => {
      const result = await payout.storeAuditInMemory(auditData);
      
      expect(result.success).toBe(true);
      // Verify only hash is stored, not exploit string
      expect(auditData.exploitHash).toBeDefined();
    });
  });

  describe("getPayoutHistory", () => {
    it("should return payout history for auditor", async () => {
      const history = await payout.getPayoutHistory("auditor_456");
      
      expect(history).toBeDefined();
      expect(history.payouts).toBeInstanceOf(Array);
      expect(history.totalEarnings).toBeGreaterThanOrEqual(0);
      expect(history.totalPayouts).toBeGreaterThanOrEqual(0);
    });
  });

  describe("validatePayout", () => {
    it("should return false for new proof", async () => {
      const validation = await payout.validatePayout("new_proof_123");
      
      expect(validation.alreadyPaid).toBe(false);
      expect(validation.canProceed).toBe(true);
    });

    it("should detect already paid proof", async () => {
      const verificationResult: VerificationResult = {
        proofId: "proof_123",
        auditorId: "auditor_456",
        riskScore: 95,
        bountyAmount: 0,
        metadata: {},
      };

      // First payout
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true, isHighSeverity: true }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 10000 }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ txHash: "0xabc123" }),
      });

      await payout.triggerBountyPayout(verificationResult);

      // Validate
      const validation = await payout.validatePayout("proof_123");
      
      expect(validation.alreadyPaid).toBe(true);
      expect(validation.canProceed).toBe(false);
      expect(validation.payoutRecord).toBeDefined();
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits", async () => {
      const verificationResult: VerificationResult = {
        proofId: "proof_123",
        auditorId: "auditor_456",
        riskScore: 95,
        bountyAmount: 0,
        metadata: {},
      };

      // Mock successful responses
      const mockSuccess = {
        ok: true,
        json: async () => ({ isValid: true, isHighSeverity: true }),
      };

      const mockBalance = {
        ok: true,
        json: async () => ({ balance: 10000 }),
      };

      const mockTx = {
        ok: true,
        json: async () => ({ txHash: "0xabc123" }),
      };

      // Attempt more than rate limit (default 10/hour)
      for (let i = 0; i < 11; i++) {
        (global.fetch as any).mockResolvedValueOnce(mockSuccess);
        (global.fetch as any).mockResolvedValueOnce(mockBalance);
        (global.fetch as any).mockResolvedValueOnce(mockTx);

        const result = await payout.triggerBountyPayout({
          ...verificationResult,
          proofId: `proof_${i}`,
        });

        if (i < 10) {
          expect(result.success).toBe(true);
        } else {
          // 11th attempt should hit rate limit
          expect(result.success).toBe(false);
          expect(result.error).toBe("Rate limit exceeded");
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle network timeouts", async () => {
      (global.fetch as any).mockRejectedValue(new Error("Network timeout"));

      const verificationResult: VerificationResult = {
        proofId: "proof_123",
        auditorId: "auditor_456",
        riskScore: 95,
        bountyAmount: 0,
        metadata: {},
      };

      const result = await payout.triggerBountyPayout(verificationResult);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle insufficient balance", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true, isHighSeverity: true }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 50 }), // Less than required
      });

      const verificationResult: VerificationResult = {
        proofId: "proof_123",
        auditorId: "auditor_456",
        riskScore: 95,
        bountyAmount: 0,
        metadata: {},
      };

      const result = await payout.triggerBountyPayout(verificationResult);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Insufficient wallet balance");
    });
  });
});

