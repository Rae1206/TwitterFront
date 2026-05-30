export interface ChatbotMessageDto {
  chatbotMessageId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  createdAt: string;
}

export interface ChatbotReplyDto {
  userMessage: ChatbotMessageDto;
  assistantMessage: ChatbotMessageDto;
  model: string;
}

export interface SendChatbotMessageRequest {
  message: string;
}