"""
0xGuard Midnight API - Python FastAPI Server

This API provides endpoints for interacting with the 0xGuard audit verifier contract
on the Midnight Network, along with wallet management utilities.
"""

import os
import json
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from config import NetworkType
from utils.wallet import WalletUtils


# Pydantic models for request/response
class InitRequest(BaseModel):
    mode: str = Field(..., description="Either 'deploy' or 'join'")
    contract_address: Optional[str] = Field(
        None, description="Required for 'join' mode"
    )
    environment: NetworkType = Field("testnet", description="Network environment")


class InitResponse(BaseModel):
    success: bool
    contract_address: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


class SubmitAuditRequest(BaseModel):
    audit_id: str = Field(..., description="Unique audit identifier (hex string)")
    auditor_addr: str = Field(..., description="Auditor address (32-byte hex string)")
    threshold: int = Field(
        ..., description="Risk threshold (minimum risk score required)"
    )
    witness: Dict[str, Any] = Field(
        ...,
        description="Private witness data containing exploit_string and risk_score",
    )


class SubmitAuditResponse(BaseModel):
    success: bool
    transaction_id: Optional[str] = None
    block_height: Optional[int] = None
    error: Optional[str] = None
    ledger_state: Dict[str, Any]


class QueryAuditRequest(BaseModel):
    audit_id: str = Field(..., description="Audit ID to query")


class QueryAuditResponse(BaseModel):
    found: bool
    audit_id: Optional[str] = None
    proof_hash: Optional[str] = None
    is_verified: Optional[bool] = None


class WalletBalanceResponse(BaseModel):
    address: str
    balances: Dict[str, str]
    available_coins: int
    pending_coins: int
    total_coins: int
    synced: bool


class TransactionHistoryResponse(BaseModel):
    address: str
    transaction_count: int
    transactions: List[Dict[str, Any]]


class NetworkHealthResponse(BaseModel):
    latest_block: int
    block_hash: str
    timestamp: int  # Changed from str to int to match actual response
    total_transactions_checked: int
    succeeded: int
    failed: int
    success_rate: str
    healthy: bool


# Global state
class AppState:
    contract_api: Optional[Any] = None
    contract_address: Optional[str] = None
    wallet_utils: Optional[WalletUtils] = None
    api_root: Path = Path(__file__).parent.parent


app_state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    app_state.api_root = Path(__file__).parent.parent
    app_state.wallet_utils = WalletUtils(app_state.api_root)
    yield
    # Shutdown
    pass


# Initialize FastAPI app
app = FastAPI(
    title="0xGuard Midnight API",
    description="API for interacting with 0xGuard audit verifier on Midnight Network",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def run_ts_contract_operation(
    operation: str, data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Run a TypeScript contract operation

    Args:
        operation: Operation name (init, submit_audit, query_audit, get_ledger)
        data: Operation data

    Returns:
        Operation result
    """
    script_path = app_state.api_root / "ts/src" / "bridge.ts"

    # Create the bridge script if it doesn't exist
    if not script_path.exists():
        raise HTTPException(
            status_code=500, detail="Contract bridge not initialized. Run setup first."
        )

    # tsx is in the root workspace node_modules
    tsx_bin = str(app_state.api_root.parent.parent / "node_modules" / ".bin" / "tsx")
    if not Path(tsx_bin).exists():
        # Fallback to npx tsx
        process = await asyncio.create_subprocess_exec(
            "npx", "tsx", str(script_path), operation, json.dumps(data),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(app_state.api_root),
        )
    else:
        process = await asyncio.create_subprocess_exec(
            str(tsx_bin),
            str(script_path),
            operation,
            json.dumps(data),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(app_state.api_root),
        )

    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode() if stderr else "Unknown error"
        raise HTTPException(
            status_code=500, detail=f"Contract operation failed: {error_msg}"
        )

    return json.loads(stdout.decode())


# API Endpoints


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "initialized": app_state.contract_address is not None,
        "contract_address": app_state.contract_address,
    }


@app.post("/api/init", response_model=InitResponse, tags=["Contract"])
async def initialize_contract(request: InitRequest):
    """
    Initialize the contract - either deploy a new one or join an existing one

    - **mode**: "deploy" to deploy a new contract, or "join" to connect to existing
    - **contract_address**: Required when mode is "join"
    - **environment**: Network environment (testnet or mainnet)
    """
    try:
        result = await run_ts_contract_operation("init", request.dict())

        if result.get("success"):
            app_state.contract_address = result.get("contract_address")

        return InitResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/submit-audit", response_model=SubmitAuditResponse, tags=["Contract"])
async def submit_audit(request: SubmitAuditRequest):
    """
    Submit an audit with zero-knowledge proof

    - **audit_id**: Unique identifier for the audit (32-byte hex string)
    - **auditor_addr**: Auditor address (32-byte hex string, e.g., Judge agent)
    - **threshold**: Minimum risk score required (e.g., 90)
    - **witness**: Private witness data containing:
        - **exploit_string**: Exploit details (hex string, max 64 bytes)
        - **risk_score**: Actual risk score (integer, private - never revealed on-chain)
    """
    if not app_state.contract_address:
        raise HTTPException(
            status_code=400, detail="Contract not initialized. Call /api/init first."
        )

    try:
        result = await run_ts_contract_operation("submit_audit", request.dict())
        return SubmitAuditResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/query-audit", response_model=QueryAuditResponse, tags=["Contract"])
async def query_audit(request: QueryAuditRequest):
    """
    Query the status of an audit

    - **audit_id**: Audit ID to query
    """
    if not app_state.contract_address:
        raise HTTPException(
            status_code=400, detail="Contract not initialized. Call /api/init first."
        )

    try:
        result = await run_ts_contract_operation("query_audit", request.dict())
        return QueryAuditResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ledger", tags=["Contract"])
async def get_ledger_state():
    """Get the current ledger state"""
    if not app_state.contract_address:
        raise HTTPException(
            status_code=400, detail="Contract not initialized. Call /api/init first."
        )

    try:
        result = await run_ts_contract_operation("get_ledger", {})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Wallet Endpoints


@app.get("/wallet/address", tags=["Wallet"])
async def get_wallet_address():
    """Get the wallet address"""
    try:
        address = await app_state.wallet_utils.get_address()
        return {"address": address}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/wallet/balance", response_model=WalletBalanceResponse, tags=["Wallet"])
async def get_wallet_balance():
    """
    Get wallet balance and coin information

    Returns current balance, available coins, and sync status
    """
    try:
        balance = await app_state.wallet_utils.get_balance()
        return WalletBalanceResponse(**balance)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/wallet/transactions", response_model=TransactionHistoryResponse, tags=["Wallet"]
)
async def get_transaction_history():
    """
    Get wallet transaction history

    Returns all transactions associated with the wallet
    """
    try:
        history = await app_state.wallet_utils.get_transaction_history()
        return TransactionHistoryResponse(**history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/wallet/transaction/{tx_id}", tags=["Wallet"])
async def query_transaction(tx_id: str):
    """
    Query a specific transaction by hash or identifier

    - **tx_id**: Transaction hash or identifier
    """
    try:
        result = await app_state.wallet_utils.query_transaction(tx_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/network/health", response_model=NetworkHealthResponse, tags=["Network"])
async def check_network_health():
    """
    Check Midnight network health

    Returns statistics about recent blocks and transaction success rate
    """
    try:
        health = await app_state.wallet_utils.check_network_health()
        return NetworkHealthResponse(**health)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def main():
    """Run the API server"""
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
