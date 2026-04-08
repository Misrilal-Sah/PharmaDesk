import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseConnectionUrl(connectionUrl) {
  if (!connectionUrl) {
    return {};
  }

  try {
    const parsed = new URL(connectionUrl);
    const database = parsed.pathname?.replace(/^\//, '');
    const sslMode = parsed.searchParams.get('ssl-mode') || parsed.searchParams.get('sslmode');

    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 3306,
      user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      database: database ? decodeURIComponent(database) : undefined,
      sslMode
    };
  } catch (error) {
    console.warn('Invalid DATABASE_URL. Falling back to DB_* environment variables.');
    return {};
  }
}

function loadCaCertificate() {
  if (process.env.DB_CA_CERT) {
    return process.env.DB_CA_CERT.replace(/\\n/g, '\n');
  }

  if (process.env.DB_CA_BASE64) {
    try {
      return Buffer.from(process.env.DB_CA_BASE64, 'base64').toString('utf8');
    } catch (error) {
      console.warn('Invalid DB_CA_BASE64 value. Ignoring CA certificate.');
    }
  }

  if (process.env.DB_CA_PATH) {
    const caPath = path.isAbsolute(process.env.DB_CA_PATH)
      ? process.env.DB_CA_PATH
      : path.resolve(process.cwd(), process.env.DB_CA_PATH);

    try {
      return fs.readFileSync(caPath, 'utf8');
    } catch (error) {
      console.warn(`Unable to read DB_CA_PATH at ${caPath}. Ignoring CA certificate.`);
    }
  }

  return null;
}

function resolveBaseConnectionConfig() {
  const urlConfig = parseConnectionUrl(
    process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_URI
  );

  return {
    host: urlConfig.host || process.env.DB_HOST || 'localhost',
    port: urlConfig.port || parseNumber(process.env.DB_PORT, 3306),
    user: urlConfig.user || process.env.DB_USER || 'root',
    password: urlConfig.password || process.env.DB_PASSWORD || '',
    database: urlConfig.database || process.env.DB_NAME || 'pharmadesk',
    sslMode: String(process.env.DB_SSL_MODE || urlConfig.sslMode || 'DISABLED').toUpperCase()
  };
}

function buildSslConfig(sslMode) {
  if (['DISABLED', 'OFF', 'FALSE'].includes(sslMode)) {
    return undefined;
  }

  const ssl = {
    rejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true)
  };

  const ca = loadCaCertificate();
  if (ca) {
    ssl.ca = ca;
  }

  return ssl;
}

export function getDatabaseName() {
  return resolveBaseConnectionConfig().database;
}

export function getMySqlConnectionConfig(options = {}) {
  const { includeDatabase = true, multipleStatements = false } = options;
  const base = resolveBaseConnectionConfig();

  const connectionConfig = {
    host: base.host,
    port: base.port,
    user: base.user,
    password: base.password
  };

  if (includeDatabase) {
    connectionConfig.database = base.database;
  }

  if (multipleStatements) {
    connectionConfig.multipleStatements = true;
  }

  const ssl = buildSslConfig(base.sslMode);
  if (ssl) {
    connectionConfig.ssl = ssl;
  }

  return connectionConfig;
}

export function getMySqlPoolConfig() {
  return {
    ...getMySqlConnectionConfig({ includeDatabase: true }),
    waitForConnections: true,
    connectionLimit: parseNumber(process.env.DB_CONNECTION_LIMIT, 10),
    queueLimit: 0
  };
}