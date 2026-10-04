export const DEFAULT_WEBHOOK_URL =
  import.meta.env.VITE_WEBHOOK_URL ||
  "https://api.agents.snsihub.ai/webhook-test/196672de-7803-436c-858a-4a6cddd433d0";

export interface WebhookEventPayload {
  event: "pre_registration" | "service_request" | "food_order" | "feedback" | "chat_message";
  timestamp: string;
  room?: string;
  guestName?: string;
  data: Record<string, unknown>;
}

export async function sendWebhookPayload(
  event: WebhookEventPayload["event"],
  data: Record<string, unknown>,
  guestName: string = "Aisha Rahman",
  room: string = "512"
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const payload: WebhookEventPayload = {
      event,
      timestamp: new Date().toISOString(),
      room,
      guestName,
      data,
    };

    const response = await fetch(DEFAULT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`Webhook responded with status ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    let responseData: unknown;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return { success: true, data: responseData };
  } catch (error) {
    console.error("Failed to send webhook payload:", error);
    return { success: false, error: String(error) };
  }
}

export async function sendAgentChatMessage(
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<string> {
  try {
    const response = await fetch(DEFAULT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: "chat_message",
        message: userMessage,
        chatInput: userMessage,
        history,
        guest: {
          name: "Aisha Rahman",
          room: "512",
          status: "Checked-in",
        },
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const res = (await response.json()) as any;
      if (typeof res === "string") return res;
      if (res.output) return typeof res.output === "string" ? res.output : JSON.stringify(res.output);
      if (res.message) return typeof res.message === "string" ? res.message : JSON.stringify(res.message);
      if (res.response) return typeof res.response === "string" ? res.response : JSON.stringify(res.response);
      if (res.text) return typeof res.text === "string" ? res.text : JSON.stringify(res.text);
      if (res.reply) return typeof res.reply === "string" ? res.reply : JSON.stringify(res.reply);
      if (Array.isArray(res) && res.length > 0) {
        const item = res[0];
        if (typeof item === "string") return item;
        if (item.output) return item.output;
        if (item.message) return item.message;
        if (item.text) return item.text;
      }
      return JSON.stringify(res, null, 2);
    } else {
      const text = await response.text();
      return text || "Webhook request acknowledged.";
    }
  } catch (error) {
    console.error("Error communicating with AI agent webhook:", error);
    throw error;
  }
}
