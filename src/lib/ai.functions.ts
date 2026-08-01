import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AskInput = z.object({
  prompt: z.string().trim().min(3).max(8000),
  system: z.string().trim().max(2000).optional(),
});

/**
 * Gemini-powered assistant for the mess manager. Runs server-side only so the
 * gateway key is never exposed to the browser.
 */
export const askGemini = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              data.system ??
              "You are the AI assistant for a university hostel mess. Answer as a practical Indian-hostel mess manager: concrete dishes, portion notes, and per-plate cost estimates in INR when budget is mentioned. Use clean markdown with short headings, tables where useful, and never invent student data you were not given.",
          },
          { role: "user", content: data.prompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 429) throw new Error("AI rate limit reached. Please retry in a moment.");
      if (response.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
      throw new Error(`AI request failed [${response.status}]: ${body}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("AI returned an empty response.");
    return { content };
  });
