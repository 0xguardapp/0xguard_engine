const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentReputationRegistry", function () {
  let registry;
  let owner;
  let agent1;
  let agent2;

  beforeEach(async function () {
    [owner, agent1, agent2] = await ethers.getSigners();

    const AgentReputationRegistry = await ethers.getContractFactory("AgentReputationRegistry");
    registry = await AgentReputationRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });
  });

  describe("Reputation Updates", function () {
    it("Should update reputation with positive delta", async function () {
      const delta = 100;
      const evidenceURI = "unibase://record/evidence123";

      await expect(registry.updateReputation(agent1.address, delta, evidenceURI))
        .to.emit(registry, "ReputationUpdated")
        .withArgs(agent1.address, 100, evidenceURI);

      const reputation = await registry.getReputation(agent1.address);
      expect(reputation.score).to.equal(100);
      expect(reputation.evidenceURI).to.equal(evidenceURI);
      expect(reputation.lastUpdated).to.be.gt(0);
    });

    it("Should update reputation with negative delta", async function () {
      // First add some reputation
      await registry.updateReputation(agent1.address, 200, "unibase://record/evidence1");
      
      // Then subtract
      const delta = -50;
      const evidenceURI = "unibase://record/evidence2";

      await expect(registry.updateReputation(agent1.address, delta, evidenceURI))
        .to.emit(registry, "ReputationUpdated")
        .withArgs(agent1.address, 150, evidenceURI);

      const reputation = await registry.getReputation(agent1.address);
      expect(reputation.score).to.equal(150);
    });

    it("Should floor reputation at 0", async function () {
      // First add some reputation
      await registry.updateReputation(agent1.address, 50, "unibase://record/evidence1");
      
      // Try to subtract more than current score
      const delta = -100;
      const evidenceURI = "unibase://record/evidence2";

      await expect(registry.updateReputation(agent1.address, delta, evidenceURI))
        .to.emit(registry, "ReputationUpdated")
        .withArgs(agent1.address, 0, evidenceURI);

      const reputation = await registry.getReputation(agent1.address);
      expect(reputation.score).to.equal(0);
    });

    it("Should handle multiple updates correctly", async function () {
      await registry.updateReputation(agent1.address, 100, "unibase://record/evidence1");
      await registry.updateReputation(agent1.address, 50, "unibase://record/evidence2");
      await registry.updateReputation(agent1.address, -30, "unibase://record/evidence3");

      const reputation = await registry.getReputation(agent1.address);
      expect(reputation.score).to.equal(120);
      expect(reputation.evidenceURI).to.equal("unibase://record/evidence3");
    });

    it("Should revert if agent is zero address", async function () {
      await expect(
        registry.updateReputation(ethers.ZeroAddress, 100, "unibase://record/evidence123")
      ).to.be.revertedWith("AgentReputationRegistry: invalid agent address");
    });

    it("Should revert if evidenceURI is empty", async function () {
      await expect(
        registry.updateReputation(agent1.address, 100, "")
      ).to.be.revertedWith("AgentReputationRegistry: evidenceURI cannot be empty");
    });

    it("Should revert if not owner tries to update", async function () {
      await expect(
        registry.connect(agent1).updateReputation(agent2.address, 100, "unibase://record/evidence123")
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("Query Functions", function () {
    it("Should return zero reputation for unregistered agent", async function () {
      const reputation = await registry.getReputation(agent1.address);
      expect(reputation.score).to.equal(0);
      expect(reputation.lastUpdated).to.equal(0);
      expect(reputation.evidenceURI).to.equal("");
      expect(await registry.hasReputation(agent1.address)).to.be.false;
    });

    it("Should return correct reputation score", async function () {
      await registry.updateReputation(agent1.address, 250, "unibase://record/evidence123");
      
      expect(await registry.getReputationScore(agent1.address)).to.equal(250);
      expect(await registry.hasReputation(agent1.address)).to.be.true;
    });
  });

  describe("Batch Updates", function () {
    it("Should update multiple agents in batch", async function () {
      const agents = [agent1.address, agent2.address];
      const deltas = [100, 200];
      const evidenceURIs = ["unibase://record/evidence1", "unibase://record/evidence2"];

      await expect(registry.batchUpdateReputation(agents, deltas, evidenceURIs))
        .to.emit(registry, "ReputationUpdated")
        .withArgs(agent1.address, 100, evidenceURIs[0])
        .and.to.emit(registry, "ReputationUpdated")
        .withArgs(agent2.address, 200, evidenceURIs[1]);

      expect(await registry.getReputationScore(agent1.address)).to.equal(100);
      expect(await registry.getReputationScore(agent2.address)).to.equal(200);
    });

    it("Should revert if array lengths don't match", async function () {
      const agents = [agent1.address, agent2.address];
      const deltas = [100];
      const evidenceURIs = ["unibase://record/evidence1", "unibase://record/evidence2"];

      await expect(
        registry.batchUpdateReputation(agents, deltas, evidenceURIs)
      ).to.be.revertedWith("AgentReputationRegistry: array length mismatch");
    });
  });
});

