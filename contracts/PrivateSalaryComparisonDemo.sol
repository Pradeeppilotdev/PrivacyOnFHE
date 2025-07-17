// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "./fhevm-config/ZamaConfig.sol";

/// @title Private Salary Comparison Demo Contract
/// @notice Simplified version for demo purposes - stores encrypted salaries
/// @dev This is a demo version that accepts simplified encrypted data
contract PrivateSalaryComparisonDemo is SepoliaConfig {
    struct SalaryEntry {
        bytes encryptedSalary; // Store as bytes for demo
        string role;
        string experience;
        uint256 timestamp;
        bool isActive;
    }

    struct ComparisonStats {
        uint256 totalEntries;
        uint256 totalSalarySum; // Store sum for demo calculations
    }

    // Mapping from user address to their salary entry
    mapping(address => SalaryEntry) public userSalaries;

    // Array of all active salary entries
    address[] public activeUsers;

    // Role-based statistics
    mapping(string => ComparisonStats) public roleStats;

    // Events
    event SalarySubmitted(address indexed user, string role, string experience, uint256 timestamp);
    event SalaryUpdated(address indexed user, string role, string experience, uint256 timestamp);
    event SalaryRemoved(address indexed user, uint256 timestamp);

    /// @notice Submit an encrypted salary entry (demo version)
    /// @param encryptedSalary The encrypted salary data
    /// @param inputProof The proof for the encrypted salary
    /// @param role The job role/title
    /// @param experience Experience level (e.g., "Junior", "Mid", "Senior")
    function submitSalary(
        bytes calldata encryptedSalary,
        bytes calldata inputProof,
        string calldata role,
        string calldata experience
    ) external {
        // Check if user already has an entry
        bool isUpdate = userSalaries[msg.sender].isActive;

        // Store the salary entry
        userSalaries[msg.sender] = SalaryEntry({
            encryptedSalary: encryptedSalary,
            role: role,
            experience: experience,
            timestamp: block.timestamp,
            isActive: true
        });

        // Add to active users if new entry
        if (!isUpdate) {
            activeUsers.push(msg.sender);
        }

        // Update role statistics (simplified for demo)
        _updateRoleStats(role, encryptedSalary, isUpdate);

        if (isUpdate) {
            emit SalaryUpdated(msg.sender, role, experience, block.timestamp);
        } else {
            emit SalarySubmitted(msg.sender, role, experience, block.timestamp);
        }
    }

    /// @notice Remove user's salary entry
    function removeSalary() external {
        require(userSalaries[msg.sender].isActive, "No active salary entry");

        // Mark as inactive
        userSalaries[msg.sender].isActive = false;

        // Remove from active users array
        for (uint i = 0; i < activeUsers.length; i++) {
            if (activeUsers[i] == msg.sender) {
                activeUsers[i] = activeUsers[activeUsers.length - 1];
                activeUsers.pop();
                break;
            }
        }

        emit SalaryRemoved(msg.sender, block.timestamp);
    }

    /// @notice Get user's encrypted salary
    /// @param user The user address
    /// @return The encrypted salary bytes
    function getUserSalary(address user) external view returns (bytes memory) {
        require(userSalaries[user].isActive, "No active salary entry");
        return userSalaries[user].encryptedSalary;
    }

    /// @notice Get user's salary info (non-sensitive data)
    /// @param user The user address
    /// @return role, experience, timestamp
    function getUserInfo(address user) external view returns (string memory, string memory, uint256) {
        require(userSalaries[user].isActive, "No active salary entry");
        SalaryEntry memory entry = userSalaries[user];
        return (entry.role, entry.experience, entry.timestamp);
    }

    /// @notice Get role-based statistics (simplified for demo)
    /// @param role The job role
    /// @return total entries, total salary sum (for demo)
    function getRoleStats(string calldata role) external view returns (uint256, uint256) {
        ComparisonStats memory stats = roleStats[role];
        return (stats.totalEntries, stats.totalSalarySum);
    }

    /// @notice Get total number of active entries
    /// @return The count of active salary entries
    function getTotalEntries() external view returns (uint256) {
        return activeUsers.length;
    }

    /// @notice Get all active users (for frontend to iterate)
    /// @return Array of active user addresses
    function getActiveUsers() external view returns (address[] memory) {
        return activeUsers;
    }

    /// @notice Check if user has an active salary entry
    /// @param user The user address
    /// @return True if user has active entry
    function hasActiveEntry(address user) external view returns (bool) {
        return userSalaries[user].isActive;
    }

    /// @dev Internal function to update role statistics (simplified)
    function _updateRoleStats(string memory role, bytes memory encryptedSalary, bool isUpdate) internal {
        ComparisonStats storage stats = roleStats[role];

        if (!isUpdate) {
            // For new entries, just increment count and add a demo value
            stats.totalEntries++;
            // For demo purposes, we'll add a fixed value (in real FHE, this would be encrypted)
            stats.totalSalarySum += 50000; // Demo value
        }
    }
}
