import { useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface NotificationPayload {
  id: string;
  type: 'finding_updated' | 'evidence_uploaded' | 'comment_added' | 'status_changed';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

interface UseRealTimeUpdatesOptions {
  onFindingUpdate?: (payload: any) => void;
  onCommentAdded?: (payload: any) => void;
  onEvidenceUploaded?: (payload: any) => void;
  onNotification?: (notification: NotificationPayload) => void;
  enablePushNotifications?: boolean;
  enableSounds?: boolean;
}

export const useRealTimeUpdates = ({
  onFindingUpdate,
  onCommentAdded,
  onEvidenceUploaded,
  onNotification,
  enablePushNotifications = true,
  enableSounds = false
}: UseRealTimeUpdatesOptions = {}) => {
  const { user } = useAuth();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    if (enableSounds) {
      audioRef.current = new Audio('/notification-sound.mp3');
      audioRef.current.volume = 0.3;
    }
  }, [enableSounds]);

  const playNotificationSound = useCallback(() => {
    if (enableSounds && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Ignore autoplay restrictions
      });
    }
  }, [enableSounds]);

  const showPushNotification = useCallback(async (notification: NotificationPayload) => {
    if (!enablePushNotifications || !('Notification' in window)) {
      return;
    }

    // Request permission if not granted
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return;
      }
    }

    if (Notification.permission === 'granted') {
      const options: NotificationOptions = {
        body: notification.message,
        icon: '/logo192.png',
        badge: '/badge-icon.png',
        tag: notification.type,
        requireInteraction: notification.type === 'finding_updated',
        data: notification.data
      };

      const notif = new Notification(notification.title, options);
      
      notif.onclick = () => {
        window.focus();
        if (notification.data?.findingId) {
          window.location.href = `/findings/${notification.data.findingId}`;
        }
        notif.close();
      };

      // Auto-close after 5 seconds for non-critical notifications
      if (notification.type !== 'finding_updated') {
        setTimeout(() => notif.close(), 5000);
      }
    }
  }, [enablePushNotifications]);

  const handleRealtimeEvent = useCallback((eventType: string, payload: any) => {
    const notification: NotificationPayload = {
      id: `${eventType}-${Date.now()}`,
      type: eventType as any,
      title: '',
      message: '',
      data: payload,
      timestamp: new Date().toISOString()
    };

    switch (eventType) {
      case 'finding_updated':
        notification.title = 'Finding Updated';
        notification.message = `Finding "${payload.new.title}" has been updated`;
        onFindingUpdate?.(payload);
        break;
        
      case 'comment_added':
        notification.title = 'New Comment';
        notification.message = 'A new comment has been added to a finding';
        onCommentAdded?.(payload);
        break;
        
      case 'evidence_uploaded':
        notification.title = 'Evidence Uploaded';
        notification.message = 'New evidence has been uploaded to a finding';
        onEvidenceUploaded?.(payload);
        break;
        
      default:
        return;
    }

    // Trigger callbacks
    onNotification?.(notification);
    playNotificationSound();
    showPushNotification(notification);
  }, [onFindingUpdate, onCommentAdded, onEvidenceUploaded, onNotification, playNotificationSound, showPushNotification]);

  const setupRealtimeSubscriptions = useCallback(async () => {
    if (!user) return;

    // Clean up existing subscriptions
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    try {
      // Subscribe to findings changes
      const findingsChannel = supabase
        .channel('findings-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'findings'
          },
          (payload) => {
            handleRealtimeEvent('finding_updated', payload);
          }
        )
        .subscribe();

      // Subscribe to comments changes
      const commentsChannel = supabase
        .channel('comments-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'comments'
          },
          (payload) => {
            handleRealtimeEvent('comment_added', payload);
          }
        )
        .subscribe();

      // Subscribe to evidence changes
      const evidenceChannel = supabase
        .channel('evidence-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'evidence'
          },
          (payload) => {
            handleRealtimeEvent('evidence_uploaded', payload);
          }
        )
        .subscribe();

      channelsRef.current = [findingsChannel, commentsChannel, evidenceChannel];

    } catch (error) {
      console.error('Error setting up realtime subscriptions:', error);
    }
  }, [user, handleRealtimeEvent]);

  // Setup subscriptions when user changes
  useEffect(() => {
    setupRealtimeSubscriptions();

    return () => {
      // Cleanup on unmount
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [setupRealtimeSubscriptions]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reconnect subscriptions when page becomes visible
        setupRealtimeSubscriptions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [setupRealtimeSubscriptions]);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  const unsubscribeAll = useCallback(() => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  }, []);

  return {
    requestNotificationPermission,
    unsubscribeAll,
    isConnected: channelsRef.current.length > 0
  };
}; 