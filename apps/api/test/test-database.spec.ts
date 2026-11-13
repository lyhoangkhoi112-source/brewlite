import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configureTestDatabase } from './test-database.js';

const environmentKeys = [
  'TEST_DATABASE_URL',
  'DATABASE_URL',
  'NODE_ENV',
  'MOCK_PAYMENTS_ENABLED',
] as const;
let originalEnvironment: Map<string, string | undefined>;

describe('configureTestDatabase', () => {
  beforeEach(() => {
    originalEnvironment = new Map(
      environmentKeys.map((key) => [key, process.env[key]]),
    );
    delete process.env.TEST_DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://unused:unused@remote.invalid/app';
  });

  afterEach(() => {
    for (const key of environmentKeys) {
      const originalValue = originalEnvironment.get(key);
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }
  });

  it('requires an explicit test URL instead of falling back to DATABASE_URL', () => {
    expect(configureTestDatabase).toThrow('TEST_DATABASE_URL is required');
  });

  it('accepts a dedicated local test database and configures mock payments', () => {
    const url =
      'postgresql://test:test@localhost:5432/brewlite_test?schema=public';
    process.env.TEST_DATABASE_URL = url;

    expect(configureTestDatabase()).toBe(url);
    expect(process.env.DATABASE_URL).toBe(url);
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.MOCK_PAYMENTS_ENABLED).toBe('true');
  });

  it('rejects remote databases even when their names end in _test', () => {
    process.env.TEST_DATABASE_URL =
      'postgresql://test:test@remote.example:5432/brewlite_test';

    expect(configureTestDatabase).toThrow('local PostgreSQL database');
  });

  it('rejects local databases not explicitly named as test databases', () => {
    process.env.TEST_DATABASE_URL =
      'postgresql://test:test@localhost:5432/brewlite';

    expect(configureTestDatabase).toThrow('local PostgreSQL database');
  });
});
