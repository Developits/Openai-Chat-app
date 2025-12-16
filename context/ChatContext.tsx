import React, { createContext, useContext, useState } from "react";

export type MessageContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
        detail?: "low" | "high" | "auto";
      };
    };

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string | MessageContentPart[];
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  model: string;
};

type ChatContextType = {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  createConversation: () => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string | MessageContentPart[]) => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  clearCurrentConversation: () => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Updated model list with vision-capable OpenAI model IDs
export const MODELS = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Fast & affordable (Vision)",
  },
  { id: "gpt-4o", name: "GPT-4o", description: "Most capable (Vision)" },
  { id: "o1-mini", name: "O1 Mini", description: "Reasoning model (Vision)" },
  {
    id: "o1-preview",
    name: "O1 Preview",
    description: "Advanced reasoning (Vision)",
  },
];

// Note: gpt-4-turbo and gpt-3.5-turbo don't support vision, removed from the list

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini"); // Default model

  const createConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      model: selectedModel,
    };
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversation(newConv);
  };

  const addMessage = (message: Message) => {
    if (!currentConversation) return;

    // Extract text for conversation title
    let messageText = "";
    if (typeof message.content === "string") {
      messageText = message.content;
    } else {
      const textPart = message.content.find((part) => part.type === "text");
      messageText = textPart ? textPart.text : "Image";
    }

    const updated = {
      ...currentConversation,
      messages: [...currentConversation.messages, message],
      title:
        currentConversation.messages.length === 0 && message.role === "user"
          ? messageText.slice(0, 30) + (messageText.length > 30 ? "..." : "")
          : currentConversation.title,
    };

    setCurrentConversation(updated);
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const updateLastMessage = (content: string | MessageContentPart[]) => {
    if (!currentConversation) return;

    const messages = [...currentConversation.messages];
    if (messages.length > 0) {
      messages[messages.length - 1] = {
        ...messages[messages.length - 1],
        content,
      };
    }

    const updated = { ...currentConversation, messages };
    setCurrentConversation(updated);
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const selectConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setCurrentConversation(conv);
      setSelectedModel(conv.model);
    }
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversation?.id === id) {
      setCurrentConversation(null);
    }
  };

  const clearCurrentConversation = () => {
    if (!currentConversation) return;

    const clearedConversation: Conversation = {
      ...currentConversation,
      messages: [],
      title: "New Chat",
    };

    setCurrentConversation(clearedConversation);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === clearedConversation.id ? clearedConversation : c
      )
    );
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversation,
        selectedModel,
        setSelectedModel,
        createConversation,
        addMessage,
        updateLastMessage,
        selectConversation,
        deleteConversation,
        clearCurrentConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
};
