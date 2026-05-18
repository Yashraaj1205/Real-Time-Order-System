import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { OrderStatus } from '../types';

const router = Router();

const VALID_STATUSES: OrderStatus[] = ['pending', 'shipped', 'delivered'];

// GET /api/orders
router.get('/', async (_req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
  res.json(result.rows);
});

// POST /api/orders
router.post('/', async (req: Request, res: Response) => {
  const { customer_name, product_name, status = 'pending' } = req.body;

  if (!customer_name || !product_name) {
    res.status(400).json({ error: 'customer_name and product_name are required' });
    return;
  }

  const result = await pool.query(
    `INSERT INTO orders (customer_name, product_name, status, updated_at)
     VALUES ($1, $2, $3, NOW()) RETURNING *`,
    [customer_name, product_name, status],
  );
  res.status(201).json(result.rows[0]);
});

// PATCH /api/orders/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status: OrderStatus };

  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }

  const result = await pool.query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id],
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json(result.rows[0]);
});

// DELETE /api/orders/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await pool.query(
    'DELETE FROM orders WHERE id = $1 RETURNING *',
    [id],
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json({ deleted: result.rows[0] });
});

export default router;
