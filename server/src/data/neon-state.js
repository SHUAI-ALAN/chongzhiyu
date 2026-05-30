const STATE_ID = 'default';

function databaseUrl() {
  return process.env.NEON_DATABASE_URL
    || process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL
    || process.env.POSTGRES_URL_NON_POOLING
    || '';
}

function isNeonStateEnabled() {
  return Boolean(databaseUrl());
}

let sqlClientPromise = null;
let tableReadyPromise = null;

async function getSqlClient() {
  if (!sqlClientPromise) {
    sqlClientPromise = import('@neondatabase/serverless').then(({ neon }) => neon(databaseUrl()));
  }
  return sqlClientPromise;
}

async function ensureStateTable() {
  if (!isNeonStateEnabled()) return null;
  if (!tableReadyPromise) {
    tableReadyPromise = getSqlClient().then((sql) => sql`
      CREATE TABLE IF NOT EXISTS chongzhiyu_runtime_state (
        id TEXT PRIMARY KEY,
        state JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }
  await tableReadyPromise;
  return getSqlClient();
}

async function loadRuntimeState() {
  const sql = await ensureStateTable();
  if (!sql) return null;
  const rows = await sql`
    SELECT state
    FROM chongzhiyu_runtime_state
    WHERE id = ${STATE_ID}
    LIMIT 1
  `;
  const value = rows[0] && rows[0].state;
  if (!value) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

async function saveRuntimeState(state) {
  const sql = await ensureStateTable();
  if (!sql) return;
  await sql`
    INSERT INTO chongzhiyu_runtime_state (id, state, updated_at)
    VALUES (${STATE_ID}, ${JSON.stringify(state)}::jsonb, NOW())
    ON CONFLICT (id)
    DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
  `;
}

module.exports = {
  isNeonStateEnabled,
  loadRuntimeState,
  saveRuntimeState
};
