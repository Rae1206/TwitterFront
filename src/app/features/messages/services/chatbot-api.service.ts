import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import { PaginationQuery } from '../../../core/api/api.models';
import { ChatbotMessageDto, ChatbotReplyDto, SendChatbotMessageRequest } from '../models/chatbot.models';

@Injectable({ providedIn: 'root' })
export class ChatbotApiService {
  private readonly apiClient = inject(ApiClientService);
  private readonly baseUrl = '/api/chatbot/messages';

  sendMessage(request: SendChatbotMessageRequest): Observable<ChatbotReplyDto> {
    return this.apiClient.post<ChatbotReplyDto, SendChatbotMessageRequest>(this.baseUrl, request);
  }

  getHistory(query?: PaginationQuery): Observable<ChatbotMessageDto[]> {
    return this.apiClient.get<ChatbotMessageDto[], PaginationQuery>(this.baseUrl, query);
  }
}