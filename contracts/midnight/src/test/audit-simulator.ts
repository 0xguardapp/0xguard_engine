
import {
    type CircuitContext,
    QueryContext,
    sampleContractAddress,
    constructorContext,
  } from "@midnight-ntwrk/compact-runtime";
  import {
    Contract,
    type Ledger,
    ledger,
  } from "../../build/contract/index.cjs";
  import { type AuditPrivateState, witnesses } from "../witnesses.js";
  
  /**
   * Serves as a testbed to exercise the AuditVerifier contract in tests
   */
  export class AuditVerifierSimulator {
    readonly contract: Contract<AuditPrivateState>;
    circuitContext: CircuitContext<AuditPrivateState>;
  
    constructor(nonce: Uint8Array, riskScore: bigint, attackerWallet: Uint8Array) {
      this.contract = new Contract<AuditPrivateState>(witnesses);
      
      const privateState: AuditPrivateState = {
        nonce,
        riskScore,
        attackerWallet,
      };
  
      const {
        currentPrivateState,
        currentContractState,
        currentZswapLocalState,
      } = this.contract.initialState(
        constructorContext(privateState, "0".repeat(64))
      );
  
      this.circuitContext = {
        currentPrivateState,
        currentZswapLocalState,
        originalState: currentContractState,
        transactionContext: new QueryContext(
          currentContractState.data,
          sampleContractAddress()
        ),
      };
    }
  
    /**
     * Switch to a different private state (e.g., different attacker)
     */
    public switchPrivateState(
      nonce: Uint8Array,
      riskScore: bigint,
      attackerWallet: Uint8Array
    ) {
      this.circuitContext.currentPrivateState = {
        nonce,
        riskScore,
        attackerWallet,
      };
    }
  
    /**
     * Get current public ledger state
     */
    public getLedger(): Ledger {
      return ledger(this.circuitContext.transactionContext.state);
    }
  
    /**
     * Get current private state
     */
    public getPrivateState(): AuditPrivateState {
      return this.circuitContext.currentPrivateState;
    }
  
    /**
     * Submit an audit with ZK proof
     */
    public submitAudit(
      auditId: Uint8Array,
      threshold: bigint,
      expiresAt: bigint
    ): Ledger {
      // Execute the submitAudit circuit
      this.circuitContext = this.contract.impureCircuits.submitAudit(
        this.circuitContext,
        auditId,
        threshold,
        expiresAt
      ).context;
  
      return ledger(this.circuitContext.transactionContext.state);
    }
  }