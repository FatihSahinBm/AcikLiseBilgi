import { NextRequest, NextResponse } from 'next/server';
import { sendTargetedNotification } from '@/services/onesignal';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'Aygıt Kimliği (subscriptionId) eksik.' },
        { status: 400 }
      );
    }

    console.log(`Received request to send test push to device: ${subscriptionId}`);

    const result = await sendTargetedNotification(
      subscriptionId,
      'Test Bildirimi 🔔',
      'Harika! Açık Lise Duyuru Takip uygulamasından test bildiriminiz başarıyla ulaştı.'
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test bildirimi başarıyla gönderildi!',
        id: result.id
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Bildirim gönderilirken hata oluştu.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('API /send-test-push Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
