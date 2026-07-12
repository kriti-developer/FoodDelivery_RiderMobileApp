import Constants from "expo-constants";

import type { Order, OrderStatus } from "./types";

const DEFAULT_API_BASE = "http://192.168.0.5:4000";

function getExtraApiBase(): string | undefined {
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  return extra?.apiBaseUrl?.trim();
}

export function getApiBase(): string {
  return getExtraApiBase() || DEFAULT_API_BASE;
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text.trim()) {
    return `Request failed with status ${response.status}`;
  }

  try {
    const parsed = JSON.parse(text) as { message?: string };
    return parsed.message || text;
  } catch {
    return text;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBase().replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as T;
}

export function fetchAvailableOrders(): Promise<Order[]> {
  return requestJson<Order[]>("api/orders/available");
}

export function fetchAllOrders(): Promise<Order[]> {
  return requestJson<Order[]>("api/orders");
}

export function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  return requestJson<Order>(`api/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
