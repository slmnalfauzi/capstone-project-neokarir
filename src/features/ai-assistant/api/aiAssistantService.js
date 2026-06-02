import api, { USE_MOCK } from '../../../config/api';
import { getSimulatedResponse } from '../data/knowledgeBase';

/**
 * AI Assistant Chat Service
 * Handles sending messages to the AI assistant backend, with RAG simulation support.
 */
export const aiAssistantService = {
  listSessions: async () => {
    if (USE_MOCK) {
      return [];
    }
    const response = await api.get('/chat');
    return response.data?.chats || [];
  },

  createSession: async (payload) => {
    if (USE_MOCK) {
      return { id: `session-${Date.now()}`, title: 'Obrolan Baru', messages: [] };
    }
    const response = await api.post('/chat', payload);
    return response.data?.chat || null;
  },

  sendMessage: async (chatId, text) => {
    if (USE_MOCK) {
      // Simulate network / AI generation latency
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 500));
      
      const responseText = getSimulatedResponse(text, {}, []);
      return {
        success: true,
        text: responseText,
      };
    }

    // Call actual backend chatbot endpoint
    const response = await api.post(`/chat/${chatId}/messages`, {
      message: text,
    });
    
    // The backend returns updated chat in response.data.chat.
    // The last message in chat.messages is the bot response.
    const updatedChat = response.data?.chat;
    const messages = updatedChat?.messages || [];
    const botMsg = messages.length > 0 ? messages[messages.length - 1] : { text: "No response" };
    
    return {
      success: true,
      text: botMsg.text,
      chat: updatedChat
    };
  },

  renameSession: async (chatId, title) => {
    if (USE_MOCK) {
      return { success: true, title };
    }
    const response = await api.put(`/chat/${chatId}/title`, { title });
    return response.data?.chat || null;
  },

  deleteSession: async (chatId) => {
    if (USE_MOCK) {
      return { success: true };
    }
    const response = await api.delete(`/chat/${chatId}`);
    return response.data;
  },
};
