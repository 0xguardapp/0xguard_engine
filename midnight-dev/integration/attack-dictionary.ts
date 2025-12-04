/**
 * Global Attack Dictionary
 * 
 * Stores verified vulnerabilities in Unibase Membase without revealing exploit details.
 * Uses Membase MCP integration for persistent storage.
 */

import { createHash } from "crypto";
import { createClient } from "@midnight-ntwrk/midnight-js-level-private-state-provider";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface VulnerabilityRecord {
  proofId: string;
  exploitHash: string; // SHA-256 of exploit_string (never plaintext)
  riskScore: number;
  vulnerabilityType: string;
  affectedProjects: string[];
  discoveredAt: Date;
  verifiedAt: Date;
  auditorId: string;
  bountyPaid: boolean;
  metadata: {
    language?: string;
    framework?: string;
    attackVector?: string;
    [key: string]: any;
  };
}

export interface ProofData {
  proofId: string;
  exploitString: string; // Will be hashed before storage
  riskScore: number;
  vulnerabilityType: string;
  affectedProjects: string[];
  auditorId: string;
  metadata?: {
    language?: string;
    framework?: string;
    attackVector?: string;
    [key: string]: any;
  };
}

export interface SearchFilters {
  riskScoreMin?: number;
  riskScoreMax?: number;
  vulnerabilityType?: string;
  language?: string;
  framework?: string;
  attackVector?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  auditorId?: string;
  bountyPaid?: boolean;
}

export interface SearchResult {
  vulnerabilities: VulnerabilityRecord[];
  totalCount: number;
  hasMore: boolean;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingProofId?: string;
  existingRecord?: VulnerabilityRecord;
}

export interface DictionaryStatistics {
  totalVulnerabilities: number;
  averageRiskScore: number;
  vulnerabilityTypes: {
    type: string;
    count: number;
    percentage: number;
  }[];
  topAuditors: {
    auditorId: string;
    count: number;
    totalBounties: number;
  }[];
  languages: {
    language: string;
    count: number;
  }[];
  frameworks: {
    framework: string;
    count: number;
  }[];
  riskScoreDistribution: {
    range: string;
    count: number;
  }[];
}

// ============================================================================
// Configuration
// ============================================================================

interface AttackDictionaryConfig {
  membaseAccount: string;
  membaseStoreName?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number; // Time to live in milliseconds
  maxCacheSize?: number;
}

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 300000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  set(key: K, value: V, ttl?: number): void {
    // Evict expired entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictExpired();
      // If still full, remove oldest entry
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get(key: K): V | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: K): boolean {
    return this.get(key) !== null;
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    this.evictExpired();
    return this.cache.size;
  }
}

// ============================================================================
// AttackDictionary Class
// ============================================================================

export class AttackDictionary {
  private config: AttackDictionaryConfig;
  private membaseClient: any; // Membase client instance
  private cache: SimpleCache<string, any>;
  private statisticsCache: SimpleCache<string, DictionaryStatistics>;

  constructor(config: AttackDictionaryConfig) {
    this.config = {
      membaseStoreName: "0xguard-attack-dictionary",
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      maxCacheSize: 1000,
      ...config,
    };

    if (!this.config.membaseAccount) {
      throw new Error("membaseAccount is required");
    }

    // Initialize cache
    this.cache = new SimpleCache(
      this.config.maxCacheSize,
      this.config.cacheTTL
    );
    this.statisticsCache = new SimpleCache(10, 60000); // 1 minute for stats

    // Initialize Membase client
    this.initializeMembase();
  }

  // ============================================================================
  // Main Methods
  // ============================================================================

  /**
   * Add verified vulnerability to dictionary.
   * Stores in Membase after ZK verification.
   * Hashes the exploit_string (never stores plaintext).
   * Tags for searchability.
   */
  async addVerifiedVulnerability(proofData: ProofData): Promise<string> {
    try {
      console.log(`📚 Adding vulnerability to dictionary: ${proofData.proofId.substring(0, 16)}...`);

      // Step 1: Hash the exploit string (never store plaintext)
      const exploitHash = this.hashExploit(proofData.exploitString);

      // Step 2: Check for duplicates
      const duplicateCheck = await this.checkDuplicate(exploitHash);
      if (duplicateCheck.isDuplicate) {
        console.log(`⚠️  Duplicate vulnerability detected: ${duplicateCheck.existingProofId}`);
        throw new Error(`Vulnerability already exists: ${duplicateCheck.existingProofId}`);
      }

      // Step 3: Create vulnerability record
      const record: VulnerabilityRecord = {
        proofId: proofData.proofId,
        exploitHash,
        riskScore: proofData.riskScore,
        vulnerabilityType: proofData.vulnerabilityType,
        affectedProjects: proofData.affectedProjects || [],
        discoveredAt: new Date(), // Could be passed in proofData
        verifiedAt: new Date(),
        auditorId: proofData.auditorId,
        bountyPaid: false, // Will be updated when bounty is paid
        metadata: proofData.metadata || {},
      };

      // Step 4: Generate tags for searchability
      const tags = this.generateTags(record);

      // Step 5: Store in Membase
      const storageId = await this.storeInMembase(record, tags);

      // Step 6: Invalidate relevant caches
      this.invalidateCaches();

      console.log(`✅ Vulnerability stored. Storage ID: ${storageId}`);
      console.log(`   Exploit Hash: ${exploitHash.substring(0, 16)}...`);
      console.log(`   Risk Score: ${proofData.riskScore}`);
      console.log(`   Type: ${proofData.vulnerabilityType}`);

      return storageId;
    } catch (error) {
      console.error(`❌ Failed to add vulnerability:`, error);
      throw error;
    }
  }

  /**
   * Search vulnerabilities with filters.
   * Does NOT return exploit details.
   */
  async searchVulnerabilities(filters: SearchFilters = {}): Promise<SearchResult> {
    try {
      console.log(`🔍 Searching vulnerabilities with filters...`);

      // Check cache first
      const cacheKey = this.getSearchCacheKey(filters);
      if (this.config.cacheEnabled) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          console.log(`   Using cached results`);
          return cached;
        }
      }

      // Query Membase
      const query = this.buildSearchQuery(filters);
      const records = await this.queryMembase<VulnerabilityRecord>(query);

      // Apply filters
      let filtered = records;

      // Filter by risk score
      if (filters.riskScoreMin !== undefined) {
        filtered = filtered.filter((r) => r.riskScore >= filters.riskScoreMin!);
      }
      if (filters.riskScoreMax !== undefined) {
        filtered = filtered.filter((r) => r.riskScore <= filters.riskScoreMax!);
      }

      // Filter by date range
      if (filters.dateRange) {
        filtered = filtered.filter((r) => {
          const verifiedDate = new Date(r.verifiedAt);
          return (
            verifiedDate >= filters.dateRange!.from &&
            verifiedDate <= filters.dateRange!.to
          );
        });
      }

      // Filter by bounty paid
      if (filters.bountyPaid !== undefined) {
        filtered = filtered.filter((r) => r.bountyPaid === filters.bountyPaid);
      }

      // Remove exploit details (only return hash)
      const sanitized = filtered.map((r) => ({
        ...r,
        // exploitHash is already hashed, so it's safe to return
      }));

      const result: SearchResult = {
        vulnerabilities: sanitized,
        totalCount: sanitized.length,
        hasMore: false, // Could implement pagination
      };

      // Cache result
      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, result);
      }

      console.log(`✅ Found ${result.totalCount} vulnerabilities`);

      return result;
    } catch (error) {
      console.error(`❌ Search failed:`, error);
      return {
        vulnerabilities: [],
        totalCount: 0,
        hasMore: false,
      };
    }
  }

  /**
   * Check for duplicate vulnerability by exploit hash.
   * Prevents duplicate submissions.
   */
  async checkDuplicate(exploitHash: string): Promise<DuplicateCheckResult> {
    try {
      console.log(`🔍 Checking for duplicate: ${exploitHash.substring(0, 16)}...`);

      // Check cache first
      const cacheKey = `duplicate:${exploitHash}`;
      if (this.config.cacheEnabled) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Query Membase for matching hash
      const query = {
        query: {
          exploitHash,
        },
        limit: 1,
      };

      const records = await this.queryMembase<VulnerabilityRecord>(query);

      if (records.length > 0) {
        const result: DuplicateCheckResult = {
          isDuplicate: true,
          existingProofId: records[0].proofId,
          existingRecord: records[0],
        };

        // Cache result
        if (this.config.cacheEnabled) {
          this.cache.set(cacheKey, result);
        }

        return result;
      }

      const result: DuplicateCheckResult = {
        isDuplicate: false,
      };

      // Cache negative result (shorter TTL)
      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, result, 60000); // 1 minute
      }

      return result;
    } catch (error) {
      console.error(`❌ Duplicate check failed:`, error);
      // Fail open - allow submission if check fails
      return {
        isDuplicate: false,
      };
    }
  }

  /**
   * Get dictionary statistics.
   * Cached for performance.
   */
  async getStatistics(): Promise<DictionaryStatistics> {
    try {
      console.log(`📊 Calculating dictionary statistics...`);

      // Check cache
      const cacheKey = "statistics";
      if (this.config.cacheEnabled) {
        const cached = this.statisticsCache.get(cacheKey);
        if (cached) {
          console.log(`   Using cached statistics`);
          return cached;
        }
      }

      // Query all records
      const allRecords = await this.queryMembase<VulnerabilityRecord>({
        query: {},
        limit: 10000, // Adjust based on expected size
      });

      // Calculate statistics
      const stats = this.calculateStatistics(allRecords);

      // Cache statistics
      if (this.config.cacheEnabled) {
        this.statisticsCache.set(cacheKey, stats);
      }

      console.log(`✅ Statistics calculated`);
      console.log(`   Total: ${stats.totalVulnerabilities}`);
      console.log(`   Avg Risk Score: ${stats.averageRiskScore.toFixed(2)}`);

      return stats;
    } catch (error) {
      console.error(`❌ Statistics calculation failed:`, error);
      return this.getEmptyStatistics();
    }
  }

  /**
   * Update bounty paid status for a vulnerability.
   */
  async markBountyPaid(proofId: string): Promise<boolean> {
    try {
      console.log(`💰 Marking bounty as paid: ${proofId.substring(0, 16)}...`);

      // Get existing record
      const query = {
        query: {
          proofId,
        },
        limit: 1,
      };

      const records = await this.queryMembase<VulnerabilityRecord>(query);
      if (records.length === 0) {
        throw new Error(`Vulnerability not found: ${proofId}`);
      }

      const record = records[0];
      record.bountyPaid = true;

      // Update in Membase
      const tags = this.generateTags(record);
      await this.storeInMembase(record, tags, true); // Update mode

      // Invalidate caches
      this.invalidateCaches();

      console.log(`✅ Bounty status updated`);

      return true;
    } catch (error) {
      console.error(`❌ Failed to update bounty status:`, error);
      return false;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Hash exploit string using SHA-256.
   */
  private hashExploit(exploitString: string): string {
    return createHash("sha256").update(exploitString).digest("hex");
  }

  /**
   * Generate tags for Membase storage.
   */
  private generateTags(record: VulnerabilityRecord): string[] {
    const tags: string[] = [
      `proof:${record.proofId}`,
      `risk:${record.riskScore}`,
      `type:${record.vulnerabilityType}`,
      `auditor:${record.auditorId}`,
      `bounty:${record.bountyPaid ? "paid" : "unpaid"}`,
    ];

    if (record.metadata.language) {
      tags.push(`lang:${record.metadata.language}`);
    }
    if (record.metadata.framework) {
      tags.push(`framework:${record.metadata.framework}`);
    }
    if (record.metadata.attackVector) {
      tags.push(`vector:${record.metadata.attackVector}`);
    }

    // Add project tags
    record.affectedProjects.forEach((project) => {
      tags.push(`project:${project}`);
    });

    return tags;
  }

  /**
   * Build search query from filters.
   */
  private buildSearchQuery(filters: SearchFilters): any {
    const query: any = {};

    if (filters.vulnerabilityType) {
      query.vulnerabilityType = filters.vulnerabilityType;
    }
    if (filters.language) {
      query["metadata.language"] = filters.language;
    }
    if (filters.framework) {
      query["metadata.framework"] = filters.framework;
    }
    if (filters.attackVector) {
      query["metadata.attackVector"] = filters.attackVector;
    }
    if (filters.auditorId) {
      query.auditorId = filters.auditorId;
    }
    if (filters.bountyPaid !== undefined) {
      query.bountyPaid = filters.bountyPaid;
    }

    return { query, limit: 1000 };
  }

  /**
   * Calculate statistics from records.
   */
  private calculateStatistics(records: VulnerabilityRecord[]): DictionaryStatistics {
    if (records.length === 0) {
      return this.getEmptyStatistics();
    }

    // Total count
    const totalVulnerabilities = records.length;

    // Average risk score
    const averageRiskScore =
      records.reduce((sum, r) => sum + r.riskScore, 0) / totalVulnerabilities;

    // Vulnerability types
    const typeCounts = new Map<string, number>();
    records.forEach((r) => {
      typeCounts.set(r.vulnerabilityType, (typeCounts.get(r.vulnerabilityType) || 0) + 1);
    });
    const vulnerabilityTypes = Array.from(typeCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / totalVulnerabilities) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Top auditors
    const auditorCounts = new Map<string, { count: number; bounties: number }>();
    records.forEach((r) => {
      const existing = auditorCounts.get(r.auditorId) || { count: 0, bounties: 0 };
      existing.count++;
      if (r.bountyPaid) {
        existing.bounties++;
      }
      auditorCounts.set(r.auditorId, existing);
    });
    const topAuditors = Array.from(auditorCounts.entries())
      .map(([auditorId, data]) => ({
        auditorId,
        count: data.count,
        totalBounties: data.bounties,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Languages
    const languageCounts = new Map<string, number>();
    records.forEach((r) => {
      if (r.metadata.language) {
        languageCounts.set(
          r.metadata.language,
          (languageCounts.get(r.metadata.language) || 0) + 1
        );
      }
    });
    const languages = Array.from(languageCounts.entries())
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    // Frameworks
    const frameworkCounts = new Map<string, number>();
    records.forEach((r) => {
      if (r.metadata.framework) {
        frameworkCounts.set(
          r.metadata.framework,
          (frameworkCounts.get(r.metadata.framework) || 0) + 1
        );
      }
    });
    const frameworks = Array.from(frameworkCounts.entries())
      .map(([framework, count]) => ({ framework, count }))
      .sort((a, b) => b.count - a.count);

    // Risk score distribution
    const ranges = [
      { name: "90-92", min: 90, max: 92 },
      { name: "93-95", min: 93, max: 95 },
      { name: "96-98", min: 96, max: 98 },
      { name: "99-100", min: 99, max: 100 },
    ];
    const riskScoreDistribution = ranges.map((range) => ({
      range: range.name,
      count: records.filter((r) => r.riskScore >= range.min && r.riskScore <= range.max).length,
    }));

    return {
      totalVulnerabilities,
      averageRiskScore,
      vulnerabilityTypes,
      topAuditors,
      languages,
      frameworks,
      riskScoreDistribution,
    };
  }

  /**
   * Get empty statistics structure.
   */
  private getEmptyStatistics(): DictionaryStatistics {
    return {
      totalVulnerabilities: 0,
      averageRiskScore: 0,
      vulnerabilityTypes: [],
      topAuditors: [],
      languages: [],
      frameworks: [],
      riskScoreDistribution: [],
    };
  }

  /**
   * Get cache key for search query.
   */
  private getSearchCacheKey(filters: SearchFilters): string {
    return `search:${JSON.stringify(filters)}`;
  }

  /**
   * Invalidate relevant caches.
   */
  private invalidateCaches(): void {
    // Clear statistics cache
    this.statisticsCache.clear();

    // Clear search caches (could be more selective)
    // For simplicity, clear all search caches
    // In production, could implement more granular invalidation
  }

  // ============================================================================
  // Membase Integration
  // ============================================================================

  /**
   * Initialize Membase client.
   */
  private initializeMembase(): void {
    try {
      // In production, use actual Membase SDK
      // For now, use placeholder
      this.membaseClient = {
        store: this.config.membaseStoreName,
        account: this.config.membaseAccount,
      };
      console.log(`✅ Membase initialized: ${this.config.membaseStoreName}`);
    } catch (error) {
      console.error(`❌ Membase initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Store record in Membase.
   */
  private async storeInMembase(
    record: VulnerabilityRecord,
    tags: string[],
    update: boolean = false
  ): Promise<string> {
    try {
      // In production, use actual Membase SDK
      // Example: await membaseClient.store(key, record, { tags })

      const key = `vulnerability:${record.proofId}`;
      const storageId = createHash("sha256")
        .update(`${key}${JSON.stringify(record)}`)
        .digest("hex")
        .substring(0, 16);

      // Log storage operation
      console.log(`   Storing in Membase: ${key}`);
      console.log(`   Tags: ${tags.join(", ")}`);

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
      // Example: await membaseClient.query(query)

      // For now, return empty array
      // In production, this would query Membase and return results
      return [];
    } catch (error) {
      console.error(`Membase query error:`, error);
      return [];
    }
  }
}

// ============================================================================
// Export
// ============================================================================

export default AttackDictionary;

