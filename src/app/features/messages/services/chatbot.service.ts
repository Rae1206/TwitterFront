import { inject, Injectable, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ChatbotApiService } from './chatbot-api.service';
import { ChatbotMessageDto } from '../models/chatbot.models';
import { getErrorMessage } from '../../../core/api/api.utils';

/** Special constant ID for the Groq AI bot user. */
export const GROQ_BOT_USER_ID = '__groq_bot__';
export const GROQ_BOT_DISPLAY_NAME = 'Groq';
export const GROQ_BOT_AVATAR = null;

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly chatbotApi = inject(ChatbotApiService);

  /** All messages in the conversation with Groq, ordered oldest-first. */
  readonly messages = signal<ChatbotMessageDto[]>([]);

  /** Whether the history is being loaded for the first time. */
  readonly loading = signal(false);

  /** Whether a message is being sent (waiting for Groq response). */
  readonly sending = signal(false);

  /** Error message for display, null when no error. */
  readonly error = signal<string | null>(null);

  /** Computed: is the conversation empty (no history, no messages)? */
  readonly isEmpty = computed(() => this.messages().length === 0 && !this.loading());

  /** Computed: is the service currently busy (loading or sending)? */
  readonly busy = computed(() => this.loading() || this.sending());

  /**
   * Load the chat history from the backend.
   * Called when the user opens the Groq conversation.
   */
  async loadHistory(): Promise<void> {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const history = await firstValueFrom(
        this.chatbotApi.getHistory({ limit: 50, offset: 0 })
      );
      this.messages.set(history);
    } catch (err) {
      this.error.set(getErrorMessage(err, 'No se pudo cargar el historial del chat'));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Send a message to the Groq chatbot.
   * Optimistically adds the user message to the list, then waits
   * for the backend to return both the user and assistant messages.
   */
  async sendMessage(content: string): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed || this.sending()) return;

    this.sending.set(true);
    this.error.set(null);

    try {
      const reply = await firstValueFrom(
        this.chatbotApi.sendMessage({ message: trimmed })
      );

      // Replace optimistic messages with the real ones from the backend
      this.messages.update((current) => [
        ...current.filter(
          (m) => m.chatbotMessageId !== reply.userMessage.chatbotMessageId
            && m.chatbotMessageId !== reply.assistantMessage.chatbotMessageId
        ),
        reply.userMessage,
        reply.assistantMessage,
      ]);
    } catch (err) {
      this.error.set(getErrorMessage(err, 'No se pudo enviar el mensaje'));
    } finally {
      this.sending.set(false);
    }
  }

  /** Clear the error state. */
  clearError(): void {
    this.error.set(null);
  }

  /** Reset all state (useful when logging out). */
  reset(): void {
    this.messages.set([]);
    this.loading.set(false);
    this.sending.set(false);
    this.error.set(null);
  }
}