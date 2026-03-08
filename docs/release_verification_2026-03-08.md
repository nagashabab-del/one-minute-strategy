# Release Verification Report — 2026-03-08

## Metadata
- Generated at (UTC): `2026-03-08T19:51:11Z`
- Repository: `nagashabab-del/one-minute-strategy`
- Scope: Verify GitHub auth state and release state for `release-2026-03-08-auth-ui-stable`

## Command Evidence

### 1) GitHub Auth Status
Command:
```bash
gh auth status
```

Output:
```text
github.com
  ✓ Logged in to github.com account nagashabab-del (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token: gho_************************************
  - Token scopes: 'gist', 'read:org', 'repo'
```

### 2) Release Status
Command:
```bash
gh release view release-2026-03-08-auth-ui-stable --json url,tagName,name,isDraft,isPrerelease
```

Output:
```json
{"isDraft":false,"isPrerelease":false,"name":"Release Baseline 2026-03-08 (Auth + UI)","tagName":"release-2026-03-08-auth-ui-stable","url":"https://github.com/nagashabab-del/one-minute-strategy/releases/tag/release-2026-03-08-auth-ui-stable"}
```

## Verified Result
- Auth is valid and active for account `nagashabab-del`.
- Release exists with tag `release-2026-03-08-auth-ui-stable`.
- Release is published (`isDraft=false`, `isPrerelease=false`).
- Release URL:
  `https://github.com/nagashabab-del/one-minute-strategy/releases/tag/release-2026-03-08-auth-ui-stable`

## Post-Push Evidence

### 3) Push Confirmation
Command:
```bash
git push origin main
```

Output:
```text
To https://github.com/nagashabab-del/one-minute-strategy.git
   b650c78..ffa15e8  main -> main
```

### 4) External Remote HEAD Verification
Command:
```bash
git ls-remote https://github.com/nagashabab-del/one-minute-strategy.git refs/heads/main
```

Output:
```text
ffa15e894aaf9ba4c30efd90356efed6a86e0b9f	refs/heads/main
```

Verification:
- Local target commit: `ffa15e8`
- Remote `main` HEAD starts with: `ffa15e8`
- Result: push is externally verified on GitHub.
