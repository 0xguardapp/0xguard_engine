/**
 * Basic Midnight Network Tests
 * 
 * These tests verify the Midnight development environment setup.
 */

import { describe, it, expect } from "vitest";
import { midnightConfig, validateConfig, getNetworkEndpoints } from "../midnight.config.js";

describe("Midnight Configuration", () => {
  it("should load configuration", () => {
    expect(midnightConfig).toBeDefined();
    expect(midnightConfig.network).toBeDefined();
    expect(midnightConfig.proofServer).toBeDefined();
  });

  it("should have proof server URL", () => {
    expect(midnightConfig.proofServer.url).toBeTruthy();
    expect(midnightConfig.proofServer.url).toContain("http");
  });

  it("should validate configuration", () => {
    expect(() => validateConfig()).not.toThrow();
  });

  it("should return network endpoints", () => {
    const endpoints = getNetworkEndpoints();
    expect(endpoints).toBeDefined();
    expect(endpoints.indexer).toBeTruthy();
    expect(endpoints.node).toBeTruthy();
  });
});

describe("Contract Paths", () => {
  it("should have contract source directory", () => {
    expect(midnightConfig.contracts.sourceDir).toBeDefined();
  });

  it("should have contract build directory", () => {
    expect(midnightConfig.contracts.buildDir).toBeDefined();
  });
});

