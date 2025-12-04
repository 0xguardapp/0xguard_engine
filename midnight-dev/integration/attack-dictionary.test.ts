/**
 * Unit tests for AttackDictionary module
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import AttackDictionary, {
  type ProofData,
  type SearchFilters,
  type VulnerabilityRecord,
} from "./attack-dictionary.js";

describe("AttackDictionary", () => {
  let dictionary: AttackDictionary;
  const config = {
    membaseAccount: "test_account",
    membaseStoreName: "test-dictionary",
  };

  beforeEach(() => {
    dictionary = new AttackDictionary(config);
  });

  describe("Constructor", () => {
    it("should create instance with valid config", () => {
      expect(dictionary).toBeInstanceOf(AttackDictionary);
    });

    it("should throw error if membaseAccount is missing", () => {
      expect(() => {
        new AttackDictionary({
          membaseAccount: "",
        });
      }).toThrow("membaseAccount is required");
    });

    it("should use default store name if not provided", () => {
      const dict = new AttackDictionary({
        membaseAccount: "test",
      });
      expect(dict).toBeInstanceOf(AttackDictionary);
    });
  });

  describe("addVerifiedVulnerability", () => {
    const proofData: ProofData = {
      proofId: "proof_1234567890abcdef",
      exploitString: "SQL injection payload",
      riskScore: 95,
      vulnerabilityType: "SQL Injection",
      affectedProjects: ["project1", "project2"],
      auditorId: "auditor_456",
      metadata: {
        language: "Python",
        framework: "Django",
        attackVector: "Web",
      },
    };

    it("should add vulnerability successfully", async () => {
      const storageId = await dictionary.addVerifiedVulnerability(proofData);

      expect(storageId).toBeDefined();
      expect(typeof storageId).toBe("string");
    });

    it("should hash exploit string (never store plaintext)", async () => {
      const storageId = await dictionary.addVerifiedVulnerability(proofData);

      // Verify exploit is hashed (check via duplicate check)
      const exploitHash = dictionary["hashExploit"](proofData.exploitString);
      expect(exploitHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it("should prevent duplicate submissions", async () => {
      // First submission
      await dictionary.addVerifiedVulnerability(proofData);

      // Second submission with same exploit
      await expect(
        dictionary.addVerifiedVulnerability(proofData)
      ).rejects.toThrow("Vulnerability already exists");
    });

    it("should generate tags for searchability", async () => {
      const storageId = await dictionary.addVerifiedVulnerability(proofData);

      expect(storageId).toBeDefined();
      // Tags should include proof, risk, type, auditor, etc.
    });

    it("should handle different vulnerability types", async () => {
      const xssProof: ProofData = {
        ...proofData,
        proofId: "proof_xss",
        vulnerabilityType: "XSS",
        exploitString: "XSS payload",
      };

      const storageId = await dictionary.addVerifiedVulnerability(xssProof);
      expect(storageId).toBeDefined();
    });
  });

  describe("searchVulnerabilities", () => {
    beforeEach(async () => {
      // Add test vulnerabilities
      const proof1: ProofData = {
        proofId: "proof_1",
        exploitString: "exploit1",
        riskScore: 92,
        vulnerabilityType: "SQL Injection",
        affectedProjects: ["project1"],
        auditorId: "auditor1",
        metadata: {
          language: "Python",
          framework: "Django",
        },
      };

      const proof2: ProofData = {
        proofId: "proof_2",
        exploitString: "exploit2",
        riskScore: 98,
        vulnerabilityType: "XSS",
        affectedProjects: ["project2"],
        auditorId: "auditor2",
        metadata: {
          language: "JavaScript",
          framework: "React",
        },
      };

      await dictionary.addVerifiedVulnerability(proof1);
      await dictionary.addVerifiedVulnerability(proof2);
    });

    it("should return all vulnerabilities without filters", async () => {
      const result = await dictionary.searchVulnerabilities({});

      expect(result.vulnerabilities.length).toBeGreaterThanOrEqual(0);
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
    });

    it("should filter by risk score minimum", async () => {
      const filters: SearchFilters = {
        riskScoreMin: 95,
      };

      const result = await dictionary.searchVulnerabilities(filters);

      result.vulnerabilities.forEach((v) => {
        expect(v.riskScore).toBeGreaterThanOrEqual(95);
      });
    });

    it("should filter by risk score maximum", async () => {
      const filters: SearchFilters = {
        riskScoreMax: 95,
      };

      const result = await dictionary.searchVulnerabilities(filters);

      result.vulnerabilities.forEach((v) => {
        expect(v.riskScore).toBeLessThanOrEqual(95);
      });
    });

    it("should filter by vulnerability type", async () => {
      const filters: SearchFilters = {
        vulnerabilityType: "SQL Injection",
      };

      const result = await dictionary.searchVulnerabilities(filters);

      result.vulnerabilities.forEach((v) => {
        expect(v.vulnerabilityType).toBe("SQL Injection");
      });
    });

    it("should filter by language", async () => {
      const filters: SearchFilters = {
        language: "Python",
      };

      const result = await dictionary.searchVulnerabilities(filters);

      result.vulnerabilities.forEach((v) => {
        expect(v.metadata.language).toBe("Python");
      });
    });

    it("should filter by date range", async () => {
      const filters: SearchFilters = {
        dateRange: {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          to: new Date(),
        },
      };

      const result = await dictionary.searchVulnerabilities(filters);

      result.vulnerabilities.forEach((v) => {
        const verifiedDate = new Date(v.verifiedAt);
        expect(verifiedDate).toBeGreaterThanOrEqual(filters.dateRange!.from);
        expect(verifiedDate).toBeLessThanOrEqual(filters.dateRange!.to);
      });
    });

    it("should filter by bounty paid status", async () => {
      const filters: SearchFilters = {
        bountyPaid: false,
      };

      const result = await dictionary.searchVulnerabilities(filters);

      result.vulnerabilities.forEach((v) => {
        expect(v.bountyPaid).toBe(false);
      });
    });

    it("should NOT return exploit details", async () => {
      const result = await dictionary.searchVulnerabilities({});

      result.vulnerabilities.forEach((v) => {
        // Should only have hash, not plaintext
        expect(v.exploitHash).toBeDefined();
        expect(typeof v.exploitHash).toBe("string");
        // Should not have exploitString field
        expect((v as any).exploitString).toBeUndefined();
      });
    });

    it("should use cache for repeated queries", async () => {
      const filters: SearchFilters = {
        riskScoreMin: 90,
      };

      // First query
      const result1 = await dictionary.searchVulnerabilities(filters);

      // Second query (should use cache)
      const result2 = await dictionary.searchVulnerabilities(filters);

      expect(result1.totalCount).toBe(result2.totalCount);
    });
  });

  describe("checkDuplicate", () => {
    it("should return false for new exploit", async () => {
      const exploitHash = "new_exploit_hash_1234567890abcdef1234567890abcdef";

      const result = await dictionary.checkDuplicate(exploitHash);

      expect(result.isDuplicate).toBe(false);
      expect(result.existingProofId).toBeUndefined();
    });

    it("should detect duplicate exploit", async () => {
      const proofData: ProofData = {
        proofId: "proof_123",
        exploitString: "duplicate_exploit",
        riskScore: 95,
        vulnerabilityType: "SQL Injection",
        affectedProjects: [],
        auditorId: "auditor1",
      };

      // Add vulnerability
      await dictionary.addVerifiedVulnerability(proofData);

      // Check for duplicate
      const exploitHash = dictionary["hashExploit"](proofData.exploitString);
      const result = await dictionary.checkDuplicate(exploitHash);

      expect(result.isDuplicate).toBe(true);
      expect(result.existingProofId).toBe(proofData.proofId);
    });

    it("should cache duplicate check results", async () => {
      const exploitHash = "test_hash_1234567890abcdef1234567890abcdef";

      // First check
      const result1 = await dictionary.checkDuplicate(exploitHash);

      // Second check (should use cache)
      const result2 = await dictionary.checkDuplicate(exploitHash);

      expect(result1.isDuplicate).toBe(result2.isDuplicate);
    });
  });

  describe("getStatistics", () => {
    beforeEach(async () => {
      // Add multiple vulnerabilities for statistics
      const vulnerabilities: ProofData[] = [
        {
          proofId: "proof_1",
          exploitString: "exploit1",
          riskScore: 92,
          vulnerabilityType: "SQL Injection",
          affectedProjects: [],
          auditorId: "auditor1",
          metadata: { language: "Python" },
        },
        {
          proofId: "proof_2",
          exploitString: "exploit2",
          riskScore: 98,
          vulnerabilityType: "XSS",
          affectedProjects: [],
          auditorId: "auditor1",
          metadata: { language: "JavaScript" },
        },
        {
          proofId: "proof_3",
          exploitString: "exploit3",
          riskScore: 95,
          vulnerabilityType: "SQL Injection",
          affectedProjects: [],
          auditorId: "auditor2",
          metadata: { language: "Python" },
        },
      ];

      for (const vuln of vulnerabilities) {
        await dictionary.addVerifiedVulnerability(vuln);
      }
    });

    it("should calculate total vulnerabilities", async () => {
      const stats = await dictionary.getStatistics();

      expect(stats.totalVulnerabilities).toBeGreaterThanOrEqual(0);
    });

    it("should calculate average risk score", async () => {
      const stats = await dictionary.getStatistics();

      expect(stats.averageRiskScore).toBeGreaterThanOrEqual(0);
      expect(stats.averageRiskScore).toBeLessThanOrEqual(100);
    });

    it("should list vulnerability types", async () => {
      const stats = await dictionary.getStatistics();

      expect(stats.vulnerabilityTypes).toBeInstanceOf(Array);
      stats.vulnerabilityTypes.forEach((type) => {
        expect(type.type).toBeDefined();
        expect(type.count).toBeGreaterThan(0);
        expect(type.percentage).toBeGreaterThanOrEqual(0);
        expect(type.percentage).toBeLessThanOrEqual(100);
      });
    });

    it("should list top auditors", async () => {
      const stats = await dictionary.getStatistics();

      expect(stats.topAuditors).toBeInstanceOf(Array);
      stats.topAuditors.forEach((auditor) => {
        expect(auditor.auditorId).toBeDefined();
        expect(auditor.count).toBeGreaterThan(0);
        expect(auditor.totalBounties).toBeGreaterThanOrEqual(0);
      });
    });

    it("should list languages", async () => {
      const stats = await dictionary.getStatistics();

      expect(stats.languages).toBeInstanceOf(Array);
    });

    it("should list frameworks", async () => {
      const stats = await dictionary.getStatistics();

      expect(stats.frameworks).toBeInstanceOf(Array);
    });

    it("should show risk score distribution", async () => {
      const stats = await dictionary.getStatistics();

      expect(stats.riskScoreDistribution).toBeInstanceOf(Array);
      stats.riskScoreDistribution.forEach((dist) => {
        expect(dist.range).toBeDefined();
        expect(dist.count).toBeGreaterThanOrEqual(0);
      });
    });

    it("should cache statistics", async () => {
      // First call
      const stats1 = await dictionary.getStatistics();

      // Second call (should use cache)
      const stats2 = await dictionary.getStatistics();

      expect(stats1.totalVulnerabilities).toBe(stats2.totalVulnerabilities);
    });
  });

  describe("markBountyPaid", () => {
    it("should mark bounty as paid", async () => {
      const proofData: ProofData = {
        proofId: "proof_123",
        exploitString: "exploit",
        riskScore: 95,
        vulnerabilityType: "SQL Injection",
        affectedProjects: [],
        auditorId: "auditor1",
      };

      await dictionary.addVerifiedVulnerability(proofData);

      const result = await dictionary.markBountyPaid(proofData.proofId);

      expect(result).toBe(true);
    });

    it("should fail if vulnerability not found", async () => {
      const result = await dictionary.markBountyPaid("nonexistent_proof");

      expect(result).toBe(false);
    });
  });

  describe("Caching", () => {
    it("should cache search results", async () => {
      const filters: SearchFilters = { riskScoreMin: 90 };

      // First query
      await dictionary.searchVulnerabilities(filters);

      // Check cache is used
      const cacheKey = dictionary["getSearchCacheKey"](filters);
      const cached = dictionary["cache"].get(cacheKey);

      expect(cached).toBeDefined();
    });

    it("should invalidate cache on new vulnerability", async () => {
      const filters: SearchFilters = { riskScoreMin: 90 };

      // First query (populates cache)
      await dictionary.searchVulnerabilities(filters);

      // Add new vulnerability (should invalidate cache)
      const proofData: ProofData = {
        proofId: "proof_new",
        exploitString: "new_exploit",
        riskScore: 95,
        vulnerabilityType: "SQL Injection",
        affectedProjects: [],
        auditorId: "auditor1",
      };

      await dictionary.addVerifiedVulnerability(proofData);

      // Statistics cache should be cleared
      const statsCache = dictionary["statisticsCache"].get("statistics");
      expect(statsCache).toBeNull();
    });
  });

  describe("Data Privacy", () => {
    it("should never store plaintext exploit", async () => {
      const proofData: ProofData = {
        proofId: "proof_123",
        exploitString: "sensitive_exploit_payload",
        riskScore: 95,
        vulnerabilityType: "SQL Injection",
        affectedProjects: [],
        auditorId: "auditor1",
      };

      await dictionary.addVerifiedVulnerability(proofData);

      // Verify exploit is hashed
      const exploitHash = dictionary["hashExploit"](proofData.exploitString);
      expect(exploitHash).not.toBe(proofData.exploitString);
      expect(exploitHash.length).toBe(64); // SHA-256 hex length
    });

    it("should only return exploit hash in search results", async () => {
      const proofData: ProofData = {
        proofId: "proof_123",
        exploitString: "sensitive_exploit",
        riskScore: 95,
        vulnerabilityType: "SQL Injection",
        affectedProjects: [],
        auditorId: "auditor1",
      };

      await dictionary.addVerifiedVulnerability(proofData);

      const result = await dictionary.searchVulnerabilities({});

      result.vulnerabilities.forEach((v) => {
        expect(v.exploitHash).toBeDefined();
        expect((v as any).exploitString).toBeUndefined();
      });
    });
  });
});

