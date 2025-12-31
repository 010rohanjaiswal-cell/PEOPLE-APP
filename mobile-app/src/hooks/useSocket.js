/**
 * Socket.io Hook - People App
 * Manages Socket.io connection for real-time messaging
 */

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get API base URL from environment or default
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://freelancing-platform-backend-backup.onrender.com';

let socketInstance = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        // Get JWT token from storage (using authToken key)
        const token = await AsyncStorage.getItem('authToken');
        
        if (!token) {
          console.log('⚠️ No authToken found, skipping socket connection');
          return;
        }
        
        console.log('🔑 Token found, initializing socket connection');

        // Reuse existing socket if available
        if (socketInstance && socketInstance.connected) {
          socketRef.current = socketInstance;
          setIsConnected(true);
          return;
        }

        // Create new socket connection
        const socket = io(API_BASE_URL, {
          auth: {
            token: token,
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
          console.log('✅ Socket.io connected, socket ID:', socket.id);
          setIsConnected(true);
          
          // Rooms are automatically joined on connection via backend authentication
          // The backend joins user to `user_${userId}` and `notifications_${userId}` rooms
          console.log('✅ Socket connected and rooms should be joined automatically');
        });

        socket.on('disconnect', () => {
          console.log('❌ Socket.io disconnected');
          setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
          console.error('Socket.io connection error:', error);
          setIsConnected(false);
        });

        socketRef.current = socket;
        socketInstance = socket;
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    };

    initializeSocket();

    // Cleanup on unmount
    return () => {
      // Don't disconnect here - keep connection alive for app lifetime
      // Socket will be reused across components
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
  };
};

export default useSocket;

