import { expect } from "chai";
import { ethers } from "hardhat";
import { ConsentVault, RevocationRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ConsentVault", function () {
  let consentVault: ConsentVault;
  let revocationRegistry: RevocationRegistry;
  let owner: SignerWithAddress;
  let grantee: SignerWithAddress;
  let other: SignerWithAddress;

  const EMPTY_CID = "QmTestCID123";
  const SCOPED_KEY_HASH = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
  const FUTURE_EXPIRY = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days

  beforeEach(async function () {
    [owner, grantee, other] = await ethers.getSigners();

    const RevocationRegistry = await ethers.getContractFactory("RevocationRegistry");
    revocationRegistry = await RevocationRegistry.deploy();
    await revocationRegistry.waitForDeployment();

    const ConsentVault = await ethers.getContractFactory("ConsentVault");
    consentVault = await ConsentVault.deploy();
    await consentVault.waitForDeployment();

    await consentVault.setRevocationRegistry(await revocationRegistry.getAddress());
    await revocationRegistry.setConsentVault(await consentVault.getAddress());
  });

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      expect(await consentVault.owner()).to.equal(owner.address);
    });

    it("Should have revocation registry set", async function () {
      expect(await consentVault.revocationRegistry()).to.equal(
        await revocationRegistry.getAddress()
      );
    });
  });

  describe("createVault", function () {
    it("Should create a vault for the caller", async function () {
      await expect(consentVault.createVault(EMPTY_CID))
        .to.emit(consentVault, "VaultCreated")
        .withArgs(owner.address, EMPTY_CID);

      const vault = await consentVault.vaults(owner.address);
      expect(vault.owner).to.equal(owner.address);
      expect(vault.encryptedMetadataCID).to.equal(EMPTY_CID);
    });

    it("Should not allow creating duplicate vaults", async function () {
      await consentVault.createVault(EMPTY_CID);
      await expect(consentVault.createVault(EMPTY_CID)).to.be.revertedWith(
        "Vault already exists"
      );
    });

    it("Should allow different users to create separate vaults", async function () {
      await consentVault.connect(owner).createVault(EMPTY_CID);
      await consentVault.connect(grantee).createVault("QmGranteeCID");

      const ownerVault = await consentVault.vaults(owner.address);
      const granteeVault = await consentVault.vaults(grantee.address);

      expect(ownerVault.owner).to.equal(owner.address);
      expect(granteeVault.owner).to.equal(grantee.address);
    });
  });

  describe("grantAccess", function () {
    beforeEach(async function () {
      await consentVault.createVault(EMPTY_CID);
    });

    it("Should create a grant successfully", async function () {
      const dataTypes = [1, 2];
      const purposes = [ethers.keccak256(ethers.toUtf8Bytes("research"))];

      const tx = await consentVault.grantAccess(
        grantee.address,
        dataTypes,
        purposes,
        FUTURE_EXPIRY,
        EMPTY_CID,
        SCOPED_KEY_HASH
      );
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log) => consentVault.interface.parseLog(log as any)?.name === "GrantCreated"
      );
      expect(event).to.not.be.undefined;
    });

    it("Should revert if grantee is zero address", async function () {
      await expect(
        consentVault.grantAccess(
          ethers.ZeroAddress,
          [1],
          [],
          FUTURE_EXPIRY,
          EMPTY_CID,
          SCOPED_KEY_HASH
        )
      ).to.be.revertedWith("Invalid grantee");
    });

    it("Should revert if expiry is in the past", async function () {
      const pastExpiry = Math.floor(Date.now() / 1000) - 1000;
      await expect(
        consentVault.grantAccess(grantee.address, [1], [], pastExpiry, EMPTY_CID, SCOPED_KEY_HASH)
      ).to.be.revertedWith("Expiry must be in future");
    });

    it("Should revert if no data types specified", async function () {
      await expect(
        consentVault.grantAccess(
          grantee.address,
          [],
          [],
          FUTURE_EXPIRY,
          EMPTY_CID,
          SCOPED_KEY_HASH
        )
      ).to.be.revertedWith("Must specify data types");
    });

    it("Should revert if caller has no vault", async function () {
      await expect(
        consentVault
          .connect(other)
          .grantAccess(grantee.address, [1], [], FUTURE_EXPIRY, EMPTY_CID, SCOPED_KEY_HASH)
      ).to.be.revertedWith("No vault found");
    });
  });

  describe("revokeAccess", function () {
    let grantId: string;

    beforeEach(async function () {
      await consentVault.createVault(EMPTY_CID);
      const tx = await consentVault.grantAccess(
        grantee.address,
        [1],
        [],
        FUTURE_EXPIRY,
        EMPTY_CID,
        SCOPED_KEY_HASH
      );
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log) => {
          try {
            return consentVault.interface.parseLog(log as any);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === "GrantCreated");
      grantId = event?.args[0];
    });

    it("Should revoke a grant successfully", async function () {
      const reason = "User requested revocation";
      const keyDestructionProof = ethers.keccak256(ethers.toUtf8Bytes("key-destroyed"));

      await expect(consentVault.revokeAccess(grantId, reason, keyDestructionProof))
        .to.emit(consentVault, "GrantRevoked")
        .withArgs(grantId, owner.address, grantee.address);

      const grant = await consentVault.getGrant(grantId);
      expect(grant.revoked).to.be.true;
    });

    it("Should register revocation in registry", async function () {
      const reason = "Test revocation";
      const keyDestructionProof = ethers.keccak256(ethers.toUtf8Bytes("key-destroyed"));

      await consentVault.revokeAccess(grantId, reason, keyDestructionProof);

      const [isRevoked] = await revocationRegistry.isRevoked(grantId);
      expect(isRevoked).to.be.true;
    });

    it("Should not allow double revocation", async function () {
      const proof = ethers.keccak256(ethers.toUtf8Bytes("key-destroyed"));
      await consentVault.revokeAccess(grantId, "reason", proof);
      await expect(consentVault.revokeAccess(grantId, "reason", proof)).to.be.revertedWith(
        "Grant already revoked"
      );
    });
  });

  describe("isGrantValid", function () {
    let grantId: string;

    beforeEach(async function () {
      await consentVault.createVault(EMPTY_CID);
      const tx = await consentVault.grantAccess(
        grantee.address,
        [1, 2],
        [],
        FUTURE_EXPIRY,
        EMPTY_CID,
        SCOPED_KEY_HASH
      );
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log) => {
          try {
            return consentVault.interface.parseLog(log as any);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === "GrantCreated");
      grantId = event?.args[0];
    });

    it("Should return true for a valid grant with matching data type", async function () {
      const valid = await consentVault.isGrantValid(owner.address, grantee.address, 1);
      expect(valid).to.be.true;
    });

    it("Should return false for an invalid data type", async function () {
      const valid = await consentVault.isGrantValid(owner.address, grantee.address, 5);
      expect(valid).to.be.false;
    });

    it("Should return false after revocation", async function () {
      const proof = ethers.keccak256(ethers.toUtf8Bytes("key-destroyed"));
      await consentVault.revokeAccess(grantId, "reason", proof);
      const valid = await consentVault.isGrantValid(owner.address, grantee.address, 1);
      expect(valid).to.be.false;
    });
  });

  describe("recordAccess", function () {
    let grantId: string;

    beforeEach(async function () {
      await consentVault.createVault(EMPTY_CID);
      const tx = await consentVault.grantAccess(
        grantee.address,
        [1],
        [],
        FUTURE_EXPIRY,
        EMPTY_CID,
        SCOPED_KEY_HASH
      );
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log) => {
          try {
            return consentVault.interface.parseLog(log as any);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === "GrantCreated");
      grantId = event?.args[0];
    });

    it("Should allow grantee to record access", async function () {
      await expect(consentVault.connect(grantee).recordAccess(grantId))
        .to.emit(consentVault, "DataAccessed")
        .withArgs(grantId, grantee.address, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
    });

    it("Should not allow non-grantee to record access", async function () {
      await expect(consentVault.connect(other).recordAccess(grantId)).to.be.revertedWith(
        "Not the grantee"
      );
    });
  });
});
