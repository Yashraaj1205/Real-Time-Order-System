import { pool } from './pool';

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id            SERIAL      PRIMARY KEY,
        customer_name TEXT        NOT NULL,
        product_name  TEXT        NOT NULL,
        status        TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'shipped', 'delivered')),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION notify_orders_change()
      RETURNS TRIGGER AS $$
      DECLARE
        payload JSON;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          payload = json_build_object(
            'operation', TG_OP,
            'data',      row_to_json(OLD),
            'timestamp', NOW()
          );
          PERFORM pg_notify('orders_channel', payload::TEXT);
          RETURN OLD;
        ELSE
          payload = json_build_object(
            'operation', TG_OP,
            'data',      row_to_json(NEW),
            'timestamp', NOW()
          );
          PERFORM pg_notify('orders_channel', payload::TEXT);
          RETURN NEW;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS orders_change_trigger ON orders;

      CREATE TRIGGER orders_change_trigger
      AFTER INSERT OR UPDATE OR DELETE ON orders
      FOR EACH ROW EXECUTE FUNCTION notify_orders_change();
    `);

    console.log('✓ Migrations complete (table + trigger ready)');
  } finally {
    client.release();
  }
}
