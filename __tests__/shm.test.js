const cluster = require('cluster');
const os = require('os');

// Check if we're on a supported platform
const isWindows = os.platform() === 'win32';
const isSupported = !isWindows;

// Only require shm on supported platforms
let shm;
if (isSupported) {
  try {
    shm = require('../index.js');
  } catch (err) {
    console.error('Failed to load shared-typedarray module:', err.message);
    isSupported && (shm = null);
  }
}

describe('Shared TypedArray', () => {
  const skipOnUnsupported = isSupported ? it : it.skip;
  const skipOnWindows = !isWindows ? it : it.skip;

  beforeAll(() => {
    if (!isSupported) {
      console.warn('Skipping tests on unsupported platform:', os.platform());
    }
  });

  afterEach(() => {
    if (shm && cluster.isMaster) {
      try {
        shm.detachAll();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  });

  describe('Platform Support', () => {
    it('should identify the current platform', () => {
      expect(['linux', 'darwin', 'freebsd', 'win32']).toContain(os.platform());
    });

    skipOnUnsupported('should load the module on supported platforms', () => {
      expect(shm).toBeDefined();
      expect(typeof shm.create).toBe('function');
      expect(typeof shm.get).toBe('function');
      expect(typeof shm.detach).toBe('function');
    });
  });

  describe('Module API', () => {
    skipOnUnsupported('should export required functions', () => {
      expect(shm).toHaveProperty('create');
      expect(shm).toHaveProperty('get');
      expect(shm).toHaveProperty('detach');
      expect(shm).toHaveProperty('destroy');
      expect(shm).toHaveProperty('detachAll');
      expect(shm).toHaveProperty('getTotalSize');
      expect(shm).toHaveProperty('getTotalCreatedSize');
      expect(shm).toHaveProperty('BufferType');
      expect(shm).toHaveProperty('LengthMax');
    });

    skipOnUnsupported('should export BufferType constants', () => {
      expect(shm.BufferType).toHaveProperty('Buffer');
      expect(shm.BufferType).toHaveProperty('Int8Array');
      expect(shm.BufferType).toHaveProperty('Uint8Array');
      expect(shm.BufferType).toHaveProperty('Float32Array');
      expect(shm.BufferType).toHaveProperty('Float64Array');
    });
  });

  describe('System V Shared Memory (SysV)', () => {
    skipOnWindows('should create a shared memory segment with auto key', () => {
      const buf = shm.create(1024, 'Buffer');
      expect(buf).not.toBeNull();
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBe(1024);
      expect(typeof buf.key).toBe('number');
      expect(buf.key).toBeGreaterThan(0);
      shm.detach(buf.key);
    });

    skipOnWindows('should create a shared memory segment with specific key', () => {
      const key = 12345678;
      const buf = shm.create(1024, 'Buffer', key);
      expect(buf).not.toBeNull();
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.key).toBe(key);
      shm.detach(key);
    });

    skipOnWindows('should fail to create segment with duplicate key', () => {
      const key = 12345679;
      const buf1 = shm.create(1024, 'Buffer', key);
      const buf2 = shm.create(1024, 'Buffer', key);
      expect(buf1).not.toBeNull();
      expect(buf2).toBeNull();
      shm.detach(key);
    });

    skipOnWindows('should get existing shared memory segment', () => {
      const key = 12345680;
      const buf1 = shm.create(1024, 'Buffer', key);
      const buf2 = shm.get(key, 'Buffer');
      expect(buf2).not.toBeNull();
      expect(buf2).toBeInstanceOf(Buffer);
      expect(buf2.length).toBe(1024);
      shm.detach(key);
    });

    skipOnWindows('should return null for non-existent key', () => {
      const buf = shm.get(99999999, 'Buffer');
      expect(buf).toBeNull();
    });

    skipOnWindows('should write and read data', () => {
      const key = 12345681;
      const buf = shm.create(10, 'Buffer', key);
      buf[0] = 42;
      buf[1] = 84;
      
      const buf2 = shm.get(key, 'Buffer');
      expect(buf2[0]).toBe(42);
      expect(buf2[1]).toBe(84);
      
      shm.detach(key);
    });

    skipOnWindows('should track memory usage', () => {
      const initialSize = shm.getTotalCreatedSize();
      const key = 12345682;
      const buf = shm.create(1024, 'Buffer', key);
      
      expect(shm.getTotalCreatedSize()).toBe(initialSize + 1024);
      expect(shm.getTotalSize()).toBe(initialSize + 1024);
      
      shm.detach(key);
      expect(shm.getTotalSize()).toBe(initialSize);
      expect(shm.getTotalCreatedSize()).toBe(initialSize);
    });
  });

  describe('POSIX Shared Memory', () => {
    skipOnWindows('should create POSIX shared memory object', () => {
      const name = '/test_posix_' + Date.now();
      const buf = shm.create(1024, 'Buffer', name);
      expect(buf).not.toBeNull();
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBe(1024);
      expect(buf.key).toBeUndefined();
      shm.destroy(name);
    });

    skipOnWindows('should fail to create duplicate POSIX object', () => {
      const name = '/test_posix_dup_' + Date.now();
      const buf1 = shm.create(1024, 'Buffer', name);
      const buf2 = shm.create(1024, 'Buffer', name);
      expect(buf1).not.toBeNull();
      expect(buf2).toBeNull();
      shm.destroy(name);
    });

    skipOnWindows('should get existing POSIX shared memory', () => {
      const name = '/test_posix_get_' + Date.now();
      const buf1 = shm.create(1024, 'Buffer', name);
      const buf2 = shm.get(name, 'Buffer');
      expect(buf2).not.toBeNull();
      expect(buf2).toBeInstanceOf(Buffer);
      expect(buf2.length).toBe(1024);
      shm.destroy(name);
    });

    skipOnWindows('should write and read POSIX shared data', () => {
      const name = '/test_posix_rw_' + Date.now();
      const buf = shm.create(10, 'Buffer', name);
      buf[0] = 123;
      buf[1] = 45;
      
      const buf2 = shm.get(name, 'Buffer');
      expect(buf2[0]).toBe(123);
      expect(buf2[1]).toBe(45);
      
      shm.destroy(name);
    });

    skipOnWindows('should properly destroy POSIX objects', () => {
      const name = '/test_posix_destroy_' + Date.now();
      const buf = shm.create(1024, 'Buffer', name);
      expect(buf).not.toBeNull();
      
      const destroyed = shm.destroy(name);
      expect(destroyed).toBe(true);
      
      const buf2 = shm.get(name, 'Buffer');
      expect(buf2).toBeNull();
    });
  });

  describe('TypedArray Support', () => {
    skipOnWindows('should create Int8Array', () => {
      const arr = shm.create(100, 'Int8Array');
      expect(arr).toBeInstanceOf(Int8Array);
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipOnWindows('should create Uint8Array', () => {
      const arr = shm.create(100, 'Uint8Array');
      expect(arr).toBeInstanceOf(Uint8Array);
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipOnWindows('should create Float32Array', () => {
      const arr = shm.create(100, 'Float32Array');
      expect(arr).toBeInstanceOf(Float32Array);
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipOnWindows('should create Float64Array', () => {
      const arr = shm.create(100, 'Float64Array');
      expect(arr).toBeInstanceOf(Float64Array);
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipOnWindows('should create Int16Array', () => {
      const arr = shm.create(100, 'Int16Array');
      expect(arr).toBeInstanceOf(Int16Array);
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipOnWindows('should create Uint16Array', () => {
      const arr = shm.create(100, 'Uint16Array');
      expect(arr).toBeInstanceOf(Uint16Array);
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipOnWindows('should create Int32Array', () => {
      const arr = shm.create(100, 'Int32Array');
      expect(arr).toBeInstanceOf(Int32Array);
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipOnWindows('should create Uint32Array', () => {
      const arr = shm.create(100, 'Uint32Array');
      expect(arr).toBeInstanceOf(Uint32Array);
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipOnWindows('should handle Float32Array math correctly', () => {
      const arr = shm.create(10, 'Float32Array');
      arr[0] = 3.14159;
      arr[1] = 2.71828;
      
      expect(arr[0]).toBeCloseTo(3.14159, 5);
      expect(arr[1]).toBeCloseTo(2.71828, 5);
      
      shm.detach(arr.key);
    });

    skipOnWindows('should handle typed array byte calculations', () => {
      const arr32 = shm.create(100, 'Float32Array');
      expect(arr32.byteLength).toBe(100 * 4);
      shm.detach(arr32.key);
      
      const arr64 = shm.create(100, 'Float64Array');
      expect(arr64.byteLength).toBe(100 * 8);
      shm.detach(arr64.key);
    });
  });

  describe('Error Handling', () => {
    skipOnWindows('should throw error for invalid type key', () => {
      expect(() => {
        shm.create(100, 'InvalidType');
      }).toThrow();
    });

    skipOnWindows('should throw error for invalid count', () => {
      expect(() => {
        shm.create(-1, 'Buffer');
      }).toThrow();
    });

    skipOnWindows('should throw error for zero count', () => {
      expect(() => {
        shm.create(0, 'Buffer');
      }).toThrow();
    });

    skipOnWindows('should throw error for invalid key range', () => {
      expect(() => {
        shm.create(100, 'Buffer', 0);
      }).toThrow();
    });
  });

  describe('Cleanup', () => {
    skipOnWindows('should detach all shared memory', () => {
      const key1 = 12345683;
      const key2 = 12345684;
      shm.create(1024, 'Buffer', key1);
      shm.create(1024, 'Buffer', key2);
      
      const count = shm.detachAll();
      expect(count).toBeGreaterThanOrEqual(0);
      expect(shm.getTotalSize()).toBe(0);
    });
  });
});
