#!/usr/bin/env node
/**
 * Verify Midnight Devnet is Running
 * 
 * This script checks if the Midnight proof server is running and accessible.
 */

import http from "http";
import { midnightConfig } from "../midnight.config.js";

const PROOF_SERVER_URL = midnightConfig.proofServer.url;
const TIMEOUT = 5000; // 5 seconds

/**
 * Check if proof server is accessible
 */
async function checkProofServer() {
  return new Promise((resolve) => {
    const url = new URL(PROOF_SERVER_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 6300,
      path: "/health",
      method: "GET",
      timeout: TIMEOUT,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          // 404 is OK - means server is running but endpoint doesn't exist
          resolve({ success: true, status: res.statusCode });
        } else {
          resolve({ success: false, status: res.statusCode, error: "Unexpected status code" });
        }
      });
    });

    req.on("error", (error) => {
      resolve({ success: false, error: error.message });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ success: false, error: "Request timeout" });
    });

    req.end();
  });
}

/**
 * Check if Docker container is running
 */
async function checkDockerContainer() {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync("docker ps --filter name=midnight-devnet --format '{{.Names}}'");
    const isRunning = stdout.trim() === "midnight-devnet";
    return { success: isRunning, running: isRunning };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Main verification function
 */
async function verifyDevnet() {
  console.log("🌙 Verifying Midnight Devnet...\n");

  // Check Docker container
  console.log("1. Checking Docker container...");
  const containerCheck = await checkDockerContainer();
  if (containerCheck.success && containerCheck.running) {
    console.log("   ✅ Docker container 'midnight-devnet' is running");
  } else {
    console.log("   ⚠️  Docker container 'midnight-devnet' is not running");
    console.log("      Run: npm run devnet:start");
  }

  // Check proof server
  console.log("\n2. Checking proof server...");
  console.log(`   URL: ${PROOF_SERVER_URL}`);
  const serverCheck = await checkProofServer();
  if (serverCheck.success) {
    console.log("   ✅ Proof server is accessible");
    console.log(`   Status: ${serverCheck.status || "OK"}`);
  } else {
    console.log("   ❌ Proof server is not accessible");
    console.log(`   Error: ${serverCheck.error || "Connection failed"}`);
    console.log("\n   Troubleshooting:");
    console.log("   - Ensure Docker is running");
    console.log("   - Start devnet: npm run devnet:start");
    console.log("   - Check logs: npm run devnet:logs");
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  if (containerCheck.running && serverCheck.success) {
    console.log("✅ Midnight Devnet is running and ready!");
    process.exit(0);
  } else {
    console.log("❌ Midnight Devnet is not properly configured");
    console.log("\nTo start the devnet:");
    console.log("  npm run devnet:start");
    process.exit(1);
  }
}

// Run verification
verifyDevnet().catch((error) => {
  console.error("Error verifying devnet:", error);
  process.exit(1);
});

