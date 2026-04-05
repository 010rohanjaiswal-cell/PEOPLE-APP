/**
 * Single Socket.io connection for the app (notifications + realtime updates).
 * Avoids duplicate clients and stale React state from useRef-only socket handles.
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://freelancing-platform-backend-backup.onrender.com';

const SocketContext = createContext({
  socket: null,
  isConnected: false,
});

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token || !isAuthenticated) {
      setSocket(null);
      setIsConnected(false);
      return undefined;
    }

    const s = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    const onConnect = () => {
      console.log('✅ Socket.io connected, socket ID:', s.id);
      setIsConnected(true);
    };
    const onDisconnect = () => {
      console.log('❌ Socket.io disconnected');
      setIsConnected(false);
    };
    const onConnectError = (error) => {
      console.error('Socket.io connection error:', error);
      setIsConnected(false);
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);

    setSocket(s);
    if (s.connected) {
      setIsConnected(true);
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      s.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [token, isAuthenticated]);

  const value = useMemo(() => ({ socket, isConnected }), [socket, isConnected]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
