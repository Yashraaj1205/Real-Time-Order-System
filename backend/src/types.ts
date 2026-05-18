export type OrderStatus = 'pending' | 'shipped' | 'delivered';

export interface Order {
  id: number;
  customer_name: string;
  product_name: string;
  status: OrderStatus;
  updated_at: string;
}

export type DBOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface OrderEvent {
  operation: DBOperation;
  data: Order;
  timestamp: string;
}
