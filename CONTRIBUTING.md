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

### In Progress
- ⚠️ Windows (planned)

## Windows Support Roadmap

Windows support is a priority. Here's what needs to be done:

### 1. Windows Shared Memory Implementation

Windows uses different APIs for shared memory:
- `CreateFileMapping()` / `CreateFileMappingW()` - Create shared memory
- `OpenFileMapping()` / `OpenFileMappingW()` - Open existing shared memory
- `MapViewOfFile()` - Map into process address space
- `UnmapViewOfFile()` - Unmap from address space
- `CloseHandle()` - Close handle

### 2. Cross-Platform Abstraction Layer

Create a platform abstraction layer in C++:

```cpp
// Pseudo-code structure
#ifdef _WIN32
  // Windows implementation
  struct WindowsShmHandle {
    HANDLE hMapFile;
    void* addr;
    size_t size;
  };
#else
  // Unix/Linux implementation
  struct UnixShmHandle {
    int shmid;      // System V
    int fd;         // POSIX
    void* addr;
    size_t size;
  };
#endif
```

### 3. Unified API

The JavaScript API should remain the same across platforms:
- `shm.create(count, type, key)` - Works on all platforms
- `shm.get(key, type)` - Works on all platforms
- `shm.detach(key)` - Works on all platforms

### 4. Windows-Specific Considerations

- Windows shared memory always uses string names (like POSIX)
- No direct equivalent to System V integer keys
- Consider emulating System V keys by converting integers to named objects
- Handle Unicode properly with wide strings

### 5. Build System Updates

Update `binding.gyp` to handle Windows compilation:

```python
{
  "targets": [{
    "target_name": "shm",
    "sources": [
      "src/node_shm.h",
      "src/node_shm.cc"
    ],
    "conditions": [
      ["OS=='win'", {
        # Windows-specific flags
      }],
      ["OS!='win'", {
        "libraries": ["-lrt"]
      }]
    ]
  }]
}
```

### 6. Testing on Windows

- Set up Windows CI/CD pipeline
- Ensure all Jest tests pass on Windows
- Test both named and integer key APIs
- Performance benchmarking

## Cross-Platform Best Practices

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
