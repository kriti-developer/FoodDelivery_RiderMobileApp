export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "on-the-way"
  | "delivered"
  | "cancelled";

export interface Customer {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine?: string | null;
  address?: string | null;
  phone?: string | null;
  emoji?: string | null;
}

export interface MenuItem {
  id?: string | null;
  name: string;
  price?: number | null;
  emoji?: string | null;
}

export interface OrderItem {
  menuItem?: MenuItem | null;
  quantity?: number;
  price?: number;
}

export interface Order {
  id: string;
  orderId?: string | null;
  customer: Customer;
  restaurant: Restaurant;
  items?: OrderItem[];
  totalPrice?: number;
  status: OrderStatus | string;
  rider?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface RiderProfile {
  name: string;
  phone?: string | null;
  activeOrderId?: string | null;
  historyOrderIds: string[];
}

export function orderStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "preparing":
      return "Preparing";
    case "on-the-way":
      return "On the way";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function nextOrderStatus(status: string): OrderStatus | null {
  switch (status) {
    case "confirmed":
      return "preparing";
    case "preparing":
      return "on-the-way";
    case "on-the-way":
      return "delivered";
    default:
      return null;
  }
}

export function formatRupees(amount?: number): string {
  return `₹${Math.round(amount ?? 0)}`;
}

export function formatOrderTime(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function summarizeItems(items: OrderItem[] = []): string {
  const names = items
    .map((item) => item.menuItem?.name?.trim())
    .filter((name): name is string => Boolean(name));

  return names.length > 0 ? names.join(", ") : "No items";
}
