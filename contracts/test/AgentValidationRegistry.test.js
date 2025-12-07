const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentValidationRegistry", function () {
  let registry;
  let owner;
  let agent1;
  let agent2;
  let agent3;

  beforeEach(async function () {
    [owner, agent1, agent2, agent3] = await ethers.getSigners();

    const AgentValidationRegistry = await ethers.getContractFactory("AgentValidationRegistry");
    registry = await AgentValidationRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("Should initialize agents as not validated", async function () {
      expect(await registry.isValidAgent(agent1.address)).to.be.false;
      const [valid, evidenceURI] = await registry.getValidation(agent1.address);
      expect(valid).to.be.false;
      expect(evidenceURI).to.equal("");
    });
  });

  describe("Agent Validation", function () {
    it("Should validate an agent", async function () {
      const evidenceURI = "unibase://record/validation123";

      await expect(registry.validateAgent(agent1.address, evidenceURI))
        .to.emit(registry, "AgentValidated")
        .withArgs(agent1.address, evidenceURI);

      expect(await registry.isValidAgent(agent1.address)).to.be.true;
      expect(await registry.validationEvidenceURI(agent1.address)).to.equal(evidenceURI);

      const [valid, uri] = await registry.getValidation(agent1.address);
      expect(valid).to.be.true;
      expect(uri).to.equal(evidenceURI);
    });

    it("Should allow re-validation with new evidence", async function () {
      const evidenceURI1 = "unibase://record/validation123";
      const evidenceURI2 = "unibase://record/validation456";

      await registry.validateAgent(agent1.address, evidenceURI1);
      expect(await registry.isValidAgent(agent1.address)).to.be.true;

      // Re-validate with new evidence
      await expect(registry.validateAgent(agent1.address, evidenceURI2))
        .to.emit(registry, "AgentValidated")
        .withArgs(agent1.address, evidenceURI2);

      expect(await registry.validationEvidenceURI(agent1.address)).to.equal(evidenceURI2);
    });

    it("Should revert if agent is zero address", async function () {
      await expect(
        registry.validateAgent(ethers.ZeroAddress, "unibase://record/validation123")
      ).to.be.revertedWith("AgentValidationRegistry: invalid agent address");
    });

    it("Should revert if evidenceURI is empty", async function () {
      await expect(
        registry.validateAgent(agent1.address, "")
      ).to.be.revertedWith("AgentValidationRegistry: evidenceURI cannot be empty");
    });

    it("Should revert if not owner tries to validate", async function () {
      await expect(
        registry.connect(agent1).validateAgent(agent2.address, "unibase://record/validation123")
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("Agent Revocation", function () {
    beforeEach(async function () {
      await registry.validateAgent(agent1.address, "unibase://record/validation123");
    });

    it("Should revoke an agent's validation", async function () {
      await expect(registry.revokeAgent(agent1.address))
        .to.emit(registry, "AgentRevoked")
        .withArgs(agent1.address);

      expect(await registry.isValidAgent(agent1.address)).to.be.false;
      expect(await registry.validationEvidenceURI(agent1.address)).to.equal("");

      const [valid, evidenceURI] = await registry.getValidation(agent1.address);
      expect(valid).to.be.false;
      expect(evidenceURI).to.equal("");
    });

    it("Should revert if agent is zero address", async function () {
      await expect(
        registry.revokeAgent(ethers.ZeroAddress)
      ).to.be.revertedWith("AgentValidationRegistry: invalid agent address");
    });

    it("Should revert if agent is not validated", async function () {
      await expect(
        registry.revokeAgent(agent2.address)
      ).to.be.revertedWith("AgentValidationRegistry: agent not validated");
    });

    it("Should revert if not owner tries to revoke", async function () {
      await expect(
        registry.connect(agent1).revokeAgent(agent1.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("Query Functions", function () {
    it("Should return correct validation status for validated agent", async function () {
      const evidenceURI = "unibase://record/validation123";
      await registry.validateAgent(agent1.address, evidenceURI);

      const [valid, uri] = await registry.getValidation(agent1.address);
      expect(valid).to.be.true;
      expect(uri).to.equal(evidenceURI);
    });

    it("Should return false and empty string for unvalidated agent", async function () {
      const [valid, uri] = await registry.getValidation(agent1.address);
      expect(valid).to.be.false;
      expect(uri).to.equal("");
    });
  });

  describe("Batch Operations", function () {
    it("Should batch validate multiple agents", async function () {
      const agents = [agent1.address, agent2.address, agent3.address];
      const evidenceURIs = [
        "unibase://record/validation1",
        "unibase://record/validation2",
        "unibase://record/validation3"
      ];

      await expect(registry.batchValidateAgents(agents, evidenceURIs))
        .to.emit(registry, "AgentValidated")
        .withArgs(agent1.address, evidenceURIs[0])
        .and.to.emit(registry, "AgentValidated")
        .withArgs(agent2.address, evidenceURIs[1])
        .and.to.emit(registry, "AgentValidated")
        .withArgs(agent3.address, evidenceURIs[2]);

      expect(await registry.isValidAgent(agent1.address)).to.be.true;
      expect(await registry.isValidAgent(agent2.address)).to.be.true;
      expect(await registry.isValidAgent(agent3.address)).to.be.true;
    });

    it("Should revert batch validation if array lengths don't match", async function () {
      const agents = [agent1.address, agent2.address];
      const evidenceURIs = ["unibase://record/validation1"];

      await expect(
        registry.batchValidateAgents(agents, evidenceURIs)
      ).to.be.revertedWith("AgentValidationRegistry: array length mismatch");
    });

    it("Should batch revoke multiple agents", async function () {
      // First validate all agents
      await registry.batchValidateAgents(
        [agent1.address, agent2.address, agent3.address],
        [
          "unibase://record/validation1",
          "unibase://record/validation2",
          "unibase://record/validation3"
        ]
      );

      // Then revoke them
      await expect(registry.batchRevokeAgents([agent1.address, agent2.address]))
        .to.emit(registry, "AgentRevoked")
        .withArgs(agent1.address)
        .and.to.emit(registry, "AgentRevoked")
        .withArgs(agent2.address);

      expect(await registry.isValidAgent(agent1.address)).to.be.false;
      expect(await registry.isValidAgent(agent2.address)).to.be.false;
      expect(await registry.isValidAgent(agent3.address)).to.be.true; // Still validated
    });
  });
});

