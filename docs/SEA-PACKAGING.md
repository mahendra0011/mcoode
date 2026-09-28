# Single Executable Application (SEA) Packaging

This document describes how to build a Single Executable Application (SEA) using Node.js 20+ SEA feature for mcode CLI. This is documentation only.

## Overview

Node.js 20+ supports building a Single Executable Application — a self-contained binary that bundles the Node.js runtime and your application code. Users can run it without installing Node.js.

## Prerequisites

- Node.js >= 20.5.0 (SEA support landed in v20.5.0, stable in v20.12+)
- The application must be a single entry point (or use a loader script)

## Build Steps

### 1. Create a SEA configuration file

Create `sea-config.json`:

```json
{
  "main": "packages/cli/bin/mcode.js",
  "output": "mcode-sea",
  "disableExperimentalSEAWarning": true
}
```

### 2. Generate the SEA blob

```powershell
node --experimental-sea-config sea-config.json
```

This produces `sea-prep.blob`.

### 3. Copy the Node.js executable

Copy the platform-specific Node.js binary as the base for the SEA.

#### Windows

```powershell
# Copy node.exe from your Node.js installation
copy "C:\Program Files\nodejs\node.exe" mcode.exe

# Inject the blob
npx postject mcode.exe NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
```

#### macOS

```bash
# Copy the node binary
cp $(which node) mcode

# Inject the blob
npx postject mcode NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
```

#### Linux

```bash
# Copy the node binary
cp $(which node) mcode

# Inject the blob
npx postject mcode NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
```

### 4. (macOS/Linux) Set executable permissions

```bash
chmod +x mcode
```

## Platform-Specific Notes

### Windows

- The resulting `mcode.exe` is a full SEA — no separate Node.js install required.
- Consider code signing with `signtool` (see [CODE-SIGNING.md](./CODE-SIGNING.md)).
- The `--experimental-sea-config` flag is not needed on Node 22+; use `node sea-config.json` directly.

### macOS

- The resulting binary is a full SEA.
- You must sign and notarize the SEA after injection (see [CODE-SIGNING.md](./CODE-SIGNING.md)):
  ```bash
  codesign --deep --force --sign "Developer ID Application: Your Name" --options runtime mcode
  xcrun notarytool submit mcode --keychain-profile "mcode-notary" --wait
  xcrun stapler staple mcode
  ```

### Linux

- The resulting binary is a full SEA.
- No signing required, but you may want to distribute via a package manager (`.deb`, `.rpm`, AppImage).
- Ensure the binary is built on a system with a glibc version compatible with your target platforms.

## Bundling Application Code

For a production SEA, you typically want to bundle your TypeScript/JS into a single file first:

```powershell
# Bundle with esbuild
npx esbuild packages/cli/bin/mcode.js --bundle --platform=node --outfile=mcode-bundled.js

# Update sea-config.json to point at the bundle
# { "main": "mcode-bundled.js", "output": "mcode-sea" }
```

Native modules (`.node` files) cannot be bundled and must be loaded at runtime via a loader script referenced in the SEA config.

## Verifying the SEA

```bash
# Run the SEA directly
./mcode --version
mcode.exe --version
```

If the SEA runs without a Node.js installation on the target machine, packaging succeeded.
