export interface LumaGuest {
  api_id: string;
  guest: {
    api_id: string;
    approval_status: string;
    email: string;
    name: string;
    checked_in_at: string | null;
    event_ticket: {
      name: string;
      checked_in_at: string | null;
    };
  };
}

export interface LumaData {
  entries: LumaGuest[];
}

export async function loadLumaData(): Promise<LumaData | null> {
  try {
    const response = await fetch("/luma.json");
    if (!response.ok) {
      throw new Error("Failed to load Luma data");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error loading Luma data:", error);
    return null;
  }
}

export function findGuestByEmail(
  lumaData: LumaData,
  email: string
): LumaGuest | null {
  const guest = lumaData.entries.find(
    (entry) => entry.guest.email.toLowerCase() === email.toLowerCase()
  );

  return guest || null;
}

export function validateGuestAccess(guest: LumaGuest): {
  hasAccess: boolean;
  ticketType: string;
  isCheckedIn: boolean;
  reason?: string;
} {
  const ticketName = guest.guest.event_ticket?.name || "Unknown";
  const isCheckedIn = !!guest.guest.checked_in_at;

  // Check if guest has food access based on ticket type
  const hasFoodAccess =
    !ticketName.toLowerCase().includes("basic") &&
    !ticketName.toLowerCase().includes("regular") &&
    ticketName.toLowerCase().includes("general");

  return {
    hasAccess: hasFoodAccess,
    ticketType: ticketName,
    isCheckedIn,
    reason: !hasFoodAccess
      ? "Basic/Regular ticket - no complementary food"
      : undefined,
  };
}

export function formatGuestInfo(guest: LumaGuest): {
  name: string;
  email: string;
  ticketType: string;
  status: string;
  checkInTime?: string;
} {
  const checkInTime = guest.guest.checked_in_at
    ? new Date(guest.guest.checked_in_at).toLocaleString()
    : undefined;

  return {
    name: guest.guest.name,
    email: guest.guest.email,
    ticketType: guest.guest.event_ticket?.name || "Unknown",
    status: guest.guest.approval_status,
    checkInTime,
  };
}
