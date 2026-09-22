import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { sendBroadcastNotification } from '@/services/onesignal';

export const dynamic = 'force-dynamic';

export interface ChatReplyPreview {
  id: string;
  author: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  author: string;
  avatar: string;
  text: string;
  createdAt: string;
  badge?: string;
  replyTo?: ChatReplyPreview;
  reactions?: Record<string, string[]>; // { "❤️": ["Fatih"], ... }
}

const CHAT_STORAGE_KEY = 'aol_chat_messages';
const LAST_PUSH_KEY = 'aol_chat_last_push_timestamp';
const PUSH_COOLDOWN_MS = 15 * 1000; // 15 seconds cooldown for personal DM push notifications
const MAX_STORED_MESSAGES = 10000; // Keep full message history without accidental loss

export async function GET() {
  try {
    let messages = await redis.get<ChatMessage[]>(CHAT_STORAGE_KEY);

    if (!messages || !Array.isArray(messages)) {
      messages = [];
    }

    return NextResponse.json(
      { success: true, messages },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      }
    );
  } catch (error: any) {
    console.error('API /api/chat GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Mesajlar yüklenirken bir sorun oluştu.', messages: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. REACTION TOGGLE ACTION
    if (body.action === 'react') {
      const { messageId, emoji, user } = body;
      if (!messageId || !emoji || !user) {
        return NextResponse.json({ success: false, error: 'Eksik reaksiyon parametresi.' }, { status: 400 });
      }

      let messages = await redis.get<ChatMessage[]>(CHAT_STORAGE_KEY);
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({ success: false, error: 'Mesaj bulunamadı.' }, { status: 404 });
      }

      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) {
        return NextResponse.json({ success: false, error: 'Mesaj bulunamadı.' }, { status: 404 });
      }

      const targetMsg = messages[msgIndex];
      targetMsg.reactions = targetMsg.reactions || {};

      const existingReactors = targetMsg.reactions[emoji] || [];
      const userIdx = existingReactors.indexOf(user);

      if (userIdx > -1) {
        // Remove reaction
        existingReactors.splice(userIdx, 1);
        if (existingReactors.length === 0) {
          delete targetMsg.reactions[emoji];
        } else {
          targetMsg.reactions[emoji] = existingReactors;
        }
      } else {
        // Add reaction
        existingReactors.push(user);
        targetMsg.reactions[emoji] = existingReactors;
      }

      messages[msgIndex] = targetMsg;
      await redis.set(CHAT_STORAGE_KEY, messages);

      return NextResponse.json({
        success: true,
        action: 'react',
        message: targetMsg
      });
    }

    // 2. DELETE MESSAGE ACTION
    if (body.action === 'delete') {
      const { messageId } = body;
      let messages = await redis.get<ChatMessage[]>(CHAT_STORAGE_KEY);
      if (messages && Array.isArray(messages)) {
        messages = messages.filter((m) => m.id !== messageId);
        await redis.set(CHAT_STORAGE_KEY, messages);
      }
      return NextResponse.json({ success: true, action: 'delete', messageId });
    }

    // 3. SEND NEW MESSAGE
    let { author, text, avatar, badge, replyTo } = body;

    // Sanitize & validate author
    author = typeof author === 'string' ? author.trim() : '';
    if (!author || author.length < 1) {
      author = 'Fatih';
    } else if (author.length > 30) {
      author = author.substring(0, 30);
    }

    // Sanitize & validate text
    text = typeof text === 'string' ? text.trim() : '';
    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Mesaj boş olamaz.' },
        { status: 400 }
      );
    }
    if (text.length > 1500) {
      text = text.substring(0, 1500);
    }

    // Avatar default based on author
    if (!avatar) {
      avatar = author.toLowerCase().includes('ceyda') ? '🎀' : '🎓';
    }

    // Validated replyTo
    let sanitizedReplyTo: ChatReplyPreview | undefined = undefined;
    if (replyTo && replyTo.id) {
      sanitizedReplyTo = {
        id: String(replyTo.id),
        author: String(replyTo.author || '').substring(0, 30),
        text: String(replyTo.text || '').substring(0, 150)
      };
    }

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      author,
      avatar,
      text,
      createdAt: new Date().toISOString(),
      badge: badge ? String(badge).substring(0, 20) : undefined,
      replyTo: sanitizedReplyTo,
      reactions: {}
    };

    // Retrieve existing messages
    let messages = await redis.get<ChatMessage[]>(CHAT_STORAGE_KEY);
    if (!messages || !Array.isArray(messages)) {
      messages = [];
    }

    // Append new message and enforce high safety limit (10,000)
    messages.push(newMessage);
    if (messages.length > MAX_STORED_MESSAGES) {
      messages = messages.slice(messages.length - MAX_STORED_MESSAGES);
    }

    await redis.set(CHAT_STORAGE_KEY, messages);

    // OneSignal Push Notification broadcast logic
    let notificationSent = false;
    let pushReason = '';

    try {
      const lastPushTime = await redis.get<number>(LAST_PUSH_KEY);
      const now = Date.now();

      if (!lastPushTime || now - lastPushTime > PUSH_COOLDOWN_MS) {
        await redis.set(LAST_PUSH_KEY, now);

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aol-duyuru-pwa.vercel.app';
        const targetUrl = `${baseUrl}/?tab=chat`;

        // Personal DM Push Notification format
        const isCeyda = author.toLowerCase().includes('ceyda');
        const isFatih = author.toLowerCase().includes('fatih');
        const pushTitle = isCeyda
          ? '💖 Ceyda sana bir mesaj gönderdi'
          : isFatih
          ? '🎓 Fatih sana bir mesaj gönderdi'
          : `💬 ${author}`;

        const pushBody = text.length > 90 ? text.substring(0, 87) + '...' : text;

        const pushRes = await sendBroadcastNotification(pushTitle, pushBody, targetUrl);
        notificationSent = pushRes.success;
        pushReason = notificationSent ? 'Sent successfully' : (pushRes.error || 'Failed');
      } else {
        pushReason = 'Push notification throttled (anti-spam cooldown active)';
      }
    } catch (pushErr: any) {
      console.error('Error triggering push notification for chat message:', pushErr);
      pushReason = pushErr.message || 'Push error';
    }

    return NextResponse.json({
      success: true,
      message: newMessage,
      notificationSent,
      pushReason
    });
  } catch (error: any) {
    console.error('API /api/chat POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Mesaj gönderilemedi.' },
      { status: 500 }
    );
  }
}
