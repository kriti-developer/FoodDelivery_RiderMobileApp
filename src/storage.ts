import AsyncStorage from "@react-native-async-storage/async-storage";

import type { RiderProfile } from "./types";

const SESSION_KEY = "foodexpress:rider:session";

async function readSession(): Promise<RiderProfile | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RiderProfile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : null,
      activeOrderId: typeof parsed.activeOrderId === "string" ? parsed.activeOrderId : null,
      historyOrderIds: Array.isArray(parsed.historyOrderIds)
        ? parsed.historyOrderIds.filter((value): value is string => typeof value === "string" && value.length > 0)
        : [],
    };
  } catch {
    return null;
  }
}

async function writeSession(session: RiderProfile): Promise<RiderProfile> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function loadSession(): Promise<RiderProfile | null> {
  return readSession();
}

export async function saveRiderProfile(name: string, phone: string | null): Promise<RiderProfile> {
  const current = (await readSession()) ?? { name: "", phone: null, activeOrderId: null, historyOrderIds: [] };
  return writeSession({
    ...current,
    name,
    phone,
  });
}

export async function setActiveOrderId(orderId: string | null): Promise<RiderProfile> {
  const current = (await readSession()) ?? { name: "", phone: null, activeOrderId: null, historyOrderIds: [] };
  return writeSession({
    ...current,
    activeOrderId: orderId,
  });
}

export async function addHistoryOrderId(orderId: string): Promise<RiderProfile> {
  const current = (await readSession()) ?? { name: "", phone: null, activeOrderId: null, historyOrderIds: [] };
  const historyOrderIds = Array.from(new Set([...current.historyOrderIds, orderId]));

  return writeSession({
    ...current,
    historyOrderIds,
  });
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
