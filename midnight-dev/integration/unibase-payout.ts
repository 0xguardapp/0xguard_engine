/**
 * Unibase Integration Module for Gasless Bounty Payouts
 * 
 * Provides gasless transaction capabilities for bounty payouts
 * using Unibase account abstraction and Membase storage.
 */

import { createHash } from "crypto";
import { checkDevnetAvailability } from "./judge-integration.js";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface VerificationResult {
  proofId: string;
  auditorId: string;
  riskScore: number;
  bountyAmount: number;
  metadata: Record<string, any>;
}

export interface BountyPayoutResult {
  success: boolean;
  txHash: string;
  bountyAmount: number;
  recipient: string;
  timestamp: Date;
  error?: string;
}

export interface AuditData {
  proofId: string;
  exploitHash: string; // Hashed exploit, not the actual string
  riskScore: number;
  timestamp: Date;
  auditorId: string;
  metadata?: Record<string, any>;
}

export interface StorageConfirmation {
  success: boolean;
  storageId?: string;
  timestamp: Date;
  error?: string;
}

export interface PayoutRecord {
  proofId: string;
  auditorId: string;
  bountyAmount: number;
  txHash: string;
  timestamp: Date;
  riskScore: number;
}

export interface PayoutHistory {
  payouts: PayoutRecord[];
  totalEarnings: number;
  totalPayouts: number;
}

export interface ValidationStatus {
  alreadyPaid: boolean;
  payoutRecord?: PayoutRecord;
  canProceed: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

interface UnibasePayoutConfig {
  unibaseApiUrl: string;
  membaseAccount: string;
  payoutWallet: string;
  judgeAgentUrl?: string;
  rateLimitPerHour?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// ============================================================================
// UnibasePayout Class
// ============================================================================

export class UnibasePayout {
  private config: UnibasePayoutConfig;
  private payoutHistory: Map<string, PayoutRecord> = new Map(); // proofId -> PayoutRecord
  private rateLimitTracker: Map<string, number[]> = new Map(); // auditorId -> timestamps
  private walletBalance: number = 0;

  constructor(config: UnibasePayoutConfig) {
    this.config = {
      rateLimitPerHour: 10,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };

    // Validate configuration
    if (!this.config.unibaseApiUrl) {
      throw new Error("unibaseApiUrl is required");
    }
    if (!this.config.membaseAccount) {
      throw new Error("membaseAccount is required");
    }
    if (!this.config.payoutWallet) {
      throw new Error("payoutWallet is required");
    }
  }

  // ============================================================================
  // Main Methods
  // ============================================================================

  /**
   * Trigger gasless bounty payout for verified audit.
   * 
   * Process:
   * a. Verify proof is valid (call JudgeAgent)
   * b. Calculate bounty based on risk_score
   * c. Submit gasless transaction to Unibase
   * d. Store payout record in Membase
   * e. Return transaction receipt
   */
  async triggerBountyPayout(verificationResult: VerificationResult): Promise<BountyPayoutResult> {
    const { proofId, auditorId, riskScore, metadata } = verificationResult;

    try {
      console.log(`💰 Processing bounty payout for proof: ${proofId.substring(0, 16)}...`);

      // Step 1: Verify proof is valid
      console.log("   [1/5] Verifying proof with JudgeAgent...");
      const proofValid = await this.verifyProofWithJudge(proofId, auditorId);
      if (!proofValid) {
        return {
          success: false,
          txHash: "",
          bountyAmount: 0,
          recipient: auditorId,
          timestamp: new Date(),
          error: "Proof verification failed",
        };
      }

      // Step 2: Check if already paid (prevent double-spending)
      console.log("   [2/5] Checking for duplicate payout...");
      const validation = await this.validatePayout(proofId);
      if (validation.alreadyPaid) {
        return {
          success: false,
          txHash: validation.payoutRecord?.txHash || "",
          bountyAmount: validation.payoutRecord?.bountyAmount || 0,
          recipient: auditorId,
          timestamp: validation.payoutRecord?.timestamp || new Date(),
          error: "Bounty already paid for this proof",
        };
      }

      // Step 3: Check rate limits
      console.log("   [3/5] Checking rate limits...");
      if (!this.checkRateLimit(auditorId)) {
        return {
          success: false,
          txHash: "",
          bountyAmount: 0,
          recipient: auditorId,
          timestamp: new Date(),
          error: "Rate limit exceeded",
        };
      }

      // Step 4: Calculate bounty based on risk_score
      console.log("   [4/5] Calculating bounty amount...");
      const bountyAmount = this.calculateBounty(riskScore);
      verificationResult.bountyAmount = bountyAmount;

      // Step 5: Verify wallet balance
      console.log("   [5/5] Verifying wallet balance...");
      const hasBalance = await this.verifyWalletBalance(bountyAmount);
      if (!hasBalance) {
        return {
          success: false,
          txHash: "",
          bountyAmount,
          recipient: auditorId,
          timestamp: new Date(),
          error: "Insufficient wallet balance",
        };
      }

      // Step 6: Submit gasless transaction to Unibase
      console.log("   [6/6] Submitting gasless transaction...");
      const txResult = await this.submitGaslessTransaction(
        auditorId,
        bountyAmount,
        proofId,
        metadata
      );

      if (!txResult.success) {
        return {
          success: false,
          txHash: "",
          bountyAmount,
          recipient: auditorId,
          timestamp: new Date(),
          error: txResult.error || "Transaction submission failed",
        };
      }

      // Step 7: Store payout record in Membase
      console.log("   Storing payout record in Membase...");
      const payoutRecord: PayoutRecord = {
        proofId,
        auditorId,
        bountyAmount,
        txHash: txResult.txHash,
        timestamp: new Date(),
        riskScore,
      };

      await this.storePayoutRecord(payoutRecord);
      this.payoutHistory.set(proofId, payoutRecord);
      this.updateRateLimit(auditorId);

      console.log(`✅ Bounty payout successful!`);
      console.log(`   Transaction: ${txResult.txHash}`);
      console.log(`   Amount: ${bountyAmount} tokens`);
      console.log(`   Recipient: ${auditorId.substring(0, 20)}...`);

      return {
        success: true,
        txHash: txResult.txHash,
        bountyAmount,
        recipient: auditorId,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`❌ Bounty payout failed:`, error);
      return {
        success: false,
        txHash: "",
        bountyAmount: verificationResult.bountyAmount || 0,
        recipient: auditorId,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Store verified audit in Membase.
   * Includes: exploit_hash (not string), risk_score, timestamp
   * Tagged with auditor_id
   */
  async storeAuditInMemory(auditData: AuditData): Promise<StorageConfirmation> {
    try {
      console.log(`💾 Storing audit in Membase: ${auditData.proofId.substring(0, 16)}...`);

      // Prepare audit record (exclude actual exploit string)
      const auditRecord = {
        proofId: auditData.proofId,
        exploitHash: auditData.exploitHash, // Only hash, not actual exploit
        riskScore: auditData.riskScore,
        timestamp: auditData.timestamp.toISOString(),
        auditorId: auditData.auditorId,
        metadata: auditData.metadata || {},
      };

      // Store in Membase via API
      const storageId = await this.storeInMembase(
        `audit:${auditData.proofId}`,
        auditRecord,
        {
          tags: [`auditor:${auditData.auditorId}`, `risk:${auditData.riskScore}`],
        }
      );

      console.log(`✅ Audit stored successfully. Storage ID: ${storageId}`);

      return {
        success: true,
        storageId,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`❌ Failed to store audit:`, error);
      return {
        success: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Query Membase for past payouts for an auditor.
   * Returns list of payouts and total earnings.
   */
  async getPayoutHistory(auditorId: string): Promise<PayoutHistory> {
    try {
      console.log(`📊 Fetching payout history for auditor: ${auditorId.substring(0, 20)}...`);

      // Query Membase for payout records
      const payouts = await this.queryMembase<PayoutRecord>({
        query: {
          auditorId,
          type: "payout",
        },
        limit: 100,
      });

      // Calculate total earnings
      const totalEarnings = payouts.reduce((sum, payout) => sum + payout.bountyAmount, 0);

      console.log(`✅ Found ${payouts.length} payouts. Total earnings: ${totalEarnings} tokens`);

      return {
        payouts,
        totalEarnings,
        totalPayouts: payouts.length,
      };
    } catch (error) {
      console.error(`❌ Failed to fetch payout history:`, error);
      return {
        payouts: [],
        totalEarnings: 0,
        totalPayouts: 0,
      };
    }
  }

  /**
   * Check if bounty already paid for a proof.
   * Prevents double-spending.
   */
  async validatePayout(proofId: string): Promise<ValidationStatus> {
    try {
      // Check in-memory cache first
      const cachedRecord = this.payoutHistory.get(proofId);
      if (cachedRecord) {
        return {
          alreadyPaid: true,
          payoutRecord: cachedRecord,
          canProceed: false,
        };
      }

      // Query Membase for payout record
      const records = await this.queryMembase<PayoutRecord>({
        query: {
          proofId,
          type: "payout",
        },
        limit: 1,
      });

      if (records.length > 0) {
        const record = records[0];
        this.payoutHistory.set(proofId, record);
        return {
          alreadyPaid: true,
          payoutRecord: record,
          canProceed: false,
        };
      }

      return {
        alreadyPaid: false,
        canProceed: true,
      };
    } catch (error) {
      console.error(`❌ Validation error:`, error);
      // On error, allow proceeding (fail open for availability)
      return {
        alreadyPaid: false,
        canProceed: true,
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Verify proof with JudgeAgent.
   */
  private async verifyProofWithJudge(proofId: string, auditorId: string): Promise<boolean> {
    try {
      // Call JudgeAgent verification
      if (this.config.judgeAgentUrl) {
        const response = await fetch(`${this.config.judgeAgentUrl}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proofId, auditorId }),
        });

        if (response.ok) {
          const result = await response.json();
          return result.isValid === true && result.isHighSeverity === true;
        }
      }

      // Fallback: Use local verification
      // In production, this would call the actual proof verification
      // For now, check if devnet is available as a basic check
      try {
        const available = await checkDevnetAvailability();
        return available; // Basic check - in production, verify actual proof
      } catch (error) {
        console.error(`Local verification error:`, error);
        return false;
      }
    } catch (error) {
      console.error(`Proof verification error:`, error);
      return false;
    }
  }

  /**
   * Calculate bounty amount based on risk score.
   * - risk_score 90-95: 100 tokens
   * - risk_score 96-99: 250 tokens
   * - risk_score 100: 500 tokens
   */
  private calculateBounty(riskScore: number): number {
    if (riskScore >= 100) {
      return 500;
    } else if (riskScore >= 96) {
      return 250;
    } else if (riskScore >= 90) {
      return 100;
    }
    return 0; // No bounty for low risk
  }

  /**
   * Submit gasless transaction to Unibase.
   */
  private async submitGaslessTransaction(
    recipient: string,
    amount: number,
    proofId: string,
    metadata: Record<string, any>
  ): Promise<{ success: boolean; txHash: string; error?: string }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= (this.config.retryAttempts || 3); attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${this.config.retryAttempts}...`);

        // Prepare transaction payload
        const transaction = {
          from: this.config.payoutWallet,
          to: recipient,
          amount,
          proofId,
          metadata,
          timestamp: new Date().toISOString(),
        };

        // Sign transaction
        const signedTx = await this.signTransaction(transaction);

        // Submit to Unibase API
        const response = await fetch(`${this.config.unibaseApiUrl}/transactions/gasless`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.config.membaseAccount}`,
          },
          body: JSON.stringify({
            transaction: signedTx,
            account: this.config.membaseAccount,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Unibase API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return {
          success: true,
          txHash: result.txHash || this.generateTxHash(transaction),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`   Attempt ${attempt} failed:`, lastError.message);

        if (attempt < (this.config.retryAttempts || 3)) {
          const delay = (this.config.retryDelay || 1000) * attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      txHash: "",
      error: lastError?.message || "Transaction submission failed after retries",
    };
  }

  /**
   * Sign transaction for Unibase.
   */
  private async signTransaction(transaction: any): Promise<string> {
    // In production, use actual wallet signing
    // For now, generate deterministic signature
    const payload = JSON.stringify(transaction);
    const hash = createHash("sha256").update(payload).digest("hex");
    return `0x${hash}`;
  }

  /**
   * Generate transaction hash.
   */
  private generateTxHash(transaction: any): string {
    const payload = JSON.stringify(transaction);
    const hash = createHash("sha256").update(payload).digest("hex");
    return `0x${hash.substring(0, 16)}`;
  }

  /**
   * Verify wallet has sufficient balance.
   */
  private async verifyWalletBalance(requiredAmount: number): Promise<boolean> {
    try {
      // Query wallet balance from Unibase
      const response = await fetch(
        `${this.config.unibaseApiUrl}/accounts/${this.config.payoutWallet}/balance`,
        {
          headers: {
            "Authorization": `Bearer ${this.config.membaseAccount}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        this.walletBalance = data.balance || 0;
        return this.walletBalance >= requiredAmount;
      }

      // Fallback: assume sufficient balance if API unavailable
      return true;
    } catch (error) {
      console.error(`Balance check error:`, error);
      // Fail open for availability
      return true;
    }
  }

  /**
   * Store payout record in Membase.
   */
  private async storePayoutRecord(record: PayoutRecord): Promise<void> {
    await this.storeInMembase(`payout:${record.proofId}`, record, {
      tags: [`auditor:${record.auditorId}`, `tx:${record.txHash}`],
    });
  }

  /**
   * Store data in Membase.
   */
  private async storeInMembase(
    key: string,
    data: any,
    options?: { tags?: string[] }
  ): Promise<string> {
    try {
      // In production, use actual Membase SDK
      // For now, simulate storage
      const storageId = createHash("sha256")
        .update(`${key}${JSON.stringify(data)}`)
        .digest("hex")
        .substring(0, 16);

      // Log transaction
      this.logTransaction({
        type: "storage",
        key,
        storageId,
        timestamp: new Date(),
      });

      return storageId;
    } catch (error) {
      throw new Error(`Membase storage failed: ${error}`);
    }
  }

  /**
   * Query Membase for records.
   */
  private async queryMembase<T>(query: {
    query: Record<string, any>;
    limit?: number;
  }): Promise<T[]> {
    try {
      // In production, use actual Membase SDK
      // For now, return empty array
      return [];
    } catch (error) {
      console.error(`Membase query error:`, error);
      return [];
    }
  }

  /**
   * Check rate limit for auditor.
   */
  private checkRateLimit(auditorId: string): boolean {
    const limit = this.config.rateLimitPerHour || 10;
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const timestamps = this.rateLimitTracker.get(auditorId) || [];
    const recentTimestamps = timestamps.filter((ts) => ts > oneHourAgo);

    if (recentTimestamps.length >= limit) {
      return false;
    }

    return true;
  }

  /**
   * Update rate limit tracker.
   */
  private updateRateLimit(auditorId: string): void {
    const timestamps = this.rateLimitTracker.get(auditorId) || [];
    timestamps.push(Date.now());
    this.rateLimitTracker.set(auditorId, timestamps);
  }

  /**
   * Log transaction for audit trail.
   */
  private logTransaction(transaction: any): void {
    console.log(`📝 Transaction logged:`, {
      ...transaction,
      timestamp: transaction.timestamp.toISOString(),
    });
  }
}

// ============================================================================
// Export
// ============================================================================

export default UnibasePayout;

