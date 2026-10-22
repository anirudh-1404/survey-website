export interface ChatAuthor {
  id: string;
  name: string;
  role: "user" | "admin";
}

export interface ChatMessage {
  id: string;
  pollId: string;
  author: ChatAuthor;
  content: string;
  createdAt: string;
  status: "visible" | "hidden" | "removed";
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  totalCount: number;
  hasMore: boolean;
}
