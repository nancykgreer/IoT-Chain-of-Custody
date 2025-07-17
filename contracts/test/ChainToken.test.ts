import { expect } from "chai";
import { ethers } from "hardhat";
import { ChainToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ChainToken", function () {
  let chainToken: ChainToken;
  let owner: HardhatEthersSigner;
  let rewardMinter: HardhatEthersSigner;
  let complianceOfficer: HardhatEthersSigner;
  let organization: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  const INITIAL_SUPPLY = ethers.parseEther("100000000"); // 100 million
  const MAX_SUPPLY = ethers.parseEther("1000000000"); // 1 billion

  beforeEach(async function () {
    [owner, rewardMinter, complianceOfficer, organization, user] = await ethers.getSigners();
    
    const ChainTokenFactory = await ethers.getContractFactory("ChainToken");
    chainToken = await ChainTokenFactory.deploy(owner.address);
    await chainToken.waitForDeployment();
    
    // Setup roles
    await chainToken.addRewardMinter(rewardMinter.address);
    await chainToken.addComplianceOfficer(complianceOfficer.address);
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial parameters", async function () {
      expect(await chainToken.name()).to.equal("Healthcare Chain Token");
      expect(await chainToken.symbol()).to.equal("CHAIN");
      expect(await chainToken.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await chainToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Should set the correct owner", async function () {
      expect(await chainToken.owner()).to.equal(owner.address);
    });

    it("Should have correct max supply", async function () {
      expect(await chainToken.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
    });
  });

  describe("Role Management", function () {
    it("Should allow owner to add reward minters", async function () {
      await chainToken.addRewardMinter(user.address);
      expect(await chainToken.rewardMinters(user.address)).to.be.true;
    });

    it("Should allow owner to remove reward minters", async function () {
      await chainToken.addRewardMinter(user.address);
      await chainToken.removeRewardMinter(user.address);
      expect(await chainToken.rewardMinters(user.address)).to.be.false;
    });

    it("Should allow owner to add compliance officers", async function () {
      await chainToken.addComplianceOfficer(user.address);
      expect(await chainToken.complianceOfficers(user.address)).to.be.true;
    });

    it("Should not allow non-owner to add roles", async function () {
      await expect(
        chainToken.connect(user).addRewardMinter(organization.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Reward Minting", function () {
    const rewardAmount = ethers.parseEther("100");
    const reason = "Compliance achievement";

    it("Should allow reward minter to mint rewards", async function () {
      await chainToken.connect(rewardMinter).mintReward(
        organization.address,
        rewardAmount,
        reason
      );

      expect(await chainToken.balanceOf(organization.address)).to.equal(rewardAmount);
      expect(await chainToken.totalRewardsEarned(organization.address)).to.equal(rewardAmount);
    });

    it("Should emit RewardMinted event", async function () {
      await expect(
        chainToken.connect(rewardMinter).mintReward(
          organization.address,
          rewardAmount,
          reason
        )
      ).to.emit(chainToken, "RewardMinted")
       .withArgs(organization.address, rewardAmount, reason);
    });

    it("Should not allow non-minter to mint rewards", async function () {
      await expect(
        chainToken.connect(user).mintReward(
          organization.address,
          rewardAmount,
          reason
        )
      ).to.be.revertedWith("Not authorized to mint rewards");
    });

    it("Should not mint rewards that exceed max supply", async function () {
      const excessiveAmount = MAX_SUPPLY;
      
      await expect(
        chainToken.connect(rewardMinter).mintReward(
          organization.address,
          excessiveAmount,
          reason
        )
      ).to.be.revertedWith("Would exceed max supply");
    });

    it("Should not mint rewards when paused", async function () {
      await chainToken.pause();
      
      await expect(
        chainToken.connect(rewardMinter).mintReward(
          organization.address,
          rewardAmount,
          reason
        )
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Compliance Rewards", function () {
    const amount = ethers.parseEther("200");
    const score = 95;
    const orgId = "ORG001";

    it("Should allow compliance officer to issue rewards", async function () {
      await chainToken.connect(complianceOfficer).issueComplianceReward(
        organization.address,
        amount,
        score,
        orgId
      );

      expect(await chainToken.balanceOf(organization.address)).to.equal(amount);
      expect(await chainToken.complianceScore(organization.address)).to.equal(score);
      expect(await chainToken.organizationRewards(orgId)).to.equal(amount);
    });

    it("Should emit ComplianceRewardIssued event", async function () {
      await expect(
        chainToken.connect(complianceOfficer).issueComplianceReward(
          organization.address,
          amount,
          score,
          orgId
        )
      ).to.emit(chainToken, "ComplianceRewardIssued")
       .withArgs(organization.address, amount, score);
    });

    it("Should not allow invalid compliance scores", async function () {
      await expect(
        chainToken.connect(complianceOfficer).issueComplianceReward(
          organization.address,
          amount,
          101, // Invalid score > 100
          orgId
        )
      ).to.be.revertedWith("Score must be 0-100");
    });
  });

  describe("Quality Bonuses", function () {
    const bonusAmount = ethers.parseEther("50");
    const metric = "Perfect cold chain compliance";

    it("Should allow minter to award quality bonuses", async function () {
      await chainToken.connect(rewardMinter).awardQualityBonus(
        organization.address,
        bonusAmount,
        metric
      );

      expect(await chainToken.balanceOf(organization.address)).to.equal(bonusAmount);
      expect(await chainToken.totalRewardsEarned(organization.address)).to.equal(bonusAmount);
    });

    it("Should emit QualityBonusAwarded event", async function () {
      await expect(
        chainToken.connect(rewardMinter).awardQualityBonus(
          organization.address,
          bonusAmount,
          metric
        )
      ).to.emit(chainToken, "QualityBonusAwarded")
       .withArgs(organization.address, bonusAmount, metric);
    });
  });

  describe("Batch Operations", function () {
    it("Should allow batch minting rewards", async function () {
      const recipients = [organization.address, user.address];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
      const reason = "Monthly compliance rewards";

      await chainToken.connect(rewardMinter).batchMintRewards(
        recipients,
        amounts,
        reason
      );

      expect(await chainToken.balanceOf(organization.address)).to.equal(amounts[0]);
      expect(await chainToken.balanceOf(user.address)).to.equal(amounts[1]);
    });

    it("Should not allow batch mint with mismatched arrays", async function () {
      const recipients = [organization.address];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
      const reason = "Test";

      await expect(
        chainToken.connect(rewardMinter).batchMintRewards(
          recipients,
          amounts,
          reason
        )
      ).to.be.revertedWith("Array length mismatch");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Setup some rewards
      await chainToken.connect(rewardMinter).mintReward(
        organization.address,
        ethers.parseEther("100"),
        "Test reward"
      );
      
      await chainToken.connect(complianceOfficer).issueComplianceReward(
        organization.address,
        ethers.parseEther("200"),
        85,
        "ORG001"
      );
    });

    it("Should return correct reward info", async function () {
      const [balance, totalRewards, compliance] = await chainToken.getRewardInfo(organization.address);
      
      expect(balance).to.equal(ethers.parseEther("300"));
      expect(totalRewards).to.equal(ethers.parseEther("300"));
      expect(compliance).to.equal(85);
    });

    it("Should return correct organization rewards", async function () {
      const orgRewards = await chainToken.getOrganizationRewards("ORG001");
      expect(orgRewards).to.equal(ethers.parseEther("200"));
    });
  });

  describe("Pausable Functionality", function () {
    it("Should allow owner to pause and unpause", async function () {
      await chainToken.pause();
      expect(await chainToken.paused()).to.be.true;

      await chainToken.unpause();
      expect(await chainToken.paused()).to.be.false;
    });

    it("Should not allow transfers when paused", async function () {
      await chainToken.pause();
      
      await expect(
        chainToken.transfer(user.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        chainToken.connect(user).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});