/**
 * Simple test to verify the polyfill is loaded correctly
 * This can be run in a browser console after loading the extension
 */

// Test 1: Check if browser namespace exists
console.log('Test 1: Browser namespace exists');
console.log('typeof browser:', typeof browser);
console.log('✓ Pass' + (typeof browser !== 'undefined' ? '' : ' (FAIL)'));

// Test 2: Check if storage API is available
console.log('\nTest 2: Storage API available');
console.log('browser.storage:', typeof browser?.storage);
console.log('browser.storage.sync:', typeof browser?.storage?.sync);
console.log('✓ Pass' + (typeof browser?.storage?.sync !== 'undefined' ? '' : ' (FAIL)'));

// Test 3: Check if runtime API is available
console.log('\nTest 3: Runtime API available');
console.log('browser.runtime:', typeof browser?.runtime);
console.log('browser.runtime.sendMessage:', typeof browser?.runtime?.sendMessage);
console.log('✓ Pass' + (typeof browser?.runtime?.sendMessage !== 'undefined' ? '' : ' (FAIL)'));

// Test 4: Check if APIs return Promises
console.log('\nTest 4: APIs return Promises');
try {
  const result = browser.storage.sync.get('test');
  console.log('storage.sync.get returns:', result?.constructor?.name);
  console.log('✓ Pass' + (result instanceof Promise ? '' : ' (FAIL)'));
} catch (e) {
  console.log('✗ FAIL:', e.message);
}

console.log('\n=== All tests complete ===');
