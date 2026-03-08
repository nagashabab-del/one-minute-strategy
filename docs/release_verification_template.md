# Release Verification Report — {{REPORT_DATE}}

## Metadata
- Generated at (UTC): `{{GENERATED_AT_UTC}}`
- Repository: `{{REPOSITORY}}`
- Scope: Verify GitHub auth state and release state for `{{TAG}}`

## Command Evidence

### 1) GitHub Auth Status
Command:
```bash
gh auth status
```

Output:
```text
{{AUTH_STATUS_OUTPUT}}
```

### 2) Release Status
Command:
```bash
gh release view {{TAG}} --json url,tagName,name,isDraft,isPrerelease
```

Output:
```json
{{RELEASE_JSON_OUTPUT}}
```

## Verified Result
- Release name: `{{RELEASE_NAME}}`
- Release tag: `{{TAG}}`
- Release is published: `{{RELEASE_PUBLISHED}}` (`isDraft={{IS_DRAFT}}`, `isPrerelease={{IS_PRERELEASE}}`)
- Release URL:
  `{{RELEASE_URL}}`

## Optional Remote Head Check
Command:
```bash
{{REMOTE_HEAD_COMMAND}}
```

Output:
```text
{{REMOTE_HEAD_OUTPUT}}
```

Verification:
- Local HEAD short: `{{LOCAL_HEAD_SHORT}}`
- Remote branch checked: `{{DEFAULT_BRANCH}}`
- Remote HEAD short: `{{REMOTE_HEAD_SHORT}}`
