/**
 * Logger Tests
 * Verify that logging respects the debugLogging flag
 */

describe('Logger', () => {
  let Logger;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Reset module state
    jest.resetModules();
    
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Load logger module
    Logger = require('./logger');
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Default behavior (debugLogging not set)', () => {
    test('should NOT log messages when debugLogging is not initialized', () => {
      Logger.log('Test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should NOT log warnings when debugLogging is not initialized', () => {
      Logger.warn('Test warning');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('should ALWAYS log errors regardless of debugLogging', () => {
      Logger.error('Test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Test error');
    });
  });

  describe('When debugLogging is explicitly disabled', () => {
    beforeEach(async () => {
      await Logger.initLogger({ debugLogging: false });
    });

    test('should NOT log messages when debugLogging is false', () => {
      Logger.log('Test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should NOT log warnings when debugLogging is false', () => {
      Logger.warn('Test warning');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('should ALWAYS log errors', () => {
      Logger.error('Test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Test error');
    });
  });

  describe('When debugLogging is enabled', () => {
    beforeEach(async () => {
      await Logger.initLogger({ debugLogging: true });
    });

    test('should log messages when debugLogging is true', () => {
      Logger.log('Test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('Test message');
    });

    test('should log warnings when debugLogging is true', () => {
      Logger.warn('Test warning');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Test warning');
    });

    test('should log errors', () => {
      Logger.error('Test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Test error');
    });

    test('should log with additional arguments', () => {
      const obj = { key: 'value' };
      Logger.log('Test message', obj, 123);
      expect(consoleLogSpy).toHaveBeenCalledWith('Test message', obj, 123);
    });
  });

  describe('When config is missing debugLogging property', () => {
    beforeEach(async () => {
      await Logger.initLogger({ twitter: { enabled: true } });
    });

    test('should NOT log messages when debugLogging property is missing', () => {
      Logger.log('Test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should NOT log warnings when debugLogging property is missing', () => {
      Logger.warn('Test warning');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('When config is null or undefined', () => {
    test('should NOT log messages when config is null', async () => {
      await Logger.initLogger(null);
      Logger.log('Test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should NOT log messages when config is undefined', async () => {
      await Logger.initLogger(undefined);
      Logger.log('Test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('setDebugLogging method', () => {
    test('should enable logging when set to true', () => {
      Logger.setDebugLogging(true);
      Logger.log('Test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('Test message');
    });

    test('should disable logging when set to false', () => {
      Logger.setDebugLogging(true);
      Logger.log('Test message 1');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      
      Logger.setDebugLogging(false);
      Logger.log('Test message 2');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe('Integration with default config', () => {
    test('should respect default config debugLogging: false', async () => {
      const Config = require('../config/config');
      const defaultConfig = Config.getDefaultConfig();
      
      await Logger.initLogger(defaultConfig);
      Logger.log('Test message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(defaultConfig.debugLogging).toBe(false);
    });
  });
});
