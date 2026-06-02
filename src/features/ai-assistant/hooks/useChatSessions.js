import { useState, useEffect, useCallback } from 'react';

const createDefaultSessionObj = (id, name) => {
  return {
    id,
    title: 'Obrolan Baru',
    messages: [
      {
        id: `greet-${Date.now()}`,
        sender: 'bot',
        text: `Hi ${name}! 👋 Saya Neobots. Saya dapat membantu kamu dengan panduan karir, saran pengembangan skill, tips pencarian lowongan kerja, serta optimasi CV. Bagaimana saya bisa membantumu hari ini?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    createdAt: Date.now()
  };
};

export const useChatSessions = (user) => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Initialize sessions from localStorage on mount
  useEffect(() => {
    const name = user?.name?.split(' ')[0] || 'Franz';
    const fetchSessions = async () => {
      try {
        const { aiAssistantService } = await import('../api/aiAssistantService');
        const apiSessions = await aiAssistantService.listSessions();
        if (apiSessions && apiSessions.length > 0) {
          const formatted = apiSessions.map(s => ({
            id: s.id,
            title: s.title || 'Obrolan',
            messages: s.messages || [],
            createdAt: s.created_at ? new Date(s.created_at).getTime() : Date.now()
          }));
          setSessions(formatted);
          setActiveSessionId(formatted[0].id);
          localStorage.setItem('neokarir_chat_sessions', JSON.stringify(formatted));
          localStorage.setItem('neokarir_active_session_id', formatted[0].id);
          return;
        }
      } catch (err) {
        console.warn("Failed to fetch API sessions, falling back to local.", err);
      }
      
      // Local fallback
      const savedSessions = localStorage.getItem('neokarir_chat_sessions');
      const savedActiveId = localStorage.getItem('neokarir_active_session_id');

      if (savedSessions) {
        try {
          const parsed = JSON.parse(savedSessions);
          if (parsed && parsed.length > 0) {
            setSessions(parsed);
            const activeExists = parsed.some(s => s.id === savedActiveId);
            setActiveSessionId(activeExists ? savedActiveId : parsed[0].id);
          } else {
            setupInitialDefaultSession(name);
          }
        } catch (e) {
          setupInitialDefaultSession(name);
        }
      } else {
        setupInitialDefaultSession(name);
      }
    };
    
    fetchSessions();
  }, [user]);

  const setupInitialDefaultSession = async (name) => {
    try {
      const { aiAssistantService } = await import('../api/aiAssistantService');
      const newSess = await aiAssistantService.createSession({ title: 'Obrolan Baru' });
      if (newSess) {
        const defaultId = newSess.id;
        const initialSession = createDefaultSessionObj(defaultId, name);
        setSessions([initialSession]);
        setActiveSessionId(defaultId);
        localStorage.setItem('neokarir_chat_sessions', JSON.stringify([initialSession]));
        localStorage.setItem('neokarir_active_session_id', defaultId);
        return;
      }
    } catch (e) {
      console.warn("Failed to create session on API", e);
    }
    
    const defaultId = `session-${Date.now()}`;
    const initialSession = createDefaultSessionObj(defaultId, name);
    setSessions([initialSession]);
    setActiveSessionId(defaultId);
    localStorage.setItem('neokarir_chat_sessions', JSON.stringify([initialSession]));
    localStorage.setItem('neokarir_active_session_id', defaultId);
  };

  // Helper to save all sessions
  const saveAllSessions = (updatedSessions) => {
    setSessions(updatedSessions);
    localStorage.setItem('neokarir_chat_sessions', JSON.stringify(updatedSessions));
  };

  // Create a new empty chat session
  const createNewSession = useCallback(async () => {
    const name = user?.name?.split(' ')[0] || 'Franz';
    let newId = `session-${Date.now()}`;
    
    try {
      const { aiAssistantService } = await import('../api/aiAssistantService');
      const newSess = await aiAssistantService.createSession({ title: 'Obrolan Baru' });
      if (newSess) newId = newSess.id;
    } catch (e) {}
    
    const newSession = createDefaultSessionObj(newId, name);
    
    const updated = [newSession, ...sessions];
    saveAllSessions(updated);
    setActiveSessionId(newId);
    localStorage.setItem('neokarir_active_session_id', newId);
  }, [sessions, user]);

  // Switch active session
  const selectSession = useCallback((id) => {
    setActiveSessionId(id);
    localStorage.setItem('neokarir_active_session_id', id);
  }, []);

  // Delete a chat session
  const deleteSession = useCallback(async (id, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      try {
        const { aiAssistantService } = await import('../api/aiAssistantService');
        await aiAssistantService.deleteSession(id);
      } catch (err) {
        console.error("Failed to delete session on server", err);
      }
    }
    
    const updated = sessions.filter(s => s.id !== id);
    
    if (updated.length === 0) {
      const name = user?.name?.split(' ')[0] || 'Franz';
      const defaultId = `session-${Date.now()}`;
      const initialSession = createDefaultSessionObj(defaultId, name);
      saveAllSessions([initialSession]);
      setActiveSessionId(defaultId);
      localStorage.setItem('neokarir_active_session_id', defaultId);
    } else {
      saveAllSessions(updated);
      if (activeSessionId === id) {
        const nextActiveId = updated[0].id;
        setActiveSessionId(nextActiveId);
        localStorage.setItem('neokarir_active_session_id', nextActiveId);
      }
    }
  }, [sessions, activeSessionId, user]);

  // Update session messages (also handles auto-rename on first user query)
  const updateSessionMessages = useCallback((sessionId, newMessages, textForAutoRename) => {
    const updated = sessions.map(session => {
      if (session.id === sessionId) {
        let newTitle = session.title;
        if (textForAutoRename && session.title === 'Obrolan Baru') {
          newTitle = textForAutoRename.length > 28 ? textForAutoRename.substring(0, 25) + '...' : textForAutoRename;
          newTitle = newTitle.charAt(0).toUpperCase() + newTitle.slice(1);
          
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(sessionId)) {
             import('../api/aiAssistantService').then(({ aiAssistantService }) => {
               aiAssistantService.renameSession(sessionId, newTitle).catch(e => console.error("Auto-rename failed", e));
             });
          }
        }
        return {
          ...session,
          title: newTitle,
          messages: newMessages
        };
      }
      return session;
    });
    saveAllSessions(updated);
  }, [sessions]);

  // Clear current active session (resets it)
  const clearSessionMessages = useCallback((sessionId) => {
    const name = user?.name?.split(' ')[0] || 'Franz';
    const resetSession = createDefaultSessionObj(sessionId, name);
    const updated = sessions.map(s => s.id === sessionId ? resetSession : s);
    saveAllSessions(updated);
  }, [sessions, user]);

  // Rename a chat session
  const renameSession = useCallback(async (id, newTitle) => {
    if (!newTitle.trim()) return;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      try {
        const { aiAssistantService } = await import('../api/aiAssistantService');
        await aiAssistantService.renameSession(id, newTitle);
      } catch (err) {
        console.error("Failed to rename session on server", err);
      }
    }
    
    const updated = sessions.map(session => {
      if (session.id === id) {
        return {
          ...session,
          title: newTitle
        };
      }
      return session;
    });
    saveAllSessions(updated);
  }, [sessions]);

  // Convert local/offline session ID to a real backend session UUID
  const convertLocalSessionToBackendSession = useCallback(async (localId, title) => {
    try {
      const { aiAssistantService } = await import('../api/aiAssistantService');
      const newSess = await aiAssistantService.createSession({ title: title || 'Obrolan Baru' });
      if (newSess) {
        const updated = sessions.map(s => {
          if (s.id === localId) {
            return {
              ...s,
              id: newSess.id,
              title: newSess.title || s.title
            };
          }
          return s;
        });
        saveAllSessions(updated);
        setActiveSessionId(newSess.id);
        localStorage.setItem('neokarir_active_session_id', newSess.id);
        return newSess.id;
      }
    } catch (e) {
      console.warn("Failed to convert local session to API session", e);
    }
    return localId;
  }, [sessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const messages = activeSession ? activeSession.messages : [];

  return {
    sessions,
    activeSessionId,
    activeSession,
    messages,
    createNewSession,
    selectSession,
    deleteSession,
    renameSession,
    updateSessionMessages,
    clearSessionMessages,
    convertLocalSessionToBackendSession
  };
};
export default useChatSessions;
