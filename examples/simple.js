/**
 * Simple example demonstrating shared-typedarray usage
 * This creates shared memory that can be accessed by multiple processes
 */

const shm = require('../index.js');

console.log('=== Shared TypedArray Simple Example ===\n');

// 1. Create a shared Buffer (System V with auto-generated key)
console.log('1. Creating shared Buffer...');
const buf = shm.create(1024, 'Buffer');
console.log(`   Created Buffer with key: ${buf.key}, length: ${buf.length} bytes`);

// Write some data
buf[0] = 42;
buf[1] = 100;
buf.write('Hello from shared memory!', 10);

// 2. Create a Float32Array in shared memory (System V with specific key)
console.log('\n2. Creating Float32Array...');
const key = 12345678;
const arr = shm.create(100, 'Float32Array', key);
if (arr) {
  console.log(`   Created Float32Array with key: ${arr.key}, length: ${arr.length} elements`);
  arr[0] = 3.14159;
  arr[1] = 2.71828;
  console.log(`   Stored values: [${arr[0]}, ${arr[1]}]`);
} else {
  console.log('   Failed to create (key might already be in use)');
}

// 3. Create POSIX shared memory
console.log('\n3. Creating POSIX shared memory...');
const posixName = '/example_' + Date.now();
const posixBuf = shm.create(512, 'Buffer', posixName);
if (posixBuf) {
  console.log(`   Created POSIX buffer with name: ${posixName}, length: ${posixBuf.length} bytes`);
  posixBuf.write('POSIX shared memory');
} else {
  console.log('   Failed to create POSIX shared memory');
}

// 4. Get memory usage statistics
console.log('\n4. Memory statistics:');
console.log(`   Total created: ${shm.getTotalCreatedSize()} bytes`);
console.log(`   Total mapped: ${shm.getTotalSize()} bytes`);
console.log(`   Max length: ${shm.LengthMax} elements`);

// 5. Demonstrate reading back the data
console.log('\n5. Reading data back:');
const buf2 = shm.get(buf.key, 'Buffer');
if (buf2) {
  console.log(`   Buffer[0] = ${buf2[0]}, Buffer[1] = ${buf2[1]}`);
  console.log(`   String at offset 10: ${buf2.toString('utf8', 10, 35)}`);
}

const arr2 = shm.get(key, 'Float32Array');
if (arr2) {
  console.log(`   Float32Array[0] = ${arr2[0]}, Float32Array[1] = ${arr2[1]}`);
}

// 6. Cleanup - very important!
console.log('\n6. Cleaning up...');
if (buf) {
  shm.detach(buf.key);
  console.log('   Detached Buffer');
}
if (arr) {
  shm.detach(arr.key);
  console.log('   Detached Float32Array');
}
if (posixBuf) {
  shm.destroy(posixName);
  console.log('   Destroyed POSIX buffer (POSIX requires explicit destroy)');
}

console.log('\n7. Final memory usage:');
console.log(`   Total: ${shm.getTotalSize()} bytes (should be 0)`);

console.log('\n=== Example Complete ===');
