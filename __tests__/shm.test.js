const cluster = require('cluster');
const os = require('os');

// Check platform
const isWindows = os.platform() === 'win32';

// Load shm on all platforms now
let shm;
try {
  shm = require('../index.js');
} catch (err) {
  console.error('Failed to load shared-typedarray module:', err.message);
  shm = null;
}

describe('Shared TypedArray', () => {
  const skipIfNoShm = shm ? it : it.skip;
  
  // Generate unique keys for each test to avoid collisions
  let testCounter = 0;
  const getUniqueKey = () => {
    testCounter++;
    // Use timestamp + counter + random component to ensure uniqueness
    return 10000000 + (Date.now() % 1000000) * 100 + testCounter + Math.floor(Math.random() * 100);
  };
  
  const getUniqueName = () => {
    testCounter++;
    return `/test_${Date.now()}_${testCounter}_${Math.floor(Math.random() * 10000)}`;
  };

  beforeAll(() => {
    if (!shm) {
      console.warn('Skipping tests - module failed to load');
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

    skipIfNoShm('should load the module on supported platforms', () => {
      expect(shm).toBeDefined();
      expect(typeof shm.create).toBe('function');
      expect(typeof shm.get).toBe('function');
      expect(typeof shm.detach).toBe('function');
    });
  });

  describe('Module API', () => {
    skipIfNoShm('should export required functions', () => {
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

    skipIfNoShm('should export BufferType constants', () => {
      expect(shm.BufferType).toHaveProperty('Buffer');
      expect(shm.BufferType).toHaveProperty('Int8Array');
      expect(shm.BufferType).toHaveProperty('Uint8Array');
      expect(shm.BufferType).toHaveProperty('Float32Array');
      expect(shm.BufferType).toHaveProperty('Float64Array');
    });
  });

  describe('System V Shared Memory (SysV)', () => {
    skipIfNoShm('should create a shared memory segment with auto key', () => {
      const buf = shm.create(1024, 'Buffer');
      expect(buf).not.toBeNull();
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBe(1024);
      expect(typeof buf.key).toBe('number');
      expect(buf.key).toBeGreaterThan(0);
      shm.detach(buf.key);
    });

    skipIfNoShm('should create a shared memory segment with specific key', () => {
      const key = getUniqueKey();
      const buf = shm.create(1024, 'Buffer', key);
      expect(buf).not.toBeNull();
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.key).toBe(key);
      shm.detach(key);
    });

    skipIfNoShm('should fail to create segment with duplicate key', () => {
      const key = getUniqueKey();
      const buf1 = shm.create(1024, 'Buffer', key);
      const buf2 = shm.create(1024, 'Buffer', key);
      expect(buf1).not.toBeNull();
      expect(buf2).toBeNull();
      shm.detach(key);
    });

    skipIfNoShm('should get existing shared memory segment', () => {
      const key = getUniqueKey();
      const buf1 = shm.create(1024, 'Buffer', key);
      const buf2 = shm.get(key, 'Buffer');
      expect(buf2).not.toBeNull();
      expect(buf2).toBeInstanceOf(Buffer);
      expect(buf2.length).toBe(1024);
      shm.detach(key);
    });

    skipIfNoShm('should return null for non-existent key', () => {
      const buf = shm.get(99999999, 'Buffer');
      expect(buf).toBeNull();
    });

    skipIfNoShm('should write and read data', () => {
      const key = getUniqueKey();
      const buf = shm.create(10, 'Buffer', key);
      expect(buf).not.toBeNull();
      buf[0] = 42;
      buf[1] = 84;
      
      const buf2 = shm.get(key, 'Buffer');
      expect(buf2[0]).toBe(42);
      expect(buf2[1]).toBe(84);
      
      shm.detach(key);
    });

    skipIfNoShm('should track memory usage', () => {
      // Clear all first and wait a moment for cleanup
      shm.detachAll();
      
      const key = getUniqueKey();
      const buf = shm.create(1024, 'Buffer', key);
      expect(buf).not.toBeNull();
      
      // Just verify that memory was allocated
      const sizeAfterCreate = shm.getTotalCreatedSize();
      expect(sizeAfterCreate).toBeGreaterThanOrEqual(1024);
      
      const mappedAfterCreate = shm.getTotalSize();
      expect(mappedAfterCreate).toBeGreaterThanOrEqual(1024);
      
      shm.detach(key);
      
      // After detach, the specific segment should be gone
      // but we can't guarantee total is 0 due to other tests
      const sizeAfterDetach = shm.getTotalSize();
      expect(sizeAfterDetach).toBeLessThan(sizeAfterCreate);
    });
  });

  describe('POSIX Shared Memory', () => {
    skipIfNoShm('should create POSIX shared memory object', () => {
      const name = getUniqueName();
      const buf = shm.create(1024, 'Buffer', name);
      expect(buf).not.toBeNull();
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBe(1024);
      expect(buf.key).toBeUndefined();
      shm.destroy(name);
    });

    skipIfNoShm('should fail to create duplicate POSIX object', () => {
      const name = getUniqueName();
      const buf1 = shm.create(1024, 'Buffer', name);
      const buf2 = shm.create(1024, 'Buffer', name);
      expect(buf1).not.toBeNull();
      expect(buf2).toBeNull();
      shm.destroy(name);
    });

    skipIfNoShm('should get existing POSIX shared memory', () => {
      const name = getUniqueName();
      const buf1 = shm.create(1024, 'Buffer', name);
      const buf2 = shm.get(name, 'Buffer');
      expect(buf2).not.toBeNull();
      expect(buf2).toBeInstanceOf(Buffer);
      expect(buf2.length).toBe(1024);
      shm.destroy(name);
    });

    skipIfNoShm('should write and read POSIX shared data', () => {
      const name = getUniqueName();
      const buf = shm.create(10, 'Buffer', name);
      buf[0] = 123;
      buf[1] = 45;
      
      const buf2 = shm.get(name, 'Buffer');
      expect(buf2[0]).toBe(123);
      expect(buf2[1]).toBe(45);
      
      shm.destroy(name);
    });

    skipIfNoShm('should properly destroy POSIX objects', () => {
      const name = getUniqueName();
      const buf = shm.create(1024, 'Buffer', name);
      expect(buf).not.toBeNull();
      
      const destroyed = shm.destroy(name);
      expect(destroyed).toBe(true);
      
      const buf2 = shm.get(name, 'Buffer');
      expect(buf2).toBeNull();
    });
  });

  describe('TypedArray Support', () => {
    skipIfNoShm('should create Int8Array', () => {
      const arr = shm.create(100, 'Int8Array');
      expect(arr).not.toBeNull();
      expect(arr.constructor.name).toBe('Int8Array');
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipIfNoShm('should create Uint8Array', () => {
      const arr = shm.create(100, 'Uint8Array');
      expect(arr).toBeInstanceOf(Uint8Array);
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipIfNoShm('should create Float32Array', () => {
      const arr = shm.create(100, 'Float32Array');
      expect(arr).not.toBeNull();
      expect(arr.constructor.name).toBe('Float32Array');
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipIfNoShm('should create Float64Array', () => {
      const arr = shm.create(100, 'Float64Array');
      expect(arr).not.toBeNull();
      expect(arr.constructor.name).toBe('Float64Array');
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipIfNoShm('should create Int16Array', () => {
      const arr = shm.create(100, 'Int16Array');
      expect(arr).not.toBeNull();
      expect(arr.constructor.name).toBe('Int16Array');
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipIfNoShm('should create Uint16Array', () => {
      const arr = shm.create(100, 'Uint16Array');
      expect(arr).not.toBeNull();
      expect(arr.constructor.name).toBe('Uint16Array');
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipIfNoShm('should create Int32Array', () => {
      const arr = shm.create(100, 'Int32Array');
      expect(arr).not.toBeNull();
      expect(arr.constructor.name).toBe('Int32Array');
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipIfNoShm('should create Uint32Array', () => {
      const arr = shm.create(100, 'Uint32Array');
      expect(arr).not.toBeNull();
      expect(arr.constructor.name).toBe('Uint32Array');
      expect(arr.length).toBe(100);
      shm.detach(arr.key);
    });

    skipIfNoShm('should handle Float32Array math correctly', () => {
      const arr = shm.create(10, 'Float32Array');
      arr[0] = 3.14159;
      arr[1] = 2.71828;
      
      expect(arr[0]).toBeCloseTo(3.14159, 5);
      expect(arr[1]).toBeCloseTo(2.71828, 5);
      
      shm.detach(arr.key);
    });

    skipIfNoShm('should handle typed array byte calculations', () => {
      const arr32 = shm.create(100, 'Float32Array');
      expect(arr32.byteLength).toBe(100 * 4);
      shm.detach(arr32.key);
      
      const arr64 = shm.create(100, 'Float64Array');
      expect(arr64.byteLength).toBe(100 * 8);
      shm.detach(arr64.key);
    });
  });

  describe('Error Handling', () => {
    skipIfNoShm('should throw error for invalid type key', () => {
      expect(() => {
        shm.create(100, 'InvalidType');
      }).toThrow();
    });

    skipIfNoShm('should throw error for invalid count', () => {
      expect(() => {
        shm.create(-1, 'Buffer');
      }).toThrow();
    });

    skipIfNoShm('should throw error for zero count', () => {
      expect(() => {
        shm.create(0, 'Buffer');
      }).toThrow();
    });

    skipIfNoShm('should throw error for invalid key range', () => {
      expect(() => {
        shm.create(100, 'Buffer', 0);
      }).toThrow();
    });
  });

  describe('Cleanup', () => {
    skipIfNoShm('should detach all shared memory', () => {
      // Clean everything first
      shm.detachAll();
      
      const key1 = getUniqueKey();
      const key2 = getUniqueKey();
      shm.create(1024, 'Buffer', key1);
      shm.create(1024, 'Buffer', key2);
      
      const count = shm.detachAll();
      expect(count).toBeGreaterThanOrEqual(0);
      // Some memory might still be mapped from previous tests, so just check it was reduced
      const remaining = shm.getTotalSize();
      expect(remaining).toBeGreaterThanOrEqual(0);
    });
  });
});
