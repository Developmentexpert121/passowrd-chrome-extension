# Security Overview for Password Extension

This document outlines the security measures and considerations implemented in the password extension system for securely storing and managing user credentials.

## How Passwords Are Stored in the Database

Passwords are **never stored in plaintext** in the database. Instead, a multi-layered encryption approach is used:

### Credential Storage Structure
- **ciphertext**: The encrypted password data
- **cipher_algo**: The symmetric encryption algorithm used (e.g., AES-256-GCM)
- **acl**: Access Control List (JSON array) containing sharing information

### User Key Storage
- **public_key**: User's public key for asymmetric encryption
- **encrypted_private_key**: User's private key, encrypted with a key derived from their password
- **kdf_salt**: Salt used in Key Derivation Function

## Security Measures Against Leakages and Attacks

### 1. Client-Side Encryption
- All password encryption/decryption happens on the client-side
- Passwords are encrypted before being sent to the server
- Server never sees plaintext passwords

### 2. End-to-End Encryption
- Data is encrypted on the user's device and can only be decrypted by authorized users
- Uses hybrid encryption: asymmetric keys for key exchange, symmetric keys for data

### 3. Key Derivation Function (KDF)
- User passwords are used to derive encryption keys via PBKDF2
- Includes salt and multiple iterations for brute-force resistance
- Prevents rainbow table attacks

### 4. Access Control Lists (ACL)
- Fine-grained access control at the credential level
- Only explicitly granted users can access shared credentials
- ACL entries contain encrypted Data Encryption Keys (DEKs)

### 5. Role-Based Permissions
- Three user roles: super_admin, admin, user
- Different access levels for user management and credential operations
- Prevents unauthorized credential creation/modification

## Password Security in API Calls

### Authentication
- JWT (JSON Web Tokens) for API authentication
- Tokens have expiration times
- HTTPS required for all API communications

### Data Transmission
- All sensitive data transmitted over encrypted HTTPS connections
- Encrypted data remains encrypted in transit
- No plaintext passwords in request/response bodies

### API Permissions
- Backend validates user permissions on every request
- Users can only access credentials they're authorized to see
- Super_admin can access all, admin can access team credentials, users only their own

## How Users Access Passwords (Without Storing Plaintext in DB)

The system uses a **hybrid encryption model** where passwords are accessible to authorized users without ever storing them in plaintext:

### 1. Credential Creation Process
```
1. User enters password in browser
2. Client generates random Data Encryption Key (DEK)
3. Password is encrypted with DEK → ciphertext
4. DEK is encrypted with user's public key → wrapped DEK
5. ciphertext and wrapped DEK stored in database
```

### 2. Credential Sharing Process
```
1. Owner wants to share with User B
2. Client fetches User B's public key
3. DEK is re-encrypted with User B's public key
4. New ACL entry created with User B's encrypted DEK
```

### 3. Password Access Process
```
1. User requests to view/use password
2. Client sends request to API (only authorized if user has access)
3. API returns ciphertext and user's encrypted DEK from ACL
4. Client decrypts user's private key using KDF(password)
5. Private key decrypts the DEK
6. DEK decrypts the ciphertext → plaintext password
7. Password displayed/used, then cleared from memory
```

### Key Benefits
- **Zero-Trust Architecture**: Server cannot decrypt user data
- **Forward Secrecy**: Compromised keys don't reveal historical data
- **Granular Access**: Each user gets their own encrypted copy of the DEK
- **Offline Capability**: Once decrypted, passwords can be used without server access

## Threat Mitigation

### Against Database Breaches
- Encrypted data remains useless without user keys
- KDF prevents brute-force attacks on stolen hashes
- Salt ensures unique keys per user

### Against Man-in-the-Middle Attacks
- HTTPS encryption for all communications
- Certificate pinning recommended for production

### Against Insider Threats
- Client-side encryption prevents server admins from accessing data
- Audit logs for credential access (recommended for future implementation)

### Against Client-Side Attacks
- Keys stored encrypted in browser local storage
- Automatic key cleanup after use
- No persistent plaintext in memory

## Compliance Considerations

The system is designed to support compliance with:
- **GDPR**: Data minimization, encryption at rest/transit
- **CCPA**: User data protection and access controls
- **SOX**: Audit trails for financial credential access
- **Industry Standards**: Follows password manager security best practices

## Security Best Practices Implemented

1. **Principle of Least Privilege**: Users only access what they need
2. **Defense in Depth**: Multiple encryption layers
3. **Fail-Safe Defaults**: Deny access by default
4. **Secure Key Management**: Keys never transmitted in plaintext
5. **Regular Key Rotation**: Recommended for long-term security
6. **Secure Deletion**: Keys cleared from memory after use

## Future Security Enhancements

- Hardware Security Module (HSM) integration for key storage
- Multi-factor authentication for critical operations
- Audit logging for all credential access
- Automated security scanning and penetration testing
- Zero-knowledge architecture verification

This security model ensures that user passwords remain protected even in the event of server compromise, network interception, or insider threats.
