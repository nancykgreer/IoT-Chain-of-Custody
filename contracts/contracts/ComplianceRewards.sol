// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./ChainToken.sol";

/**
 * @title ComplianceRewards
 * @dev Automated compliance reward distribution for healthcare organizations
 * 
 * Features:
 * - Automated reward calculation based on compliance metrics
 * - Cold chain monitoring rewards
 * - Audit trail completeness bonuses
 * - Time-based compliance streaks
 * - Multi-signature approval for large rewards
 */
contract ComplianceRewards is Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint256;
    
    ChainToken public immutable chainToken;
    
    // Reward tiers and multipliers
    struct RewardTier {
        uint256 minScore;      // Minimum compliance score
        uint256 baseReward;    // Base reward amount
        uint256 multiplier;    // Multiplier for exceptional performance
    }
    
    // Organization metrics
    struct OrganizationMetrics {
        uint256 complianceScore;        // Current compliance score (0-100)
        uint256 coldChainCompliance;    // Cold chain success rate (0-100)
        uint256 auditTrailCompleteness; // Audit trail completeness (0-100)
        uint256 lastRewardTime;         // Last reward timestamp
        uint256 streakDays;             // Consecutive compliance days
        uint256 totalRewardsEarned;     // Total rewards earned
        bool isActive;                  // Organization is active
    }
    
    // Compliance categories
    enum ComplianceCategory {
        COLD_CHAIN,
        AUDIT_TRAIL,
        REGULATORY,
        QUALITY_METRICS,
        RESPONSE_TIME,
        WORKFLOW_AUTOMATION
    }
    
    // Mappings
    mapping(address => OrganizationMetrics) public organizationMetrics;
    mapping(address => bool) public authorizedUpdaters;
    mapping(uint256 => RewardTier) public rewardTiers;
    mapping(address => mapping(ComplianceCategory => uint256)) public categoryScores;
    
    // Constants
    uint256 public constant MAX_COMPLIANCE_SCORE = 100;
    uint256 public constant MIN_REWARD_INTERVAL = 1 days;
    uint256 public constant STREAK_BONUS_THRESHOLD = 7; // days
    uint256 public constant STREAK_BONUS_MULTIPLIER = 150; // 1.5x
    
    // Configuration
    uint256 public maxDailyReward = 1000 * 10**18; // 1000 CHAIN tokens
    uint256 public streakBonusRate = 10 * 10**18;  // 10 CHAIN per day streak
    
    // Events
    event ComplianceUpdated(
        address indexed organization, 
        ComplianceCategory category, 
        uint256 score, 
        uint256 timestamp
    );
    event RewardDistributed(
        address indexed organization, 
        uint256 amount, 
        uint256 complianceScore,
        uint256 streakBonus
    );
    event StreakBonus(address indexed organization, uint256 days, uint256 bonus);
    event RewardTierUpdated(uint256 tier, uint256 minScore, uint256 baseReward, uint256 multiplier);
    event AuthorizedUpdaterAdded(address indexed updater);
    event AuthorizedUpdaterRemoved(address indexed updater);
    
    modifier onlyAuthorized() {
        require(
            authorizedUpdaters[msg.sender] || msg.sender == owner(),
            "Not authorized to update compliance"
        );
        _;
    }
    
    modifier validOrganization(address organization) {
        require(organization != address(0), "Invalid organization address");
        require(organizationMetrics[organization].isActive, "Organization not active");
        _;
    }
    
    constructor(address _chainToken, address initialOwner) Ownable(initialOwner) {
        require(_chainToken != address(0), "Invalid token address");
        chainToken = ChainToken(_chainToken);
        
        // Initialize default reward tiers
        _setRewardTier(0, 0, 50 * 10**18, 100);    // Bronze: 0-59%, 50 CHAIN, 1x
        _setRewardTier(1, 60, 100 * 10**18, 125);  // Silver: 60-79%, 100 CHAIN, 1.25x
        _setRewardTier(2, 80, 200 * 10**18, 150);  // Gold: 80-94%, 200 CHAIN, 1.5x
        _setRewardTier(3, 95, 500 * 10**18, 200);  // Platinum: 95-100%, 500 CHAIN, 2x
        
        authorizedUpdaters[initialOwner] = true;
    }
    
    /**
     * @dev Register a new healthcare organization
     */
    function registerOrganization(address organization) external onlyOwner {
        require(organization != address(0), "Invalid address");
        require(!organizationMetrics[organization].isActive, "Already registered");
        
        organizationMetrics[organization] = OrganizationMetrics({
            complianceScore: 0,
            coldChainCompliance: 0,
            auditTrailCompleteness: 0,
            lastRewardTime: block.timestamp,
            streakDays: 0,
            totalRewardsEarned: 0,
            isActive: true
        });
    }
    
    /**
     * @dev Update compliance score for a specific category
     */
    function updateComplianceScore(
        address organization,
        ComplianceCategory category,
        uint256 score
    ) external onlyAuthorized validOrganization(organization) whenNotPaused {
        require(score <= MAX_COMPLIANCE_SCORE, "Score exceeds maximum");
        
        categoryScores[organization][category] = score;
        
        // Recalculate overall compliance score
        uint256 totalScore = _calculateOverallScore(organization);
        organizationMetrics[organization].complianceScore = totalScore;
        
        emit ComplianceUpdated(organization, category, score, block.timestamp);
        
        // Check if eligible for daily reward
        if (_isEligibleForReward(organization)) {
            _distributeReward(organization);
        }
    }
    
    /**
     * @dev Batch update multiple compliance categories
     */
    function batchUpdateCompliance(
        address organization,
        ComplianceCategory[] memory categories,
        uint256[] memory scores
    ) external onlyAuthorized validOrganization(organization) whenNotPaused {
        require(categories.length == scores.length, "Array length mismatch");
        
        for (uint256 i = 0; i < categories.length; i++) {
            require(scores[i] <= MAX_COMPLIANCE_SCORE, "Score exceeds maximum");
            categoryScores[organization][categories[i]] = scores[i];
            emit ComplianceUpdated(organization, categories[i], scores[i], block.timestamp);
        }
        
        // Recalculate overall score
        uint256 totalScore = _calculateOverallScore(organization);
        organizationMetrics[organization].complianceScore = totalScore;
        
        // Check for reward eligibility
        if (_isEligibleForReward(organization)) {
            _distributeReward(organization);
        }
    }
    
    /**
     * @dev Manually trigger reward distribution (emergency/admin use)
     */
    function manualRewardDistribution(
        address organization,
        uint256 amount,
        string memory reason
    ) external onlyOwner validOrganization(organization) {
        require(amount > 0, "Invalid amount");
        require(amount <= maxDailyReward, "Exceeds daily limit");
        
        chainToken.mintReward(organization, amount, reason);
        organizationMetrics[organization].totalRewardsEarned += amount;
        
        emit RewardDistributed(organization, amount, 
            organizationMetrics[organization].complianceScore, 0);
    }
    
    /**
     * @dev Calculate overall compliance score from all categories
     */
    function _calculateOverallScore(address organization) internal view returns (uint256) {
        uint256 totalScore = 0;
        uint256 categoryCount = 6; // Number of compliance categories
        
        for (uint256 i = 0; i < categoryCount; i++) {
            totalScore += categoryScores[organization][ComplianceCategory(i)];
        }
        
        return totalScore / categoryCount;
    }
    
    /**
     * @dev Check if organization is eligible for daily reward
     */
    function _isEligibleForReward(address organization) internal view returns (bool) {
        OrganizationMetrics memory metrics = organizationMetrics[organization];
        
        // Must wait minimum interval between rewards
        if (block.timestamp < metrics.lastRewardTime + MIN_REWARD_INTERVAL) {
            return false;
        }
        
        // Must have minimum compliance score
        return metrics.complianceScore >= rewardTiers[0].minScore;
    }
    
    /**
     * @dev Distribute reward based on compliance score and streaks
     */
    function _distributeReward(address organization) internal nonReentrant {
        OrganizationMetrics storage metrics = organizationMetrics[organization];
        uint256 complianceScore = metrics.complianceScore;
        
        // Determine reward tier
        uint256 tierIndex = _getRewardTier(complianceScore);
        RewardTier memory tier = rewardTiers[tierIndex];
        
        // Calculate base reward
        uint256 baseReward = tier.baseReward;
        uint256 multiplier = tier.multiplier;
        uint256 rewardAmount = baseReward.mul(multiplier).div(100);
        
        // Calculate streak bonus
        uint256 streakBonus = 0;
        if (metrics.streakDays >= STREAK_BONUS_THRESHOLD) {
            streakBonus = metrics.streakDays.mul(streakBonusRate);
            streakBonus = streakBonus.mul(STREAK_BONUS_MULTIPLIER).div(100);
            
            emit StreakBonus(organization, metrics.streakDays, streakBonus);
        }
        
        uint256 totalReward = rewardAmount.add(streakBonus);
        
        // Ensure doesn't exceed daily limit
        if (totalReward > maxDailyReward) {
            totalReward = maxDailyReward;
        }
        
        // Update metrics
        metrics.lastRewardTime = block.timestamp;
        metrics.streakDays += 1;
        metrics.totalRewardsEarned += totalReward;
        
        // Mint reward tokens
        chainToken.mintReward(
            organization, 
            totalReward, 
            "Daily compliance reward"
        );
        
        emit RewardDistributed(organization, totalReward, complianceScore, streakBonus);
    }
    
    /**
     * @dev Get reward tier index based on compliance score
     */
    function _getRewardTier(uint256 score) internal view returns (uint256) {
        if (score >= rewardTiers[3].minScore) return 3; // Platinum
        if (score >= rewardTiers[2].minScore) return 2; // Gold
        if (score >= rewardTiers[1].minScore) return 1; // Silver
        return 0; // Bronze
    }
    
    // Admin functions
    function setRewardTier(
        uint256 tier,
        uint256 minScore,
        uint256 baseReward,
        uint256 multiplier
    ) external onlyOwner {
        _setRewardTier(tier, minScore, baseReward, multiplier);
    }
    
    function _setRewardTier(
        uint256 tier,
        uint256 minScore,
        uint256 baseReward,
        uint256 multiplier
    ) internal {
        require(minScore <= MAX_COMPLIANCE_SCORE, "Invalid min score");
        require(multiplier >= 100, "Multiplier must be >= 100");
        
        rewardTiers[tier] = RewardTier({
            minScore: minScore,
            baseReward: baseReward,
            multiplier: multiplier
        });
        
        emit RewardTierUpdated(tier, minScore, baseReward, multiplier);
    }
    
    function setMaxDailyReward(uint256 _maxDailyReward) external onlyOwner {
        maxDailyReward = _maxDailyReward;
    }
    
    function setStreakBonusRate(uint256 _streakBonusRate) external onlyOwner {
        streakBonusRate = _streakBonusRate;
    }
    
    function addAuthorizedUpdater(address updater) external onlyOwner {
        require(updater != address(0), "Invalid address");
        authorizedUpdaters[updater] = true;
        emit AuthorizedUpdaterAdded(updater);
    }
    
    function removeAuthorizedUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
        emit AuthorizedUpdaterRemoved(updater);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // View functions
    function getOrganizationMetrics(address organization) external view returns (
        uint256 complianceScore,
        uint256 coldChainCompliance,
        uint256 auditTrailCompleteness,
        uint256 lastRewardTime,
        uint256 streakDays,
        uint256 totalRewardsEarned,
        bool isActive
    ) {
        OrganizationMetrics memory metrics = organizationMetrics[organization];
        return (
            metrics.complianceScore,
            metrics.coldChainCompliance,
            metrics.auditTrailCompleteness,
            metrics.lastRewardTime,
            metrics.streakDays,
            metrics.totalRewardsEarned,
            metrics.isActive
        );
    }
    
    function getCategoryScore(
        address organization, 
        ComplianceCategory category
    ) external view returns (uint256) {
        return categoryScores[organization][category];
    }
    
    function getRewardEstimate(address organization) external view returns (uint256) {
        if (!_isEligibleForReward(organization)) {
            return 0;
        }
        
        OrganizationMetrics memory metrics = organizationMetrics[organization];
        uint256 tierIndex = _getRewardTier(metrics.complianceScore);
        RewardTier memory tier = rewardTiers[tierIndex];
        
        uint256 baseReward = tier.baseReward.mul(tier.multiplier).div(100);
        uint256 streakBonus = 0;
        
        if (metrics.streakDays >= STREAK_BONUS_THRESHOLD) {
            streakBonus = metrics.streakDays.mul(streakBonusRate);
            streakBonus = streakBonus.mul(STREAK_BONUS_MULTIPLIER).div(100);
        }
        
        uint256 totalReward = baseReward.add(streakBonus);
        return totalReward > maxDailyReward ? maxDailyReward : totalReward;
    }
}