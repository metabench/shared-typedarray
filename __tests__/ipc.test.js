const cluster = require('cluster');
const os = require('os');

// Check if we're on a supported platform
const isWindows = os.platform() === 'win32';
const isSupported = !isWindows;

let shm;
if (isSupported) {
  try {
    shm = require('../index.js');
  } catch (err) {
    shm = null;
  }
}

describe('Shared TypedArray - IPC Tests', () => {
  const skipOnUnsupported = isSupported ? it : it.skip;
  const skipOnWindows = !isWindows ? it : it.skip;

  beforeEach(() => {
    if (shm) {
      try {
        shm.detachAll();
      } catch (e) {
        // Ignore
      }
    }
  });

  afterEach(() => {
    if (shm && cluster.isMaster) {
      try {
        shm.detachAll();
      } catch (e) {
        // Ignore
      }
    }
  });

  skipOnWindows('should share data between processes using System V', (done) => {
    if (!cluster.isMaster) {
      return;
    }

    const key = 12345700;
    const buf = shm.create(10, 'Buffer', key);
    buf[0] = 100;

    const worker = cluster.fork();
    
    worker.on('message', (msg) => {
      if (msg.type === 'ready') {
        worker.send({ type: 'test', key: key });
      } else if (msg.type === 'result') {
        expect(msg.value).toBe(100);
        worker.kill();
        shm.destroy(key);
        done();
      }
    });

    worker.on('exit', () => {
      shm.detachAll();
    });

    // Timeout
    setTimeout(() => {
      if (!worker.isDead()) {
        worker.kill();
        shm.destroy(key);
        done();
      }
    }, 5000);
  }, 10000);

  skipOnWindows('should share data between processes using POSIX', (done) => {
    if (!cluster.isMaster) {
      return;
    }

    const name = '/test_ipc_' + Date.now();
    const buf = shm.create(10, 'Buffer', name);
    buf[0] = 200;

    const worker = cluster.fork();
    
    worker.on('message', (msg) => {
      if (msg.type === 'ready') {
        worker.send({ type: 'test', name: name });
      } else if (msg.type === 'result') {
        expect(msg.value).toBe(200);
        worker.kill();
        shm.destroy(name);
        done();
      }
    });

    worker.on('exit', () => {
      shm.detachAll();
    });

    // Timeout
    setTimeout(() => {
      if (!worker.isDead()) {
        worker.kill();
        shm.destroy(name);
        done();
      }
    }, 5000);
  }, 10000);
});

// Worker process code
if (cluster.isWorker && isSupported && shm) {
  process.on('message', (msg) => {
    if (msg.type === 'test') {
      try {
        let buf;
        if (msg.key) {
          buf = shm.get(msg.key, 'Buffer');
        } else if (msg.name) {
          buf = shm.get(msg.name, 'Buffer');
        }
        
        if (buf) {
          process.send({ type: 'result', value: buf[0] });
        } else {
          process.send({ type: 'error', error: 'Failed to get shared memory' });
        }
      } catch (e) {
        process.send({ type: 'error', error: e.message });
      }
    }
  });

  process.send({ type: 'ready' });
}
