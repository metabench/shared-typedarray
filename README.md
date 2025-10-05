# shared-typedarray

[![npm version](https://img.shields.io/npm/v/shared-typedarray.svg)](https://www.npmjs.com/package/shared-typedarray)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Fork of [shm-typed-array](https://github.com/ukrbublik/shm-typed-array) with improved testing and cross-platform support focus.

## Overview

Cross-platform IPC shared memory for Node.js. Use as `Buffer` or `TypedArray`.
Supports System V and POSIX shared memory on Unix-like systems, and Windows File Mapping on Windows.

**Platform Support:**
- ✅ Linux - Full support (System V + POSIX)
- ✅ macOS - Full support (System V + POSIX, with limitations)
- ✅ FreeBSD - Full support (System V + POSIX)
- ✅ Windows - Full support (File Mapping API)

## Install

```bash
npm install shared-typedarray
```

The library now supports all major platforms including Windows. On Windows, it uses the CreateFileMapping/MapViewOfFile APIs to provide shared memory functionality compatible with the Unix API.

## System V vs POSIX vs Windows

The library supports different types of shared memory depending on the platform:

### Unix/Linux Platforms

#### System V (Classic)
- Uses integer keys
- Stored internally in the kernel
- Automatically cleaned up when no processes are attached
- Example: `shm.create(100, 'Buffer', 1234)`

#### POSIX (Modern)
- Uses string names (starting with `/`)
- Uses filesystem interface
- Must be explicitly destroyed with `shm.destroy(name)`
- Example: `shm.create(100, 'Buffer', '/myshm')`

**Note:** POSIX support may be limited on macOS. System V is generally more portable on Unix systems.

### Windows Platform

On Windows, both integer keys and string names are supported through the Windows File Mapping API:
- Integer keys are converted to named objects (e.g., key `12345` becomes `Local\shmkey_12345`)
- String names are also converted to named objects (e.g., `/myshm` becomes `Local\shm_myshm`)
- All Windows shared memory must be explicitly destroyed with `shm.destroy()` or `shm.detachAll()`
- Example: `shm.create(100, 'Buffer', 12345)` or `shm.create(100, 'Buffer', '/myshm')`

## API

### shm.create(count, typeKey, key?, perm?)

Create shared memory segment/object.

**Parameters:**
- `count` - Number of elements (not bytes)
- `typeKey` - Type of elements (default: `'Buffer'`), see [Types](#types)
- `key` - Integer/null for System V segment, or string (starting with `/`) for POSIX object
- `perm` - Permissions flag (default: `'660'`)

**Returns:** Shared memory `Buffer` or descendant of `TypedArray` object, or `null` if already exists.

**System V:** Returned object has property `key` - integer key for use in `shm.get(key)`.

**POSIX:** Objects are not automatically destroyed. Call `shm.destroy(key)` manually when done.

```javascript
const buf = shm.create(4096); // 4KB Buffer, auto-generated System V key
const arr = shm.create(1000, 'Float32Array', 12345); // System V with specific key
const posix = shm.create(1000, 'Float32Array', '/myshm'); // POSIX
```

### shm.get(key, typeKey)

Get existing shared memory segment/object by key.

**Returns:** Shared memory object, or `null` if not found.

```javascript
const buf = shm.get(12345, 'Buffer');
const arr = shm.get('/myshm', 'Float32Array');
```

### shm.detach(key, forceDestroy?)

Detach shared memory segment/object.

**System V:** Automatically destroyed when no processes are attached (even if `forceDestroy` is false).

**POSIX:** Must set `forceDestroy = true` or use `shm.destroy(key)` to destroy.

**Returns:** 0 on destroy, count of remaining attaches, or -1 if not found.

### shm.destroy(key)

Destroy shared memory segment/object. Same as `shm.detach(key, true)`.

**Returns:** `true` if destroyed, `false` otherwise.

```javascript
shm.destroy('/myshm'); // Required for POSIX
shm.destroy(12345); // Optional for System V
```

### shm.detachAll()

Detach all created shared memory segments and objects.
Automatically called on process exit (see [Cleanup](#cleanup)).

**Returns:** Count of destroyed System V segments.

### shm.getTotalSize()

Get total size of all *mapped* (used) shared memory in bytes.

### shm.getTotalCreatedSize()

Get total size of all *created* shared memory in bytes.

### shm.LengthMax

Max length of shared memory segment (count of elements, not bytes):
- 2^31 for 64-bit systems
- 2^30 for 32-bit systems

### Types

```javascript
shm.BufferType = {
  'Buffer': shm.SHMBT_BUFFER,
  'Int8Array': shm.SHMBT_INT8,
  'Uint8Array': shm.SHMBT_UINT8,
  'Uint8ClampedArray': shm.SHMBT_UINT8CLAMPED,
  'Int16Array': shm.SHMBT_INT16,
  'Uint16Array': shm.SHMBT_UINT16,
  'Int32Array': shm.SHMBT_INT32,
  'Uint32Array': shm.SHMBT_UINT32,
  'Float32Array': shm.SHMBT_FLOAT32,
  'Float64Array': shm.SHMBT_FLOAT64,
};
```

## Cleanup

This library performs cleanup of created shared memory segments/objects only on normal process exit (via the `exit` event).

For cleanup on termination signals (`SIGINT`, `SIGTERM`), use [node-cleanup](https://github.com/jtlapp/node-cleanup) or [node-death](https://github.com/jprichardson/node-death):

```javascript
const cleanup = require('node-cleanup');
cleanup(() => {
  shm.detachAll();
});
```

**Important Notes:**
- **POSIX** (Unix/Linux): Shared memory objects are NOT automatically destroyed. Always call `shm.destroy(name)` when done.
- **Windows**: All shared memory mappings are automatically closed when no more handles exist, but it's still recommended to call `shm.destroy()` or `shm.detachAll()` for explicit cleanup.

## Usage Example

```javascript
const cluster = require('cluster');
const shm = require('shared-typedarray');

if (cluster.isMaster) {
  // Create shared memory
  const buf = shm.create(4096); // 4KB Buffer
  const arr = shm.create(1000000, 'Float32Array', '/myshm'); // 1M floats, POSIX
  
  buf[0] = 1;
  arr[0] = 10.0;
  
  console.log('Master created:', buf.constructor.name, arr.constructor.name);
  
  const worker = cluster.fork();
  worker.on('online', () => {
    worker.send({ 
      bufKey: buf.key,
      arrKey: '/myshm'
    });
  });
  
  // Cleanup
  process.on('exit', () => {
    shm.destroy('/myshm'); // Destroy POSIX object
  });
  
} else {
  process.on('message', (data) => {
    const buf = shm.get(data.bufKey);
    const arr = shm.get(data.arrKey, 'Float32Array');
    
    console.log('Worker received:', buf[0], arr[0]);
  });
}
```

See [test/example.js](test/example.js) for a complete example.

## Testing

The library includes a comprehensive Jest test suite:

```bash
# Run all tests
npm test

# Run the original example test
npm run test:example
```

Tests are automatically skipped on unsupported platforms.

## Development

```bash
# Install dependencies
npm install

# Build the native module
npm run build

# Build in debug mode
npm run build:debug

# Run tests
npm test
```

## Cross-Platform Status

### Current Implementation
- **Linux**: Full support for System V and POSIX shared memory
- **macOS**: Full support with some POSIX limitations
- **FreeBSD**: Full support
- **Windows**: Not yet supported

### Planned Improvements
- [ ] Windows support using CreateFileMapping/MapViewOfFile APIs
- [ ] Better cross-platform abstractions
- [ ] Enhanced error messages and diagnostics
- [ ] Performance optimizations

## License

MIT License - see [LICENSE](LICENSE) file

Original work Copyright (c) 2021 Denis Oblogin  
Modified work Copyright (c) 2024 metabench

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

This is a fork of [shm-typed-array](https://github.com/ukrbublik/shm-typed-array) by Denis Oblogin, with improvements focused on testing and cross-platform support.