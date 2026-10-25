export interface ChatAuthor {
  id: string;
  name: string;
  role: "user" | "admin";
  avatar?: string;
}

export interface ChatReactionSummary {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
}

export interface ChatMessage {
  id: string;
  pollId: string;
  author: ChatAuthor;
  content: string;
  createdAt: string;
  status: "visible" | "hidden" | "removed";
  reactions?: ChatReactionSummary[];
  isFlagged?: boolean;
  flagReason?: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  totalCount: number;
  hasMore: boolean;
}
