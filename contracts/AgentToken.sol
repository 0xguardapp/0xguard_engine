// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title Agent Token
/// @notice ERC-20 token with ERC-3009 gasless transfer support
/// @dev Implements transferWithAuthorization, receiveWithAuthorization, and cancelAuthorization
///      to enable agents to receive payments without sending gas
/// @author 0xGuard
contract AgentToken is ERC20, EIP712 {
    using ECDSA for bytes32;

    /// @notice EIP-712 typehash for TransferWithAuthorization
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    /// @notice EIP-712 typehash for ReceiveWithAuthorization
    bytes32 public constant RECEIVE_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    /// @notice EIP-712 typehash for CancelAuthorization
    bytes32 public constant CANCEL_AUTHORIZATION_TYPEHASH = keccak256(
        "CancelAuthorization(address authorizer,bytes32 nonce)"
    );

    /// @notice Mapping to track used nonces per address for replay protection
    mapping(address => mapping(bytes32 => bool)) private _authorizationStates;

    /// @notice Emitted when an authorization is used
    /// @param authorizer The address that authorized the transfer
    /// @param nonce The unique nonce used for the authorization
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);

    /// @notice Emitted when an authorization is cancelled
    /// @param authorizer The address that cancelled the authorization
    /// @param nonce The unique nonce that was cancelled
    event AuthorizationCancelled(address indexed authorizer, bytes32 indexed nonce);

    /// @notice Constructor mints initial supply to deployer
    /// @param initialSupply The initial token supply to mint to the deployer
    /// @dev Sets up EIP-712 domain separator with token name and version "1"
    constructor(uint256 initialSupply) ERC20("Agent Token", "AGT") EIP712("Agent Token", "1") {
        _mint(msg.sender, initialSupply);
    }

    /// @notice Returns the state of an authorization (whether it has been used)
    /// @param authorizer The address that created the authorization
    /// @param nonce The unique nonce for the authorization
    /// @return True if the authorization has been used, false otherwise
    function authorizationState(address authorizer, bytes32 nonce) external view returns (bool) {
        return _authorizationStates[authorizer][nonce];
    }

    /// @notice Executes a transfer with a signed authorization (ERC-3009)
    /// @dev Allows token holders to authorize transfers via off-chain signatures,
    ///      enabling third parties to execute transactions on their behalf without gas
    /// @param from The address of the token holder authorizing the transfer
    /// @param to The address of the recipient
    /// @param value The amount of tokens to transfer
    /// @param validAfter The timestamp after which the authorization is valid
    /// @param validBefore The timestamp before which the authorization is valid
    /// @param nonce A unique nonce to prevent replay attacks
    /// @param v Recovery byte of the signature
    /// @param r First 32 bytes of the signature
    /// @param s Second 32 bytes of the signature
    /// @custom:requirement Authorization must be within valid time window
    /// @custom:requirement Authorization must not have been used before
    /// @custom:requirement Signature must be valid and match the authorizer
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        _requireValidAuthorization(from, nonce, validAfter, validBefore);

        bytes32 structHash = keccak256(
            abi.encode(
                TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(v, r, s);
        require(signer == from, "AgentToken: invalid signature");

        _markAuthorizationAsUsed(from, nonce);
        _transfer(from, to, value);
    }

    /// @notice Executes a receive with a signed authorization (ERC-3009)
    /// @dev Allows recipients to claim tokens that have been authorized for them,
    ///      enabling gasless transfers where the recipient pays for gas
    /// @param from The address of the token holder authorizing the transfer
    /// @param to The address of the recipient (must be msg.sender)
    /// @param value The amount of tokens to transfer
    /// @param validAfter The timestamp after which the authorization is valid
    /// @param validBefore The timestamp before which the authorization is valid
    /// @param nonce A unique nonce to prevent replay attacks
    /// @param v Recovery byte of the signature
    /// @param r First 32 bytes of the signature
    /// @param s Second 32 bytes of the signature
    /// @custom:requirement Recipient must be msg.sender
    /// @custom:requirement Authorization must be within valid time window
    /// @custom:requirement Authorization must not have been used before
    /// @custom:requirement Signature must be valid and match the authorizer
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(to == msg.sender, "AgentToken: recipient must be caller");
        _requireValidAuthorization(from, nonce, validAfter, validBefore);

        bytes32 structHash = keccak256(
            abi.encode(
                RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(v, r, s);
        require(signer == from, "AgentToken: invalid signature");

        _markAuthorizationAsUsed(from, nonce);
        _transfer(from, to, value);
    }

    /// @notice Cancels a pending authorization to prevent it from being used
    /// @dev Allows token holders to cancel authorizations they no longer want to honor
    /// @param authorizer The address that created the authorization (must be msg.sender)
    /// @param nonce The unique nonce of the authorization to cancel
    /// @param v Recovery byte of the signature
    /// @param r First 32 bytes of the signature
    /// @param s Second 32 bytes of the signature
    /// @custom:requirement Authorizer must be msg.sender
    /// @custom:requirement Authorization must not have been used already
    /// @custom:requirement Signature must be valid and match the authorizer
    function cancelAuthorization(
        address authorizer,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(authorizer == msg.sender, "AgentToken: caller must be authorizer");
        require(!_authorizationStates[authorizer][nonce], "AgentToken: authorization already used");

        bytes32 structHash = keccak256(
            abi.encode(
                CANCEL_AUTHORIZATION_TYPEHASH,
                authorizer,
                nonce
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(v, r, s);
        require(signer == authorizer, "AgentToken: invalid signature");

        _authorizationStates[authorizer][nonce] = true;
        emit AuthorizationCancelled(authorizer, nonce);
    }

    /// @dev Internal function to validate authorization timing and usage
    /// @param authorizer The address that created the authorization
    /// @param nonce The unique nonce for the authorization
    /// @param validAfter The timestamp after which the authorization is valid
    /// @param validBefore The timestamp before which the authorization is valid
    function _requireValidAuthorization(
        address authorizer,
        bytes32 nonce,
        uint256 validAfter,
        uint256 validBefore
    ) internal view {
        require(block.timestamp > validAfter, "AgentToken: authorization not yet valid");
        require(block.timestamp < validBefore, "AgentToken: authorization expired");
        require(!_authorizationStates[authorizer][nonce], "AgentToken: authorization already used");
    }

    /// @dev Internal function to mark an authorization as used
    /// @param authorizer The address that created the authorization
    /// @param nonce The unique nonce for the authorization
    function _markAuthorizationAsUsed(address authorizer, bytes32 nonce) internal {
        _authorizationStates[authorizer][nonce] = true;
        emit AuthorizationUsed(authorizer, nonce);
    }
}

