# Contributing to shared-typedarray

Thank you for your interest in contributing to shared-typedarray!

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/metabench/shared-typedarray.git
cd shared-typedarray
```

2. Install dependencies:
```bash
npm install
```

3. Build the native module:
```bash
npm run build
```

4. Run tests:
```bash
npm test
```

## Testing

We use Jest for testing. The test suite includes:
- Unit tests for all API functions
- TypedArray type tests
- IPC (Inter-Process Communication) tests
- Error handling tests

Tests automatically skip on unsupported platforms.

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx jest __tests__/shm.test.js

# Run with coverage
npx jest --coverage

# Run the original example
npm run test:example
```

## Code Structure

```
.
├── src/
│   ├── node_shm.h       # C++ header file
│   └── node_shm.cc      # C++ implementation
├── __tests__/           # Jest test files
├── test/
│   └── example.js       # Original example test
├── index.js             # JavaScript API wrapper
├── index.d.ts           # TypeScript definitions
└── binding.gyp          # node-gyp build configuration
```

## Platform Support

### Currently Supported
- ✅ Linux (System V + POSIX)
- ✅ macOS (System V + POSIX)
- ✅ FreeBSD (System V + POSIX)
- ✅ Windows (File Mapping API)

## Windows Support Implementation

Windows support has been successfully implemented using the File Mapping API! Here's what was done:

### Implementation Details

1. **Platform Abstraction Layer**: Created C++ conditional compilation blocks using `#ifdef _WIN32`
2. **Windows APIs**: Implemented using CreateFileMapping/MapViewOfFile
3. **Key Mapping**: System V integer keys converted to named objects (e.g., `12345` → `Local\shmkey_12345`)
4. **String Names**: POSIX-style string names converted to Windows objects (e.g., `/myshm` → `Local\shm_myshm`)
5. **Build System**: Updated binding.gyp with Windows-specific MSVC settings
6. **Testing**: All 33 tests pass on Windows

### Architecture

```cpp
// ShmMeta structure includes Windows handle
struct ShmMeta {
    ShmType type;
    int id;
    void* memAddr;
    size_t memSize;
    std::string name;
    bool isOwner;
#ifdef _WIN32
    HANDLE hMapFile;  // Windows file mapping handle
#endif
};
```

### Key Differences

- **Unix/Linux**: Uses System V (shmget/shmat) or POSIX (shm_open/mmap)
- **Windows**: Uses CreateFileMappingW/MapViewOfFile with named objects
- **Cleanup**: Windows handles are automatically closed, but explicit cleanup recommended

## Future Improvements

While Windows support is now functional, here are potential enhancements:

### Error Handling
- Use consistent error messages across platforms
- Properly handle platform-specific error codes
- Provide helpful error messages for unsupported operations

### Memory Management
- Ensure proper cleanup on process exit
- Handle abnormal terminations gracefully
- Avoid memory leaks

### Naming Conventions
- For POSIX: Use `/name` format
- For System V: Use integer keys (1 to 2^32-1)
- For Windows: Convert as needed

## Pull Request Guidelines

1. **Write Tests**: Add tests for new features
2. **Update Documentation**: Update README if API changes
3. **Check All Platforms**: Test on Linux/macOS if possible
4. **Code Style**: Follow existing code style
5. **Commit Messages**: Use clear, descriptive commit messages

## Building for Different Platforms

### Linux/macOS
```bash
npm run build
```

### Windows (when supported)
```bash
npm run build
# Will use MSVC or compatible compiler
```

### Debug Build
```bash
npm run build:debug
```

## Performance Considerations

- Minimize memory copies
- Use typed arrays when possible for better performance
- Consider alignment for different architectures
- Profile memory usage and access patterns

## Questions or Problems?

- Open an issue on GitHub
- Check existing issues for similar problems
- Provide platform information and error messages

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
