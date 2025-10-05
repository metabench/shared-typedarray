# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2024-10-05

### Added
- **Windows Support!** Full implementation using Windows File Mapping API (CreateFileMapping/MapViewOfFile)
  - Integer keys converted to named objects (e.g., `12345` → `Local\shmkey_12345`)
  - String names converted to named objects (e.g., `/myshm` → `Local\shm_myshm`)
  - All major functionality working on Windows
- Cross-platform abstraction layer in C++ with `#ifdef _WIN32` guards
- Windows-specific `SHM_TYPE_WINDOWS` enum value
- Windows handle tracking in `ShmMeta` structure
- Updated `binding.gyp` for Windows compilation with MSVC

### Changed
- Tests now run on all platforms including Windows
- Updated README to reflect Windows support status
- Platform detection improved - no longer skips Windows tests
- CI/CD workflow includes Windows builds (no longer marked as continue-on-error)

### Fixed
- Platform-specific compilation issues resolved
- Tests work correctly on Windows, Linux, and macOS

## [0.2.0] - 2024-10-05

### Added
- Comprehensive Jest test suite with 33 tests covering:
  - System V shared memory operations
  - POSIX shared memory operations
  - All TypedArray types (Int8Array, Uint8Array, Float32Array, etc.)
  - IPC (Inter-Process Communication) tests
  - Error handling tests
  - Memory tracking tests
- `jest.config.js` for Jest configuration
- `CONTRIBUTING.md` with development guidelines and Windows roadmap
- `CHANGELOG.md` to track version history
- Enhanced `.gitignore` for better coverage of build artifacts
- Platform detection in tests (automatically skip on unsupported platforms)

### Changed
- Updated `package.json` with new package name `shared-typedarray`
- Improved README with:
  - Comprehensive API documentation
  - Platform support matrix
  - Usage examples
  - Testing instructions
  - Clear indication of Windows status
- Test script now runs Jest instead of simple example
- Added `test:example` script to run original example

### Fixed
- Minor compiler warnings in C++ code (missing field initializers)

### Forked
- This is a fork of [shm-typed-array](https://github.com/ukrbublik/shm-typed-array) v0.1.1
- Original implementation preserved for Unix/Linux/macOS platforms
- All original functionality maintained

## [0.1.1] - 2021 (Original shm-typed-array)

### Original Features
- System V shared memory support
- POSIX shared memory support
- Support for Buffer and all TypedArray types
- Automatic cleanup on process exit
- Works on Linux, macOS, FreeBSD
- TypeScript definitions included

---

## Future Plans

### [0.3.0] - Planned
- Windows support using CreateFileMapping/MapViewOfFile APIs
- Cross-platform abstraction layer
- Enhanced error messages with platform-specific details
- Performance optimizations

### [0.4.0] - Planned
- Improved cross-platform testing (CI/CD for all platforms)
- Benchmark suite
- Additional utility functions
- Better documentation with more examples

---

For more details on contributing, see [CONTRIBUTING.md](CONTRIBUTING.md).
