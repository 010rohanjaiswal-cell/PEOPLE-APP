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
        // Get JWT token from storage
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          console.log('No token found, skipping socket connection');
          return;
        }

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
          console.log('✅ Socket.io connected');
          setIsConnected(true);
          
          // Join notification room if user is authenticated
          const joinNotificationRoom = async () => {
            try {
              const userData = await AsyncStorage.getItem('userData');
              if (userData) {
                const user = JSON.parse(userData);
                const userId = user._id || user.id;
                if (userId) {
                  socket.emit('join_notification_room', { userId: userId.toString() });
                }
              }
            } catch (error) {
              console.error('Error joining notification room:', error);
            }
          };
          joinNotificationRoom();
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

