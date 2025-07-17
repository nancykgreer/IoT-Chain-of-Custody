// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ChainToken
 * @dev Healthcare Chain of Custody Token (CHAIN) for Avalanche C-Chain
 * 
 * Features:
 * - ERC20 standard with permit functionality
 * - Governance voting capabilities
 * - Pausable for emergency stops
 * - Role-based access control
 * - Compliance and quality reward mechanisms
 */
contract ChainToken is ERC20, ERC20Permit, ERC20Votes, Ownable, Pausable, ReentrancyGuard {
    
    // Constants
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18; // 100 million initial mint
    
    // Roles
    mapping(address => bool) public rewardMinters;
    mapping(address => bool) public complianceOfficers;
    
    // Reward tracking
    mapping(address => uint256) public totalRewardsEarned;
    mapping(address => uint256) public complianceScore;
    mapping(string => uint256) public organizationRewards;
    
    // Events
    event RewardMinted(address indexed recipient, uint256 amount, string reason);
    event ComplianceRewardIssued(address indexed organization, uint256 amount, uint256 score);
    event QualityBonusAwarded(address indexed recipient, uint256 amount, string metric);
    event RewardMinterAdded(address indexed minter);
    event RewardMinterRemoved(address indexed minter);
    event ComplianceOfficerAdded(address indexed officer);
    event ComplianceOfficerRemoved(address indexed officer);
    
    // Modifiers
    modifier onlyRewardMinter() {
        require(rewardMinters[msg.sender] || msg.sender == owner(), "Not authorized to mint rewards");
        _;
    }
    
    modifier onlyComplianceOfficer() {
        require(complianceOfficers[msg.sender] || msg.sender == owner(), "Not authorized compliance officer");
        _;
    }
    
    constructor(
        address initialOwner
    ) 
        ERC20("Healthcare Chain Token", "CHAIN") 
        ERC20Permit("Healthcare Chain Token")
        Ownable(initialOwner)
    {
        // Mint initial supply to owner
        _mint(initialOwner, INITIAL_SUPPLY);
        
        // Set initial roles
        rewardMinters[initialOwner] = true;
        complianceOfficers[initialOwner] = true;
    }
    
    /**
     * @dev Mint reward tokens for compliance and quality achievements
     * @param recipient Address receiving the reward
     * @param amount Amount of tokens to mint
     * @param reason Description of why reward was earned
     */
    function mintReward(
        address recipient, 
        uint256 amount, 
        string memory reason
    ) external onlyRewardMinter whenNotPaused nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");
        require(totalSupply() + amount <= MAX_SUPPLY, "Would exceed max supply");
        
        _mint(recipient, amount);
        totalRewardsEarned[recipient] += amount;
        
        emit RewardMinted(recipient, amount, reason);
    }
    
    /**
     * @dev Issue compliance-based rewards to healthcare organizations
     * @param organization Organization address
     * @param amount Reward amount
     * @param score Compliance score (0-100)
     */
    function issueComplianceReward(
        address organization,
        uint256 amount,
        uint256 score,
        string memory orgId
    ) external onlyComplianceOfficer whenNotPaused nonReentrant {
        require(organization != address(0), "Invalid organization");
        require(score <= 100, "Score must be 0-100");
        require(amount > 0, "Amount must be positive");
        require(totalSupply() + amount <= MAX_SUPPLY, "Would exceed max supply");
        
        _mint(organization, amount);
        complianceScore[organization] = score;
        organizationRewards[orgId] += amount;
        totalRewardsEarned[organization] += amount;
        
        emit ComplianceRewardIssued(organization, amount, score);
    }
    
    /**
     * @dev Award quality bonus for exceptional performance
     * @param recipient Address receiving bonus
     * @param amount Bonus amount
     * @param metric Quality metric that triggered bonus
     */
    function awardQualityBonus(
        address recipient,
        uint256 amount,
        string memory metric
    ) external onlyRewardMinter whenNotPaused nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");
        require(totalSupply() + amount <= MAX_SUPPLY, "Would exceed max supply");
        
        _mint(recipient, amount);
        totalRewardsEarned[recipient] += amount;
        
        emit QualityBonusAwarded(recipient, amount, metric);
    }
    
    /**
     * @dev Batch mint rewards for multiple recipients
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts corresponding to recipients
     * @param reason Batch reward reason
     */
    function batchMintRewards(
        address[] memory recipients,
        uint256[] memory amounts,
        string memory reason
    ) external onlyRewardMinter whenNotPaused nonReentrant {
        require(recipients.length == amounts.length, "Array length mismatch");
        require(recipients.length > 0, "Empty arrays");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(totalSupply() + totalAmount <= MAX_SUPPLY, "Would exceed max supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(amounts[i] > 0, "Amount must be positive");
            
            _mint(recipients[i], amounts[i]);
            totalRewardsEarned[recipients[i]] += amounts[i];
            
            emit RewardMinted(recipients[i], amounts[i], reason);
        }
    }
    
    // Role management functions
    function addRewardMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid address");
        rewardMinters[minter] = true;
        emit RewardMinterAdded(minter);
    }
    
    function removeRewardMinter(address minter) external onlyOwner {
        rewardMinters[minter] = false;
        emit RewardMinterRemoved(minter);
    }
    
    function addComplianceOfficer(address officer) external onlyOwner {
        require(officer != address(0), "Invalid address");
        complianceOfficers[officer] = true;
        emit ComplianceOfficerAdded(officer);
    }
    
    function removeComplianceOfficer(address officer) external onlyOwner {
        complianceOfficers[officer] = false;
        emit ComplianceOfficerRemoved(officer);
    }
    
    // Emergency functions
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // View functions
    function getRewardInfo(address account) external view returns (
        uint256 balance,
        uint256 totalRewards,
        uint256 compliance
    ) {
        return (
            balanceOf(account),
            totalRewardsEarned[account],
            complianceScore[account]
        );
    }
    
    function getOrganizationRewards(string memory orgId) external view returns (uint256) {
        return organizationRewards[orgId];
    }
    
    // Required overrides
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal whenNotPaused override {
        super._beforeTokenTransfer(from, to, amount);
    }
    
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }
    
    function _mint(
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }
    
    function _burn(
        address from,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._burn(from, amount);
    }
}