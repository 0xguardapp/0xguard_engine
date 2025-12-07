const { expect } = require("chai");
const { ethers } = require("hardhat");
const { TypedDataEncoder } = require("ethers");

describe("AgentToken", function () {
  let token;
  let owner;
  let user1;
  let user2;
  let relayer;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const TRANSFER_AMOUNT = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, user1, user2, relayer] = await ethers.getSigners();

    const AgentToken = await ethers.getContractFactory("AgentToken");
    token = await AgentToken.deploy(INITIAL_SUPPLY);
    await token.waitForDeployment();

    // Transfer some tokens to user1 for testing
    await token.transfer(user1.address, ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should mint initial supply to deployer", async function () {
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Should have correct name and symbol", async function () {
      expect(await token.name()).to.equal("Agent Token");
      expect(await token.symbol()).to.equal("AGT");
    });
  });

  describe("Standard ERC-20", function () {
    it("Should transfer tokens normally", async function () {
      await token.connect(user1).transfer(user2.address, TRANSFER_AMOUNT);
      expect(await token.balanceOf(user2.address)).to.equal(TRANSFER_AMOUNT);
    });
  });

  describe("transferWithAuthorization", function () {
    let validAfter;
    let validBefore;
    let nonce;

    beforeEach(function () {
      validAfter = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      validBefore = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      nonce = ethers.id("test-nonce-1");
    });

    it("Should execute transfer with valid authorization", async function () {
      const domain = {
        name: "Agent Token",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await token.getAddress(),
      };

      const types = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const value = {
        from: user1.address,
        to: user2.address,
        value: TRANSFER_AMOUNT,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      await expect(
        token.connect(relayer).transferWithAuthorization(
          user1.address,
          user2.address,
          TRANSFER_AMOUNT,
          validAfter,
          validBefore,
          nonce,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.emit(token, "AuthorizationUsed")
        .withArgs(user1.address, nonce);

      expect(await token.balanceOf(user2.address)).to.equal(TRANSFER_AMOUNT);
      expect(await token.authorizationState(user1.address, nonce)).to.be.true;
    });

    it("Should revert if authorization not yet valid", async function () {
      const futureValidAfter = Math.floor(Date.now() / 1000) + 3600;

      const domain = {
        name: "Agent Token",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await token.getAddress(),
      };

      const types = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const value = {
        from: user1.address,
        to: user2.address,
        value: TRANSFER_AMOUNT,
        validAfter: futureValidAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      await expect(
        token.connect(relayer).transferWithAuthorization(
          user1.address,
          user2.address,
          TRANSFER_AMOUNT,
          futureValidAfter,
          validBefore,
          nonce,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWith("AgentToken: authorization not yet valid");
    });

    it("Should revert if authorization expired", async function () {
      const pastValidBefore = Math.floor(Date.now() / 1000) - 3600;

      const domain = {
        name: "Agent Token",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await token.getAddress(),
      };

      const types = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const value = {
        from: user1.address,
        to: user2.address,
        value: TRANSFER_AMOUNT,
        validAfter: validAfter,
        validBefore: pastValidBefore,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      await expect(
        token.connect(relayer).transferWithAuthorization(
          user1.address,
          user2.address,
          TRANSFER_AMOUNT,
          validAfter,
          pastValidBefore,
          nonce,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWith("AgentToken: authorization expired");
    });

    it("Should revert if authorization already used", async function () {
      // First use
      const domain = {
        name: "Agent Token",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await token.getAddress(),
      };

      const types = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const value = {
        from: user1.address,
        to: user2.address,
        value: TRANSFER_AMOUNT,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      await token.connect(relayer).transferWithAuthorization(
        user1.address,
        user2.address,
        TRANSFER_AMOUNT,
        validAfter,
        validBefore,
        nonce,
        sig.v,
        sig.r,
        sig.s
      );

      // Try to use again
      await expect(
        token.connect(relayer).transferWithAuthorization(
          user1.address,
          user2.address,
          TRANSFER_AMOUNT,
          validAfter,
          validBefore,
          nonce,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWith("AgentToken: authorization already used");
    });

    it("Should revert if signature is invalid", async function () {
      const domain = {
        name: "Agent Token",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await token.getAddress(),
      };

      const types = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const value = {
        from: user1.address,
        to: user2.address,
        value: TRANSFER_AMOUNT,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      // Sign with wrong account
      const signature = await user2.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      await expect(
        token.connect(relayer).transferWithAuthorization(
          user1.address,
          user2.address,
          TRANSFER_AMOUNT,
          validAfter,
          validBefore,
          nonce,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWith("AgentToken: invalid signature");
    });
  });

  describe("receiveWithAuthorization", function () {
    let validAfter;
    let validBefore;
    let nonce;

    beforeEach(function () {
      validAfter = Math.floor(Date.now() / 1000) - 3600;
      validBefore = Math.floor(Date.now() / 1000) + 3600;
      nonce = ethers.id("test-nonce-receive");
    });

    it("Should allow recipient to claim tokens", async function () {
      const domain = {
        name: "Agent Token",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await token.getAddress(),
      };

      const types = {
        ReceiveWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const value = {
        from: user1.address,
        to: user2.address,
        value: TRANSFER_AMOUNT,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      await expect(
        token.connect(user2).receiveWithAuthorization(
          user1.address,
          user2.address,
          TRANSFER_AMOUNT,
          validAfter,
          validBefore,
          nonce,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.emit(token, "AuthorizationUsed")
        .withArgs(user1.address, nonce);

      expect(await token.balanceOf(user2.address)).to.equal(TRANSFER_AMOUNT);
    });

    it("Should revert if recipient is not caller", async function () {
      const domain = {
        name: "Agent Token",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await token.getAddress(),
      };

      const types = {
        ReceiveWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const value = {
        from: user1.address,
        to: user2.address,
        value: TRANSFER_AMOUNT,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      await expect(
        token.connect(relayer).receiveWithAuthorization(
          user1.address,
          user2.address,
          TRANSFER_AMOUNT,
          validAfter,
          validBefore,
          nonce,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWith("AgentToken: recipient must be caller");
    });
  });

  describe("cancelAuthorization", function () {
    let nonce;

    beforeEach(function () {
      nonce = ethers.id("test-nonce-cancel");
    });

    it("Should cancel a pending authorization", async function () {
      const domain = {
        name: "Agent Token",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await token.getAddress(),
      };

      const types = {
        CancelAuthorization: [
          { name: "authorizer", type: "address" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const value = {
        authorizer: user1.address,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      await expect(
        token.connect(user1).cancelAuthorization(
          user1.address,
          nonce,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.emit(token, "AuthorizationCancelled")
        .withArgs(user1.address, nonce);

      expect(await token.authorizationState(user1.address, nonce)).to.be.true;
    });

    it("Should revert if caller is not authorizer", async function () {
      const domain = {
        name: "Agent Token",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await token.getAddress(),
      };

      const types = {
        CancelAuthorization: [
          { name: "authorizer", type: "address" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const value = {
        authorizer: user1.address,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      await expect(
        token.connect(user2).cancelAuthorization(
          user1.address,
          nonce,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWith("AgentToken: caller must be authorizer");
    });
  });
});

