const fc = require('fast-check');
const { processPost, processBatch, processAllPosts } = require('./post-processor');

let consoleErrorSpy;
let consoleWarnSpy;
let consoleLogSpy;

class MockHTMLElement {
  constructor(tagName, attributes = {}, textContent = '') {
    this.tagName = tagName.toUpperCase();
    this.textContent = textContent;
    this.attributes = attributes;
    this.children = [];
    this.dataset = attributes;
  }
  
  querySelectorAll(selector) {
    return this.children.filter(child => {
      if (selector === 'a') return child.tagName === 'A';
      if (selector === 'img') return child.tagName === 'IMG';
      return false;
    });
  }
  
  querySelector(selector) {
    const results = this.querySelectorAll(selector);
    return results.length > 0 ? results[0] : null;
  }
  
  getBoundingClientRect() {
    return this.attributes.hidden ? { width: 0, height: 0 } : { width: 100, height: 100 };
  }
  
  closest() { return null; }
  hasAttribute() { return false; }
  setAttribute() {}
  removeAttribute() {}
}

global.HTMLElement = MockHTMLElement;

function createMockElement(tagName, attributes = {}, textContent = '') {
  return new MockHTMLElement(tagName, attributes, textContent);
}

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleLogSpy.mockRestore();
});

const malformedPostArbitrary = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant({}),
  fc.constant([]),
  fc.constant('string'),
  fc.constant(123),
  fc.constant(true),
  fc.constant(createMockElement('div', {}, '')),
  fc.constant(createMockElement('article', {}, '')),
  fc.constant(createMockElement('span', {}, 'Not a post'))
);

const invalidPlatformArbitrary = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(''),
  fc.constant('invalid'),
  fc.constant(123),
  fc.constant({}),
  fc.constant([])
);

const invalidHostnameArbitrary = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(''),
  fc.constant(123),
  fc.constant({}),
  fc.constant([])
);

describe('Property 14: Graceful Error Handling for Malformed Posts', () => {
  test('processPost handles malformed post elements without throwing', async () => {
    await fc.assert(
      fc.asyncProperty(
        malformedPostArbitrary,
        fc.constantFrom('twitter', 'instagram'),
        fc.constantFrom('fixvx.com', 'kkinstagram.com'),
        async (postElement, platform, targetHostname) => {
          let threwException = false;
          let result;

          try {
            result = processPost(postElement, platform, targetHostname);
          } catch (error) {
            threwException = true;
          }

          expect(threwException).toBe(false);
          expect(result).toBeDefined();
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('error');
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('processPost handles invalid platform without throwing', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidPlatformArbitrary,
        fc.constantFrom('fixvx.com', 'kkinstagram.com'),
        async (platform, targetHostname) => {
          const postElement = createMockElement('article', {}, 'Test post');
          let threwException = false;
          let result;

          try {
            result = processPost(postElement, platform, targetHostname);
          } catch (error) {
            threwException = true;
          }

          expect(threwException).toBe(false);
          expect(result).toBeDefined();
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('processPost handles invalid hostname without throwing', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidHostnameArbitrary,
        fc.constantFrom('twitter', 'instagram'),
        async (targetHostname, platform) => {
          const postElement = createMockElement('article', {}, 'Test post');
          let threwException = false;
          let result;

          try {
            result = processPost(postElement, platform, targetHostname);
          } catch (error) {
            threwException = true;
          }

          expect(threwException).toBe(false);
          expect(result).toBeDefined();
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('processBatch handles array with malformed posts without throwing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(malformedPostArbitrary, { minLength: 1, maxLength: 10 }),
        fc.constantFrom('twitter', 'instagram'),
        fc.constantFrom('fixvx.com', 'kkinstagram.com'),
        async (postElements, platform, targetHostname) => {
          let threwException = false;
          let summary;

          try {
            summary = processBatch(postElements, platform, targetHostname);
          } catch (error) {
            threwException = true;
          }

          expect(threwException).toBe(false);
          expect(summary).toBeDefined();
          expect(summary).toHaveProperty('total');
          expect(summary).toHaveProperty('successful');
          expect(summary).toHaveProperty('failed');
          expect(summary).toHaveProperty('skipped');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('processBatch handles mixed valid and invalid posts gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('twitter', 'instagram'),
        fc.constantFrom('fixvx.com', 'kkinstagram.com'),
        async (platform, targetHostname) => {
          const validPost = createMockElement('article', {}, 'Valid post');
          const postElements = [
            validPost,
            null,
            undefined,
            createMockElement('div', {}, ''),
            {},
            validPost
          ];

          let threwException = false;
          let summary;

          try {
            summary = processBatch(postElements, platform, targetHostname);
          } catch (error) {
            threwException = true;
          }

          expect(threwException).toBe(false);
          expect(summary).toBeDefined();
          expect(summary.total).toBe(postElements.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 18: Error Logging', () => {
  test('processPost logs errors when given invalid post element', async () => {
    await fc.assert(
      fc.asyncProperty(
        malformedPostArbitrary,
        fc.constantFrom('twitter', 'instagram'),
        fc.constantFrom('fixvx.com', 'kkinstagram.com'),
        async (postElement, platform, targetHostname) => {
          consoleErrorSpy.mockClear();
          const result = processPost(postElement, platform, targetHostname);

          if (!result.success && result.error) {
            expect(consoleErrorSpy).toHaveBeenCalled();
            const errorCalls = consoleErrorSpy.mock.calls;
            const hasDetailedLog = errorCalls.some(call => 
              call.some(arg => 
                typeof arg === 'string' && arg.includes('[post-processor]')
              )
            );
            expect(hasDetailedLog).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('processPost logs errors with context information', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidPlatformArbitrary,
        fc.constantFrom('fixvx.com', 'kkinstagram.com'),
        async (platform, targetHostname) => {
          consoleErrorSpy.mockClear();
          const postElement = createMockElement('article', {}, 'Test post');
          const result = processPost(postElement, platform, targetHostname);

          if (!result.success && result.error) {
            expect(consoleErrorSpy).toHaveBeenCalled();
            const allLogs = consoleErrorSpy.mock.calls.flat();
            const hasContext = allLogs.some(arg => 
              arg === platform || 
              arg === targetHostname ||
              arg === postElement ||
              (typeof arg === 'string' && (
                arg.includes('platform') || 
                arg.includes('hostname') ||
                arg.includes('element')
              ))
            );
            expect(hasContext).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('processBatch logs summary information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(malformedPostArbitrary, { minLength: 1, maxLength: 5 }),
        fc.constantFrom('twitter', 'instagram'),
        fc.constantFrom('fixvx.com', 'kkinstagram.com'),
        async (postElements, platform, targetHostname) => {
          consoleLogSpy.mockClear();
          consoleWarnSpy.mockClear();
          const summary = processBatch(postElements, platform, targetHostname);

          expect(consoleLogSpy).toHaveBeenCalled();
          const logCalls = consoleLogSpy.mock.calls.flat();
          const hasSummaryLog = logCalls.some(arg =>
            typeof arg === 'string' && 
            arg.includes('Batch processing complete')
          );
          expect(hasSummaryLog).toBe(true);

          if (summary.errors.length > 0) {
            const warnCalls = consoleWarnSpy.mock.calls.flat();
            const hasErrorWarning = warnCalls.some(arg =>
              typeof arg === 'string' && 
              arg.includes('errors occurred')
            );
            expect(hasErrorWarning).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('processAllPosts logs appropriately', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('twitter', 'instagram'),
        fc.constantFrom('fixvx.com', 'kkinstagram.com'),
        async (platform, targetHostname) => {
          consoleErrorSpy.mockClear();
          consoleLogSpy.mockClear();
          const summary = processAllPosts(platform, targetHostname);
          expect(consoleLogSpy.mock.calls.length + consoleErrorSpy.mock.calls.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('error logs include error reason codes', async () => {
    await fc.assert(
      fc.asyncProperty(
        malformedPostArbitrary,
        fc.constantFrom('twitter', 'instagram'),
        fc.constantFrom('fixvx.com', 'kkinstagram.com'),
        async (postElement, platform, targetHostname) => {
          const result = processPost(postElement, platform, targetHostname);

          if (!result.success && !result.skipped) {
            expect(result.reason).toBeDefined();
            expect(typeof result.reason).toBe('string');
            expect(result.reason.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
