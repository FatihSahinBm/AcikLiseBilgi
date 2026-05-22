import axios from 'axios';

interface OneSignalConfig {
  appId: string;
  restApiKey: string;
}

const getOneSignalConfig = (): OneSignalConfig | null => {
  const appId = process.env.ONESIGNAL_APP_ID || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey) {
    return null;
  }

  return { appId, restApiKey };
};

/**
 * Sends a push notification to ALL subscribed users via OneSignal REST API.
 * @param title The title of the push notification
 * @param message The body text of the push notification
 * @param targetUrl Optional URL to open when the user clicks the notification
 */
export async function sendBroadcastNotification(
  title: string,
  message: string,
  targetUrl?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const config = getOneSignalConfig();

  if (!config) {
    console.warn(
      'OneSignal Warning: ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY environment variables are missing. Push notification broadcast skipped.'
    );
    return {
      success: false,
      error: 'Environment variables missing. Push notification was not sent, but stored in local logs.'
    };
  }

  try {
    const payload = {
      app_id: config.appId,
      included_segments: ['Subscribed Users'], // Target all subscribed devices
      headings: {
        en: 'Açık Lise (AOL) Duyuru',
        tr: title
      },
      contents: {
        en: message,
        tr: message
      },
      url: targetUrl || 'https://aol-duyuru-pwa.vercel.app',
      // Highly premium styling options
      chrome_web_badge: '/icons/icon-72x72.png',
      chrome_web_icon: '/icons/icon-192x192.png',
      firefox_icon: '/icons/icon-192x192.png',
      ios_attachments: {
        id1: '/icons/icon-512x512.png'
      }
    };

    console.log('Sending broadcast notification to OneSignal with payload:', JSON.stringify(payload));

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      payload,
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Basic ${config.restApiKey}`
        }
      }
    );

    if (response.data && response.data.id) {
      console.log('OneSignal Push Broadcast sent successfully. Notification ID:', response.data.id);
      return { success: true, id: response.data.id };
    }

    return { success: false, error: 'Unknown response from OneSignal' };
  } catch (error: any) {
    console.error(
      'OneSignal Broadcast Error:',
      error.response?.data ? JSON.stringify(error.response.data) : error.message
    );
    return {
      success: false,
      error: error.response?.data?.errors?.[0] || error.message
    };
  }
}

/**
 * Sends a push notification to a SPECIFIC subscribed device (subscription ID) for testing purposes.
 * @param subscriptionId The OneSignal Player ID / Subscription ID of the target device
 * @param title The title of the test push
 * @param message The body text of the test push
 */
export async function sendTargetedNotification(
  subscriptionId: string,
  title: string = 'Test Bildirimi 🔔',
  message: string = 'Açık Lise Duyuru Takip PWA uygulamanızdan test bildirimi başarıyla ulaştı!'
): Promise<{ success: boolean; id?: string; error?: string }> {
  const config = getOneSignalConfig();

  if (!config) {
    console.warn(
      'OneSignal Warning: ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY missing. Targeted push skipped.'
    );
    return {
      success: false,
      error: 'Environment variables missing. Setup OneSignal keys to send targeted test notifications.'
    };
  }

  try {
    const payload = {
      app_id: config.appId,
      include_subscription_ids: [subscriptionId], // Target specific subscription
      headings: {
        en: 'Açık Lise (AOL) Notification',
        tr: title
      },
      contents: {
        en: message,
        tr: message
      },
      url: 'https://aol-duyuru-pwa.vercel.app',
      chrome_web_badge: '/icons/icon-72x72.png',
      chrome_web_icon: '/icons/icon-192x192.png'
    };

    console.log(`Sending targeted notification to subscription ${subscriptionId}`);

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      payload,
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Basic ${config.restApiKey}`
        }
      }
    );

    if (response.data && response.data.id) {
      console.log('OneSignal Targeted Push sent successfully. Notification ID:', response.data.id);
      return { success: true, id: response.data.id };
    }

    return { success: false, error: 'Unknown response' };
  } catch (error: any) {
    console.error(
      'OneSignal Targeted Push Error:',
      error.response?.data ? JSON.stringify(error.response.data) : error.message
    );
    return {
      success: false,
      error: error.response?.data?.errors?.[0] || error.message
    };
  }
}

/**
 * Sends a reminder push notification to users who haven't completed registration.
 * Excludes users who have the tag `kayit_yenilendi_id` set to the current announcement ID.
 */
export async function sendReminderNotification(
  announcementId: string,
  title: string,
  message: string,
  targetUrl?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const config = getOneSignalConfig();

  if (!config) {
    console.warn(
      'OneSignal Warning: ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY environment variables are missing. Push notification reminder skipped.'
    );
    return {
      success: false,
      error: 'Environment variables missing. Push notification was not sent, but stored in local logs.'
    };
  }

  try {
    const payload = {
      app_id: config.appId,
      // Target users who do NOT have the tag kayit_yenilendi_id equal to the announcementId
      filters: [
        {
          field: 'tag',
          key: 'kayit_yenilendi_id',
          relation: '!=',
          value: announcementId
        }
      ],
      headings: {
        en: 'Açık Lise Kayıt Uyarısı',
        tr: title
      },
      contents: {
        en: message,
        tr: message
      },
      url: targetUrl || 'https://aol-duyuru-pwa.vercel.app',
      chrome_web_badge: '/icons/icon-72x72.png',
      chrome_web_icon: '/icons/icon-192x192.png',
      firefox_icon: '/icons/icon-192x192.png',
      ios_attachments: {
        id1: '/icons/icon-512x512.png'
      }
    };

    console.log(`Sending reminder notification for ${announcementId} with filters:`, JSON.stringify(payload.filters));

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      payload,
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Basic ${config.restApiKey}`
        }
      }
    );

    if (response.data && response.data.id) {
      console.log('OneSignal Push Reminder sent successfully. Notification ID:', response.data.id);
      return { success: true, id: response.data.id };
    }

    return { success: false, error: 'Unknown response from OneSignal' };
  } catch (error: any) {
    console.error(
      'OneSignal Reminder Error:',
      error.response?.data ? JSON.stringify(error.response.data) : error.message
    );
    return {
      success: false,
      error: error.response?.data?.errors?.[0] || error.message
    };
  }
}

