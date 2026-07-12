export const OrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  ON_THE_WAY: 'on-the-way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// The status this rider's "advance" button should move an order to next.
// CONFIRMED -> ON_THE_WAY skips PREPARING entirely - that status represents
// the restaurant cooking, which isn't a rider-triggered action here. The
// rider's next button press after accepting is "Order Collected" (they've
// reached the restaurant and picked it up), which is what actually starts
// the trip to the customer.
export function nextStatus(current) {
  switch (current) {
    case OrderStatus.CONFIRMED:
      return OrderStatus.ON_THE_WAY;
    case OrderStatus.ON_THE_WAY:
      return OrderStatus.DELIVERED;
    default:
      return null;
  }
}

export function statusLabel(status) {
  switch (status) {
    case OrderStatus.PENDING:
      return 'Pending';
    case OrderStatus.CONFIRMED:
      return 'Confirmed';
    case OrderStatus.PREPARING:
      return 'Preparing';
    case OrderStatus.ON_THE_WAY:
      return 'On the way';
    case OrderStatus.DELIVERED:
      return 'Delivered';
    case OrderStatus.CANCELLED:
      return 'Cancelled';
    default:
      return status;
  }
}

export function advanceButtonLabel(next) {
  switch (next) {
    case OrderStatus.ON_THE_WAY:
      return 'Order Collected';
    case OrderStatus.DELIVERED:
      return 'Mark Delivered';
    default:
      return 'Advance status';
  }
}
