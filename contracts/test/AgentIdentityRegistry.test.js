const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentIdentityRegistry", function () {
  let registry;
  let owner;
  let agent1;
  let agent2;

  beforeEach(async function () {
    [owner, agent1, agent2] = await ethers.getSigners();

    const AgentIdentityRegistry = await ethers.getContractFactory("AgentIdentityRegistry");
    registry = await AgentIdentityRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });
  });

  describe("Registration", function () {
    it("Should register an agent", async function () {
      const identityURI = "unibase://record/key123";
      
      await expect(registry.registerAgent(agent1.address, identityURI))
        .to.emit(registry, "AgentRegistered")
        .withArgs(agent1.address, identityURI);

      expect(await registry.getIdentity(agent1.address)).to.equal(identityURI);
      expect(await registry.isRegistered(agent1.address)).to.be.true;
    });

    it("Should revert if agent is zero address", async function () {
      await expect(
        registry.registerAgent(ethers.ZeroAddress, "unibase://record/key123")
      ).to.be.revertedWith("AgentIdentityRegistry: invalid agent address");
    });

    it("Should revert if identityURI is empty", async function () {
      await expect(
        registry.registerAgent(agent1.address, "")
      ).to.be.revertedWith("AgentIdentityRegistry: identityURI cannot be empty");
    });

    it("Should revert if agent already registered", async function () {
      await registry.registerAgent(agent1.address, "unibase://record/key123");
      
      await expect(
        registry.registerAgent(agent1.address, "unibase://record/key456")
      ).to.be.revertedWith("AgentIdentityRegistry: agent already registered");
    });

    it("Should revert if not owner tries to register", async function () {
      await expect(
        registry.connect(agent1).registerAgent(agent2.address, "unibase://record/key123")
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("Update Identity URI", function () {
    beforeEach(async function () {
      await registry.registerAgent(agent1.address, "unibase://record/key123");
    });

    it("Should update identity URI", async function () {
      const newURI = "unibase://record/key456";
      
      await expect(registry.updateIdentityURI(agent1.address, newURI))
        .to.emit(registry, "IdentityURIUpdated")
        .withArgs(agent1.address, "unibase://record/key123", newURI);

      expect(await registry.getIdentity(agent1.address)).to.equal(newURI);
    });

    it("Should revert if agent not registered", async function () {
      await expect(
        registry.updateIdentityURI(agent2.address, "unibase://record/key456")
      ).to.be.revertedWith("AgentIdentityRegistry: agent not registered");
    });

    it("Should revert if newURI is empty", async function () {
      await expect(
        registry.updateIdentityURI(agent1.address, "")
      ).to.be.revertedWith("AgentIdentityRegistry: newURI cannot be empty");
    });

    it("Should revert if not owner tries to update", async function () {
      await expect(
        registry.connect(agent1).updateIdentityURI(agent1.address, "unibase://record/key456")
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("Query Functions", function () {
    it("Should return empty string for unregistered agent", async function () {
      expect(await registry.getIdentity(agent1.address)).to.equal("");
      expect(await registry.isRegistered(agent1.address)).to.be.false;
    });

    it("Should return full identity information", async function () {
      const identityURI = "unibase://record/key123";
      await registry.registerAgent(agent1.address, identityURI);

      const identity = await registry.getIdentityFull(agent1.address);
      expect(identity.identityURI).to.equal(identityURI);
      expect(identity.registeredAt).to.be.gt(0);
      expect(identity.lastUpdated).to.be.gt(0);
    });
  });
});

