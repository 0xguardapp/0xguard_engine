# Configuration Issues Summary

## Critical Security Issues

### 1. Hardcoded API Keys (HIGH PRIORITY)

**Location:** Multiple files have hardcoded API keys with defaults

#### ASI_API_KEY
- **Files:**
  - `agent/judge.py:35`
  - `agent/target.py:24`
  - `agent/red_team.py:25`
- **Issue:** Has hardcoded default value that could be committed to git
- **Fix:** Remove default, require env var

#### AGENTVERSE_KEY
- **Files:**
  - `agent/judge.py:39`
  - `agent/target.py:28`
  - `agent/red_team.py:29`
- **Issue:** Long JWT token hardcoded in source code
- **Fix:** Remove default, require env var

#### MAILBOX_KEY
- **Files:**
  - `agent/judge.py:154`
- **Issue:** Hardcoded mailbox key
- **Fix:** Make optional or require env var

### 2. Hardcoded SECRET_KEY

- **File:** `agent/judge.py:52`
- **Value:** `"fetch_ai_2024"`
- **Issue:** Should use `TARGET_SECRET_KEY` env var instead
- **Fix:** Read from env var or config

---

## Missing Environment Variables

### Not in env.example but used in code:

1. **ASI_API_KEY** - Used but has hardcoded default (should be required)
2. **AGENTVERSE_KEY** - Used but has hardcoded default (should be required)
3. **MAILBOX_KEY** - Has hardcoded default in judge.py
4. **MIDNIGHT_API_URL** - New variable for Midnight FastAPI (default: `http://localhost:8000`)
5. **AGENT_API_URL** - Frontend variable (default: `http://localhost:8003`)

---

## Port Conflicts

### Potential Conflicts:
- Target Agent (8000) and Midnight FastAPI (8000) both default to same port
- Solution: Use different ports or run separately

---

## Database Status

### Current State:
- **No database configured** - uses file-based storage
- Mock data in frontend
- Membase uses internal SQLite (auto-configured)
- **Action:** No action needed unless implementing database integration

---

## Recommendations

### Immediate Actions:
1. Remove all hardcoded API keys from source code
2. Add missing env vars to `agent/env.example`
3. Add validation to fail if required keys are missing
4. Document port conflicts and solutions

### Security Best Practices:
1. Never commit `.env` files
2. Use secrets management in production
3. Rotate API keys regularly
4. Use different keys for dev/staging/prod

