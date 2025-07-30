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
    const eventApiId = process.env.NEXT_PUBLIC_EVENT_ID;
    const proxyKey = process.env.NEXT_PUBLIC_LUMA_PROXY_KEY;

    const url = `/api/luma?event_api_id=${eventApiId}&proxy_key=${proxyKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to load Luma data: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    console.log("Luma data:", data);

    // Transform the API response to match our expected format
    if (data && data.guest && data.guest.user_email) {
      // Single guest object from Luma API with {guest: {...}} structure
      const guestEntry: LumaGuest = {
        api_id: data.guest.api_id,
        guest: {
          api_id: data.guest.api_id,
          approval_status: data.guest.approval_status,
          email: data.guest.user_email,
          name: data.guest.user_name,
          checked_in_at: data.guest.checked_in_at,
          event_ticket: {
            name: data.guest.event_ticket?.name || "Event Ticket",
            checked_in_at: data.guest.event_ticket?.checked_in_at || null,
          },
        },
      };
      return { entries: [guestEntry] };
    } else if (data && data.user_email) {
      // Single guest object from Luma API (direct structure)
      const guestEntry: LumaGuest = {
        api_id: data.api_id,
        guest: {
          api_id: data.api_id,
          approval_status: data.approval_status,
          email: data.user_email,
          name: data.user_name,
          checked_in_at: data.checked_in_at,
          event_ticket: {
            name: data.event_ticket?.name || "Event Ticket",
            checked_in_at: data.event_ticket?.checked_in_at || null,
          },
        },
      };
      return { entries: [guestEntry] };
    } else if (data && data.entries) {
      // Already in expected format
      return data;
    } else if (data && Array.isArray(data)) {
      // If the API returns an array directly, wrap it in the expected format
      return { entries: data };
    } else {
      console.error("Unexpected API response format:", data);
      return null;
    }
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
