const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function configureTestDatabase(): string {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'TEST_DATABASE_URL is required. Set it to a local PostgreSQL test database ending in _test.',
    );
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL.');
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
  const hostname = databaseUrl.hostname.replace(/^\[|\]$/g, '');
  if (
    !['postgres:', 'postgresql:'].includes(databaseUrl.protocol) ||
    !LOCAL_DATABASE_HOSTS.has(hostname) ||
    !databaseName.endsWith('_test')
  ) {
    throw new Error(
      'Tests only run against a local PostgreSQL database whose name ends in _test. Neon and other remote databases are not allowed.',
    );
  }

  process.env.DATABASE_URL = connectionString;
  process.env.NODE_ENV = 'test';
  process.env.MOCK_PAYMENTS_ENABLED = 'true';
  return connectionString;
}
