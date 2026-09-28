# Code Signing

This document describes the code signing process for mcode desktop builds. It covers Windows (signtool) and macOS (codesign + notarization). This is documentation only — actual signing is not yet implemented in CI.

## Windows (signtool)

Windows binaries (`.exe`, `.msi`, `.dll`) are signed with `signtool.exe` from the Windows SDK using an Authenticode certificate.

### Prerequisites

- Windows SDK (provides `signtool.exe`)
- An Authenticode code-signing certificate (`.pfx`) — store the password in the `CERT_PASSWORD` secret
- The certificate thumbprint or subject name

### Signing steps

```powershell
# Sign a binary
signtool sign /fd sha256 /tr http://timestamp.digicert.com /td sha256 /f cert.pfx /p %CERT_PASSWORD% packages\cli\dist\mcode.exe

# Verify the signature
signtool verify /pa packages\cli\dist\mcode.exe
```

### CI integration

In a GitHub Actions workflow, use a Windows runner and a step like:

```yaml
- name: Sign Windows binary
  shell: pwsh
  run: |
    signtool sign /fd sha256 /tr http://timestamp.digicert.com /td sha256 `
      /f cert.pfx /p $env:CERT_PASSWORD packages\cli\dist\mcode.exe
  env:
    CERT_PASSWORD: ${{ secrets.CERT_PASSWORD }}
```

## macOS (codesign + notarization)

macOS binaries (`.app`, `.dmg`) are signed with `codesign` and notarized with Apple's notary service.

### Prerequisites

- macOS with Xcode Command Line Tools
- An Apple Developer ID Application certificate
- An App Store Connect API key for notarization (`API_KEY_ID`, `API_KEY_ISSUER_ID`, `API_KEY_FILE`)

### Signing steps

```bash
# Sign the app bundle
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" \
  --options runtime --entitlements entitlements.plist \
  packages/cli/dist/mcode.app

# Create a zip for notarization
ditto -c -k --keepParent packages/cli/dist/mcode.app mcode.zip

# Submit for notarization
xcrun notarytool submit mcode.zip --keychain-profile "mcode-notary" --wait

# Staple the ticket
xcrun stapler staple packages/cli/dist/mcode.app
```

### CI integration

In a GitHub Actions workflow, use a macOS runner:

```yaml
- name: Sign and notarize macOS build
  run: |
    codesign --deep --force --sign "Developer ID Application: Your Name" \
      --options runtime packages/cli/dist/mcode.app
    xcrun notarytool submit mcode.zip --keychain-profile "mcode-notary" --wait
    xcrun stapler staple packages/cli/dist/mcode.app
  env:
    API_KEY_ID: ${{ secrets.API_KEY_ID }}
    API_KEY_ISSUER_ID: ${{ secrets.API_KEY_ISSUER_ID }}
```

## Entitlements (macOS)

`entitlements.plist` for hardened runtime:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
</dict>
</plist>
```
