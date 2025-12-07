// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Agent Reputation Registry
/// @notice ERC-8004 compatible contract for managing agent reputation scores on-chain
/// @dev This contract allows tracking and updating agent reputation scores
///      with evidence references stored as URIs pointing to Unibase record keys
/// @author 0xGuard
contract AgentReputationRegistry is Ownable {
    /// @notice Structure to store agent reputation information
    /// @param score The current reputation score (floored at 0)
    /// @param lastUpdated Timestamp when the reputation was last updated
    /// @param evidenceURI The URI reference to the Unibase record key containing evidence
    struct Reputation {
        uint256 score;
        uint256 lastUpdated;
        string evidenceURI;
    }

    /// @notice Mapping from agent address to their reputation information
    mapping(address => Reputation) private agentReputations;

    /// @notice Emitted when an agent's reputation is updated
    /// @param agent The address of the agent whose reputation was updated
    /// @param score The new reputation score after the update
    /// @param evidenceURI The URI reference to the Unibase record key containing evidence
    event ReputationUpdated(address indexed agent, uint256 score, string evidenceURI);

    /// @notice Constructor sets the contract deployer as the initial owner
    /// @dev Uses OpenZeppelin's Ownable pattern for access control
    constructor() Ownable(msg.sender) {}

    /// @notice Updates the reputation score for an agent
    /// @dev Only the contract owner (admin) can update reputations
    /// @dev The reputation score is floored at 0 and cannot go negative
    /// @dev The evidenceURI should reference a Unibase record key containing evidence
    /// @param agent The address of the agent whose reputation should be updated
    /// @param delta The change in reputation score (can be positive or negative)
    /// @param evidenceURI The URI reference to the Unibase record key containing evidence
    /// @custom:requirement agent must not be the zero address
    /// @custom:requirement evidenceURI must not be empty
    function updateReputation(
        address agent,
        int256 delta,
        string calldata evidenceURI
    ) external onlyOwner {
        _updateReputation(agent, delta, evidenceURI);
    }

    /// @dev Internal function to update reputation score
    /// @param agent The address of the agent whose reputation should be updated
    /// @param delta The change in reputation score (can be positive or negative)
    /// @param evidenceURI The URI reference to the Unibase record key containing evidence
    function _updateReputation(
        address agent,
        int256 delta,
        string calldata evidenceURI
    ) internal {
        require(agent != address(0), "AgentReputationRegistry: invalid agent address");
        require(bytes(evidenceURI).length > 0, "AgentReputationRegistry: evidenceURI cannot be empty");

        Reputation storage reputation = agentReputations[agent];
        uint256 currentScore = reputation.score;
        
        // Calculate new score with floor at 0
        uint256 newScore;
        if (delta >= 0) {
            // Positive delta: add to current score
            newScore = currentScore + uint256(delta);
        } else {
            // Negative delta: subtract from current score, but floor at 0
            uint256 absDelta = uint256(-delta);
            if (absDelta >= currentScore) {
                newScore = 0;
            } else {
                newScore = currentScore - absDelta;
            }
        }

        // Update reputation
        reputation.score = newScore;
        reputation.lastUpdated = block.timestamp;
        reputation.evidenceURI = evidenceURI;

        emit ReputationUpdated(agent, newScore, evidenceURI);
    }

    /// @notice Retrieves the reputation information for an agent
    /// @dev Returns a Reputation struct with score 0 and empty evidenceURI if agent is not registered
    /// @param agent The address of the agent to query
    /// @return The Reputation struct containing score, lastUpdated, and evidenceURI
    function getReputation(address agent) external view returns (Reputation memory) {
        return agentReputations[agent];
    }

    /// @notice Retrieves only the reputation score for an agent
    /// @param agent The address of the agent to query
    /// @return The current reputation score (0 if agent has no reputation record)
    function getReputationScore(address agent) external view returns (uint256) {
        return agentReputations[agent].score;
    }

    /// @notice Checks if an agent has a reputation record
    /// @param agent The address of the agent to check
    /// @return True if the agent has a reputation record (lastUpdated > 0), false otherwise
    function hasReputation(address agent) external view returns (bool) {
        return agentReputations[agent].lastUpdated > 0;
    }

    /// @notice Batch update reputations for multiple agents
    /// @dev Only the contract owner can perform batch updates
    /// @param agents Array of agent addresses to update
    /// @param deltas Array of reputation score deltas (must match agents array length)
    /// @param evidenceURIs Array of evidence URIs (must match agents array length)
    /// @custom:requirement All arrays must have the same length
    function batchUpdateReputation(
        address[] calldata agents,
        int256[] calldata deltas,
        string[] calldata evidenceURIs
    ) external onlyOwner {
        require(
            agents.length == deltas.length && agents.length == evidenceURIs.length,
            "AgentReputationRegistry: array length mismatch"
        );

        for (uint256 i = 0; i < agents.length; i++) {
            _updateReputation(agents[i], deltas[i], evidenceURIs[i]);
        }
    }
}

