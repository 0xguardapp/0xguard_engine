# Global Attack Dictionary

## Overview

The `AttackDictionary` class provides a secure, privacy-preserving storage system for verified vulnerabilities using Unibase Membase. It stores vulnerability information without revealing exploit details.

## Features

- ✅ **Privacy-Preserving**: Never stores plaintext exploits (only hashes)
- ✅ **Membase Integration**: Uses Membase MCP for persistent storage
- ✅ **Caching**: Intelligent caching for frequently accessed data
- ✅ **Search**: Advanced filtering and search capabilities
- ✅ **Duplicate Prevention**: Prevents duplicate vulnerability submissions
- ✅ **Statistics**: Comprehensive statistics and analytics
- ✅ **Tagging**: Automatic tagging for searchability

## Data Structure

```typescript
{
  proofId: string,              // Unique identifier
  exploitHash: string,          // SHA-256 of exploit_string (never plaintext)
  riskScore: number,            // Revealed after verification
  vulnerabilityType: string,    // e.g., "SQL Injection", "XSS"
  affectedProjects: string[],   // List of affected projects
  discoveredAt: Date,          // When vulnerability was discovered
  verifiedAt: Date,            // When ZK proof was verified
  auditorId: string,           // Auditor identifier
  bountyPaid: boolean,         // Whether bounty was paid
  metadata: {
    language?: string,         // e.g., "Python", "JavaScript"
    framework?: string,        // e.g., "Django", "React"
    attackVector?: string,     // e.g., "Web", "API"
    [key: string]: any
  }
}
```

## Installation

```bash
cd midnight-dev
npm install
```

## Usage

### Basic Setup

```typescript
import AttackDictionary from "./integration/attack-dictionary.js";

const dictionary = new AttackDictionary({
  membaseAccount: "your_membase_account",
  membaseStoreName: "0xguard-attack-dictionary", // Optional
  cacheEnabled: true,                            // Optional, default: true
  cacheTTL: 300000,                              // Optional, 5 minutes
  maxCacheSize: 1000,                            // Optional
});
```

### Add Verified Vulnerability

```typescript
const proofData = {
  proofId: "proof_1234567890abcdef",
  exploitString: "SQL injection payload", // Will be hashed
  riskScore: 95,
  vulnerabilityType: "SQL Injection",
  affectedProjects: ["project1", "project2"],
  auditorId: "agent1...",
  metadata: {
    language: "Python",
    framework: "Django",
    attackVector: "Web",
  },
};

const storageId = await dictionary.addVerifiedVulnerability(proofData);
console.log(`✅ Stored with ID: ${storageId}`);
```

### Search Vulnerabilities

```typescript
// Search with filters
const filters = {
  riskScoreMin: 90,
  vulnerabilityType: "SQL Injection",
  language: "Python",
  dateRange: {
    from: new Date("2024-01-01"),
    to: new Date(),
  },
};

const result = await dictionary.searchVulnerabilities(filters);

console.log(`Found ${result.totalCount} vulnerabilities`);
result.vulnerabilities.forEach((v) => {
  console.log(`  - ${v.proofId}: ${v.vulnerabilityType} (Risk: ${v.riskScore})`);
  // Note: exploitHash is available, but NOT exploitString
});
```

### Check for Duplicates

```typescript
// Before adding, check for duplicates
const exploitHash = "0xabcdef123456..."; // SHA-256 hash

const duplicateCheck = await dictionary.checkDuplicate(exploitHash);

if (duplicateCheck.isDuplicate) {
  console.log(`⚠️  Duplicate found: ${duplicateCheck.existingProofId}`);
} else {
  console.log(`✅ New vulnerability`);
}
```

### Get Statistics

```typescript
const stats = await dictionary.getStatistics();

console.log(`Total Vulnerabilities: ${stats.totalVulnerabilities}`);
console.log(`Average Risk Score: ${stats.averageRiskScore.toFixed(2)}`);

console.log("\nVulnerability Types:");
stats.vulnerabilityTypes.forEach((type) => {
  console.log(`  ${type.type}: ${type.count} (${type.percentage.toFixed(1)}%)`);
});

console.log("\nTop Auditors:");
stats.topAuditors.forEach((auditor) => {
  console.log(`  ${auditor.auditorId}: ${auditor.count} vulnerabilities`);
});
```

### Mark Bounty as Paid

```typescript
const success = await dictionary.markBountyPaid("proof_123");

if (success) {
  console.log("✅ Bounty status updated");
}
```

## Search Filters

Available filters for `searchVulnerabilities()`:

```typescript
interface SearchFilters {
  riskScoreMin?: number;        // Minimum risk score
  riskScoreMax?: number;        // Maximum risk score
  vulnerabilityType?: string;    // Exact type match
  language?: string;            // Programming language
  framework?: string;           // Framework name
  attackVector?: string;        // Attack vector
  dateRange?: {                 // Date range filter
    from: Date;
    to: Date;
  };
  auditorId?: string;           // Filter by auditor
  bountyPaid?: boolean;         // Filter by bounty status
}
```

## Privacy & Security

### Exploit Hashing

- **Never stores plaintext exploits**
- Uses SHA-256 hashing
- Only hash is stored and returned in searches
- Original exploit string cannot be recovered

### Data Access

- Search results never include exploit strings
- Only exploit hash is available
- Metadata is safe to return (language, framework, etc.)
- Risk scores are revealed (part of verification)

## Caching

The dictionary includes intelligent caching:

- **Search Results**: Cached for 5 minutes (configurable)
- **Statistics**: Cached for 1 minute
- **Duplicate Checks**: Cached for 1 minute
- **Auto-Invalidation**: Cache cleared when new vulnerabilities added

### Cache Configuration

```typescript
const dictionary = new AttackDictionary({
  membaseAccount: "account",
  cacheEnabled: true,      // Enable/disable caching
  cacheTTL: 300000,        // Cache time-to-live (ms)
  maxCacheSize: 1000,      // Maximum cache entries
});
```

## Membase Integration

### Storage

Vulnerabilities are stored in Membase with:
- **Key**: `vulnerability:{proofId}`
- **Tags**: Automatically generated for searchability
- **Format**: JSON with all vulnerability data (except exploit string)

### Tags

Automatic tags include:
- `proof:{proofId}`
- `risk:{riskScore}`
- `type:{vulnerabilityType}`
- `auditor:{auditorId}`
- `bounty:{paid|unpaid}`
- `lang:{language}`
- `framework:{framework}`
- `vector:{attackVector}`
- `project:{projectName}`

### Querying

Membase queries are optimized for:
- Fast lookups by proofId
- Filtering by tags
- Range queries for risk scores
- Date range filtering

## Statistics

The `getStatistics()` method provides:

- **Total Vulnerabilities**: Count of all stored vulnerabilities
- **Average Risk Score**: Mean risk score across all vulnerabilities
- **Vulnerability Types**: Breakdown by type with counts and percentages
- **Top Auditors**: Top 10 auditors by vulnerability count
- **Languages**: Distribution by programming language
- **Frameworks**: Distribution by framework
- **Risk Score Distribution**: Counts by risk score ranges

## Error Handling

All methods include comprehensive error handling:

```typescript
try {
  const storageId = await dictionary.addVerifiedVulnerability(proofData);
  console.log(`Stored: ${storageId}`);
} catch (error) {
  if (error.message.includes("already exists")) {
    console.error("Duplicate vulnerability");
  } else {
    console.error("Storage failed:", error);
  }
}
```

## Testing

Run unit tests:

```bash
npm run test integration/attack-dictionary.test.ts
```

Test coverage includes:
- ✅ Adding vulnerabilities
- ✅ Exploit hashing
- ✅ Duplicate prevention
- ✅ Search filtering
- ✅ Statistics calculation
- ✅ Caching behavior
- ✅ Privacy (no plaintext storage)

## API Reference

### `addVerifiedVulnerability(proofData)`

Add verified vulnerability to dictionary.

**Input:**
```typescript
{
  proofId: string;
  exploitString: string;      // Will be hashed
  riskScore: number;
  vulnerabilityType: string;
  affectedProjects: string[];
  auditorId: string;
  metadata?: object;
}
```

**Output:** `storageId: string`

### `searchVulnerabilities(filters)`

Search vulnerabilities with filters.

**Input:** `SearchFilters` (see above)

**Output:**
```typescript
{
  vulnerabilities: VulnerabilityRecord[];
  totalCount: number;
  hasMore: boolean;
}
```

### `checkDuplicate(exploitHash)`

Check for duplicate vulnerability.

**Input:** `exploitHash: string` (SHA-256 hash)

**Output:**
```typescript
{
  isDuplicate: boolean;
  existingProofId?: string;
  existingRecord?: VulnerabilityRecord;
}
```

### `getStatistics()`

Get dictionary statistics.

**Output:** `DictionaryStatistics` (see above)

### `markBountyPaid(proofId)`

Mark bounty as paid for vulnerability.

**Input:** `proofId: string`

**Output:** `success: boolean`

## Best Practices

1. **Always hash exploits** before checking duplicates
2. **Use filters** to narrow search results
3. **Cache statistics** for dashboard views
4. **Tag vulnerabilities** with relevant metadata
5. **Never log exploit strings** in production

## Troubleshooting

### "Vulnerability already exists"
- Check for duplicates before adding
- Use `checkDuplicate()` first

### "Membase storage failed"
- Verify Membase account is configured
- Check network connectivity
- Ensure Membase store exists

### Cache not working
- Check `cacheEnabled` is true
- Verify cache size limits
- Check TTL settings

## Production Considerations

1. **Security**:
   - Never log exploit strings
   - Use secure Membase credentials
   - Enable rate limiting

2. **Performance**:
   - Use caching for frequent queries
   - Index frequently searched fields
   - Paginate large result sets

3. **Scalability**:
   - Use Membase clustering
   - Implement pagination
   - Cache statistics aggressively

4. **Privacy**:
   - Never return exploit strings
   - Only return hashes
   - Audit access logs

## Support

For issues or questions:
- Check [README.md](../README.md)
- Review test files for examples
- See Membase documentation

