export type MessageRole = "system" | "user" | "assistant";

export type ChatMessageContentPart = {
  type: "text";
  text: string;
} | {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
};

export type ChatMessage = {
  role: MessageRole;
  content: string | ChatMessageContentPart[];
};

export type ChatCompletionOptions = {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
};

export type ChatCompletionChoice = {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
};

export type ChatCompletionResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

class OpenAIClient {
  private apiKey: string;
  private baseURL: string = "https://api.openai.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  chat = {
    completions: {
      create: async (
        options: ChatCompletionOptions
      ): Promise<ChatCompletionResponse> => {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: options.model,
            messages: options.messages,
            max_tokens: options.max_tokens || 4096,
            temperature: options.temperature,
            top_p: options.top_p,
            frequency_penalty: options.frequency_penalty,
            presence_penalty: options.presence_penalty,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData?.error?.message ||
            `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }

        return await response.json();
      },
    },
  };

  models = {
    list: async () => {
      const response = await fetch(`${this.baseURL}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch models");
      }

      return await response.json();
    },
  };
}

// Factory function to create OpenAI client (similar to SDK)
export function createOpenAI(apiKey: string): OpenAIClient {
  return new OpenAIClient(apiKey);
}

// Validate API key
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new OpenAIClient(apiKey);
    await client.models.list();
    return true;
  } catch {
    return false;
  }
}
