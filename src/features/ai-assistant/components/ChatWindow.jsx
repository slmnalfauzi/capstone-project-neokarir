import React, { useRef, useEffect } from 'react';
import { Bot } from 'lucide-react';
import MessageItem from './MessageItem';
import ConversationsSidebar from './ConversationsSidebar';
import ChatFeedHeader from './ChatFeedHeader';
import ChatInputForm from './ChatInputForm';
import { useAIAssistant } from '../hooks/useAIAssistant';
import { useChatWindowState } from '../hooks/useChatWindowState';

const ChatWindow = () => {
  const {
    sessions,
    activeSessionId,
    messages,
    isTyping,
    sendMessage,
    enhancePrompt,
    createNewSession,
    selectSession,
    deleteSession,
    renameSession
  } = useAIAssistant();

  const {
    isHistoryOpen,
    setIsHistoryOpen,
    searchSessionQuery,
    setSearchSessionQuery
  } = useChatWindowState();

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Filter sessions list based on search query
  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchSessionQuery.toLowerCase())
  );

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="w-full relative bg-white border border-slate-200/80 rounded-2xl overflow-hidden flex h-[calc(100vh-160px)] md:h-[calc(100vh-200px)] min-h-[600px] shadow-sm">
      
      {/* Collapsible Conversations Sub-Sidebar Panel */}
      <ConversationsSidebar
        isHistoryOpen={isHistoryOpen}
        setIsHistoryOpen={setIsHistoryOpen}
        createNewSession={createNewSession}
        searchSessionQuery={searchSessionQuery}
        setSearchSessionQuery={setSearchSessionQuery}
        filteredSessions={filteredSessions}
        activeSessionId={activeSessionId}
        selectSession={selectSession}
        deleteSession={deleteSession}
        renameSession={renameSession}
      />

      {/* Mobile Drawer Overlay */}
      {isHistoryOpen && (
        <div 
          onClick={() => setIsHistoryOpen(false)}
          className="fixed inset-0 bg-black/15 z-20 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Main Chat Feed Area */}
      <div className="flex-1 flex flex-col bg-[#F8FAFC] relative z-10 min-w-0">
        
        {/* Chat Feed Header */}
        <ChatFeedHeader
          isHistoryOpen={isHistoryOpen}
          setIsHistoryOpen={setIsHistoryOpen}
          activeSessionTitle={activeSession?.title}
        />

        {/* Chat Messages Scrolling Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F8FAFC]">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              sender={msg.sender}
              text={msg.text}
              timestamp={msg.timestamp}
            />
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-3 w-full mb-6 justify-start">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-start max-w-[70%]">
                <div className="rounded-2xl px-5 py-3.5 bg-white border border-slate-100 rounded-tl-xs shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Bar: Suggestions & Input Form */}
        <ChatInputForm
          sendMessage={sendMessage}
          enhancePrompt={enhancePrompt}
          setIsHistoryOpen={setIsHistoryOpen}
        />
      </div>
    </div>
  );
};

export default ChatWindow;
