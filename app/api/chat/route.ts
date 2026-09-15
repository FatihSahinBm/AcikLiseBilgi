import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { sendBroadcastNotification } from '@/services/onesignal';

export const dynamic = 'force-dynamic';

export interface ChatMessage {
  id: string;
  author: string;
  avatar: string;
  text: string;
  createdAt: string;
  badge?: string;
}

const CHAT_STORAGE_KEY = 'aol_chat_messages';
const LAST_PUSH_KEY = 'aol_chat_last_push_timestamp';
const PUSH_COOLDOWN_MS = 25 * 1000; // 25 seconds between global push notifications

// Initial seed messages if chat is brand new
const INITIAL_SEED_MESSAGES: ChatMessage[] = [
  {
    id: 'seed-1',
    author: 'Açık Lise Asistanı 🎀',
    avatar: '🐱',
    text: 'Açık Lise Topluluk Sohbetine hoş geldiniz! Sınavlar, kayıt yenileme ve dersler hakkında buradan yardımlaşabilirsiniz. 🌸',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    badge: 'Yönetici'
  },
  {
    id: 'seed-2',
    author: 'Elif (12. Dönem)',
    avatar: '🎓',
    text: 'Dönem dersleri sisteme yüklenmiş, sınav geri sayımını takip etmeyi unutmayın arkadaşlar! Herkese başarılar ✨',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    badge: 'Öğrenci'
  }
];

export async function GET() {
  try {
    let messages = await redis.get<ChatMessage[]>(CHAT_STORAGE_KEY);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      messages = INITIAL_SEED_MESSAGES;
      await redis.set(CHAT_STORAGE_KEY, messages);
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
    let { author, text, avatar, badge } = body;

    // Sanitize & validate author
    author = typeof author === 'string' ? author.trim() : '';
    if (!author || author.length < 2) {
      author = 'Açık Liseli 🎀';
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
    if (text.length > 400) {
      text = text.substring(0, 400);
    }

    // Avatar default
    avatar = typeof avatar === 'string' && avatar ? avatar : '🌸';

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      author,
      avatar,
      text,
      createdAt: new Date().toISOString(),
      badge: badge ? String(badge).substring(0, 20) : undefined
    };

    // Retrieve existing messages
    let messages = await redis.get<ChatMessage[]>(CHAT_STORAGE_KEY);
    if (!messages || !Array.isArray(messages)) {
      messages = [];
    }

    // Add new message and keep the most recent 120 messages
    messages.push(newMessage);
    if (messages.length > 120) {
      messages = messages.slice(messages.length - 120);
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

        const pushTitle = `💬 ${author}`;
        const pushBody = text.length > 85 ? text.substring(0, 82) + '...' : text;

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
