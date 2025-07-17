// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "./fhevm-config/ZamaConfig.sol";

contract PrivateSalaryComparison is SepoliaConfig {
    struct SalaryEntry {
        euint32 encryptedSalary;
        string role;
        string experience;
        uint256 timestamp;
        bool isActive;
    }

    struct ComparisonStats {
        euint32 averageSalary;
        euint32 minSalary;
        euint32 maxSalary;
        euint32 sumSalary;
        uint256 totalEntries;
    }

    struct ActiveEntry {
        address user;
        string role;
    }

    mapping(address => mapping(string => SalaryEntry)) public userSalaries;
    mapping(address => mapping(string => euint32)) private previousSalaries;
    ActiveEntry[] public activeEntries;

    mapping(string => ComparisonStats) public roleStats;
    mapping(string => bytes32) public lastPublicSumHash;
    mapping(string => bytes32) public lastPublicMinHash;
    mapping(string => bytes32) public lastPublicMaxHash;
    mapping(string => uint32) public decryptedAverages;
    mapping(address => mapping(string => bool)) public isDecryptionPending;
    mapping(uint256 => address) public requestIdToUser;
    mapping(uint256 => string) public requestIdToRole;

    event AverageDecrypted(string role, uint256 requestId, uint32 decryptedAverage);
    event DebugMinMax(string role, uint count);
    event DebugSum(string role, bytes32 ciphertext);
    event SalarySubmitted(address indexed user, string role, string experience, uint256 timestamp);
    event SalaryUpdated(address indexed user, string role, string experience, uint256 timestamp);
    event SalaryRemoved(address indexed user, uint256 timestamp);

    function submitSalary(
        externalEuint32 encryptedSalary,
        bytes calldata inputProof,
        string calldata role,
        string calldata experience
    ) external {
        euint32 salary = FHE.fromExternal(encryptedSalary, inputProof);
        FHE.allowThis(salary);
        FHE.allow(salary, msg.sender);

        bool isUpdate = userSalaries[msg.sender][role].isActive;
        euint32 oldSalary;

        if (isUpdate) {
            oldSalary = userSalaries[msg.sender][role].encryptedSalary;
        }

        userSalaries[msg.sender][role] = SalaryEntry({
            encryptedSalary: salary,
            role: role,
            experience: experience,
            timestamp: block.timestamp,
            isActive: true
        });

        previousSalaries[msg.sender][role] = salary;

        if (!isUpdate) {
            activeEntries.push(ActiveEntry({user: msg.sender, role: role}));
        }

        _updateRoleStats(role, salary, isUpdate, oldSalary, false);

        if (isUpdate) {
            emit SalaryUpdated(msg.sender, role, experience, block.timestamp);
        } else {
            emit SalarySubmitted(msg.sender, role, experience, block.timestamp);
        }
    }

    function removeSalary(string calldata role) external {
        require(userSalaries[msg.sender][role].isActive, "No active salary entry");

        euint32 oldSalary = userSalaries[msg.sender][role].encryptedSalary;
        userSalaries[msg.sender][role].isActive = false;

        for (uint i = 0; i < activeEntries.length; i++) {
            if (
                activeEntries[i].user == msg.sender && keccak256(bytes(activeEntries[i].role)) == keccak256(bytes(role))
            ) {
                activeEntries[i] = activeEntries[activeEntries.length - 1];
                activeEntries.pop();
                break;
            }
        }

        _updateRoleStats(role, oldSalary, true, oldSalary, true);
        emit SalaryRemoved(msg.sender, block.timestamp);
    }

    function _updateRoleStats(
        string memory role,
        euint32 newSalary,
        bool isUpdate,
        euint32 oldSalary,
        bool isRemove
    ) internal {
        ComparisonStats storage stats = roleStats[role];

        if (isRemove) {
            if (stats.totalEntries > 0) {
                stats.sumSalary = FHE.sub(stats.sumSalary, oldSalary);
                stats.totalEntries--;
            }
        } else if (isUpdate) {
            stats.sumSalary = FHE.add(FHE.sub(stats.sumSalary, oldSalary), newSalary);
        } else {
            if (stats.totalEntries == 0) {
                stats.sumSalary = newSalary;
            } else {
                stats.sumSalary = FHE.add(stats.sumSalary, newSalary);
            }
            stats.totalEntries++;
        }

        if (stats.totalEntries > 0) {
            bytes32 sumHash = FHE.toBytes32(stats.sumSalary);
            if (sumHash != lastPublicSumHash[role]) {
                FHE.makePubliclyDecryptable(stats.sumSalary);
                lastPublicSumHash[role] = sumHash;
            }
        }

        // ⛔️ MIN/MAX updates removed from here to avoid compute overload
    }

    function recalculateMinMax(string calldata role) external {
        ComparisonStats storage stats = roleStats[role];
        require(stats.totalEntries > 0, "No entries for role");

        euint32 min = _findMin(role);
        euint32 max = _findMax(role);

        bytes32 minHash = FHE.toBytes32(min);
        bytes32 maxHash = FHE.toBytes32(max);

        if (minHash != lastPublicMinHash[role]) {
            FHE.makePubliclyDecryptable(min);
            lastPublicMinHash[role] = minHash;
        }

        if (maxHash != lastPublicMaxHash[role]) {
            FHE.makePubliclyDecryptable(max);
            lastPublicMaxHash[role] = maxHash;
        }

        stats.minSalary = min;
        stats.maxSalary = max;

        emit DebugMinMax(role, stats.totalEntries);
    }

    function _findMin(string memory role) internal returns (euint32) {
        euint32 min;
        bool found = false;

        for (uint i = 0; i < activeEntries.length; i++) {
            ActiveEntry memory entry = activeEntries[i];
            if (keccak256(bytes(entry.role)) == keccak256(bytes(role)) && userSalaries[entry.user][role].isActive) {
                euint32 salary = userSalaries[entry.user][role].encryptedSalary;
                if (!found) {
                    min = salary;
                    found = true;
                } else {
                    min = FHE.select(FHE.lt(salary, min), salary, min);
                }
            }
        }

        require(found, "No active entries for role");
        return min;
    }

    function _findMax(string memory role) internal returns (euint32) {
        euint32 max;
        bool found = false;

        for (uint i = 0; i < activeEntries.length; i++) {
            ActiveEntry memory entry = activeEntries[i];
            if (keccak256(bytes(entry.role)) == keccak256(bytes(role)) && userSalaries[entry.user][role].isActive) {
                euint32 salary = userSalaries[entry.user][role].encryptedSalary;
                if (!found) {
                    max = salary;
                    found = true;
                } else {
                    max = FHE.select(FHE.gt(salary, max), salary, max);
                }
            }
        }

        require(found, "No active entries for role");
        return max;
    }

    function hasActiveEntry(address user, string calldata role) external view returns (bool) {
        return userSalaries[user][role].isActive;
    }

    function getUserRoles(address user) external view returns (string[] memory) {
        uint count = 0;
        for (uint i = 0; i < activeEntries.length; i++) {
            if (activeEntries[i].user == user && userSalaries[user][activeEntries[i].role].isActive) {
                count++;
            }
        }

        string[] memory roles = new string[](count);
        uint idx = 0;
        for (uint i = 0; i < activeEntries.length; i++) {
            if (activeEntries[i].user == user && userSalaries[user][activeEntries[i].role].isActive) {
                roles[idx++] = activeEntries[i].role;
            }
        }

        return roles;
    }

    function getTotalEntries() external view returns (uint256 total) {
        for (uint i = 0; i < activeEntries.length; i++) {
            if (userSalaries[activeEntries[i].user][activeEntries[i].role].isActive) {
                total++;
            }
        }
    }

    function getRoleStats(
        string calldata role
    ) external view returns (euint32 sumSalary, euint32 minSalary, euint32 maxSalary, uint256 totalEntries) {
        ComparisonStats storage stats = roleStats[role];
        return (stats.sumSalary, stats.minSalary, stats.maxSalary, stats.totalEntries);
    }
}
