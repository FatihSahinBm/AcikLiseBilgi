'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  RefreshCw,
  Sparkles,
  User,
  Smile,
  ShieldCheck,
  BellRing,
  HelpCircle,
  MessageCircleHeart,
  ChevronDown
} from 'lucide-react';
import { ChatMessage } from '@/app/api/chat/route';

const AVATAR_OPTIONS = ['🐱', '🌸', '🎀', '🎓', '⚡', '📚', '🍰', '🌟', '🦄'];

const QUICK_PROMPTS = [
  'Kayıt yenileme ne zaman bitiyor? ⏳',
  'Sınava kaç gün kaldı? 📝',
  'Ders seçimini tamamladınız mı? 📚',
  'Herkese sınavlarda başarılar dilerim! 🌸'
];

export default function ChatSection() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [authorName, setAuthorName] = useState('Açık Liseli');
  const [selectedAvatar, setSelectedAvatar] = useState('🎀');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  // Load saved profile from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('aol_chat_author_name');
      const savedAvatar = localStorage.getItem('aol_chat_author_avatar');
      if (savedName) setAuthorName(savedName);
      if (savedAvatar) setSelectedAvatar(savedAvatar);
    }
  }, []);

  const saveProfile = (name: string, avatar: string) => {
    const trimmed = name.trim() || 'Açık Liseli';
    setAuthorName(trimmed);
    setSelectedAvatar(avatar);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aol_chat_author_name', trimmed);
      localStorage.setItem('aol_chat_author_avatar', avatar);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch messages from API
  const fetchMessages = async (silent: boolean = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/chat?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Chat fetch error:', err);
    } finally {
      setIsLoading(false);
      if (!silent) setIsRefreshing(false);
    }
  };

  // Initial load and polling
  useEffect(() => {
    fetchMessages();

    // Auto-poll every 3.5 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMessages(true);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      if (isFirstLoad.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        isFirstLoad.current = false;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  // Send a new message
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputText).trim();

    if (!textToSend || isSending) return;

    setIsSending(true);

    // Optimistic local add
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      author: authorName,
      avatar: selectedAvatar,
      text: textToSend,
      createdAt: new Date().toISOString(),
      badge: 'Sen'
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: authorName,
          avatar: selectedAvatar,
          text: textToSend
        })
      });

      const data = await res.json();
      if (data.success && data.message) {
        // Replace optimistic with real
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m))
        );
        if (data.notificationSent) {
          showToast('Mesajınız gönderildi ve herkese bildirim iletildi! 🔔');
        } else {
          showToast('Mesajınız sohbete eklendi! ✨');
        }
      } else {
        showToast(data.error || 'Mesaj gönderilemedi.');
      }
    } catch (err) {
      console.error('Send message error:', err);
      showToast('Bağlantı hatası, tekrar deneyin.');
    } finally {
      setIsSending(false);
      // Ensure we fetch latest state
      fetchMessages(true);
    }
  };

  const handleForceUpdate = () => {
    if (typeof window !== 'undefined' && (window as any).__forcePwaUpdate) {
      (window as any).__forcePwaUpdate();
    } else {
      window.location.reload();
    }
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full space-y-4 text-left animate-fade-in pb-24">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-pink-600 to-rose-500 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white/80 border border-pink-200/60 rounded-3xl p-4 sm:p-5 backdrop-blur-md shadow-lg shadow-pink-100/40 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-2xl shadow-md shadow-pink-300/40 shrink-0">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-zinc-800">
                  Açık Lise Topluluk Sohbeti
                </h2>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Öğrencilerle canlı sohbet et, soru sor ve yardımlaş 🌸
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Manual Refresh Button */}
            <button
              onClick={() => fetchMessages(false)}
              disabled={isRefreshing}
              title="Sohbeti Yenile"
              className="p-2.5 rounded-2xl bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200/50 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Profile / Nickname button */}
            <button
              onClick={() => setShowProfileModal(!showProfileModal)}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 border border-pink-200/60 text-xs font-bold text-pink-700 transition-all cursor-pointer shadow-sm"
            >
              <span className="text-base">{selectedAvatar}</span>
              <span className="truncate max-w-[100px]">{authorName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-pink-500" />
            </button>

            {/* iPhone PWA Cache Purge Button */}
            <button
              onClick={handleForceUpdate}
              title="iPhone / PWA Önbelleğini Temizle ve En Son Sürüme Güncelle"
              className="p-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline">Sürümü Güncelle</span>
            </button>
          </div>
        </div>

        {/* Profile / Nickname & Avatar Editor Dropdown */}
        {showProfileModal && (
          <div className="mt-4 pt-4 border-t border-pink-100 space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex-1 w-full">
                <label className="text-[11px] font-bold text-pink-600 uppercase tracking-wider block mb-1">
                  Sohbetteki Rumuzun (İsmin)
                </label>
                <input
                  type="text"
                  maxLength={25}
                  value={authorName}
                  onChange={(e) => saveProfile(e.target.value, selectedAvatar)}
                  placeholder="Örn: 12. Dönem Açık Liseli"
                  className="w-full bg-pink-50/50 border border-pink-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-pink-600 uppercase tracking-wider block mb-1">
                  Avatarını Seç
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => saveProfile(authorName, emoji)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all cursor-pointer ${
                        selectedAvatar === emoji
                          ? 'bg-pink-500 text-white scale-110 shadow-md shadow-pink-300'
                          : 'bg-pink-50 hover:bg-pink-100 text-zinc-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Push Notification Broadcast Notice */}
        <div className="mt-3 bg-pink-50/60 border border-pink-200/50 rounded-2xl p-2.5 flex items-center gap-2 text-[11px] text-pink-700">
          <BellRing className="w-3.5 h-3.5 shrink-0 text-pink-500 animate-pulse" />
          <span>
            <strong>Anlık Bildirim:</strong> Buraya yazdığınız mesajlar Açık Lise bildirimlerine abone olan tüm öğrencilere anında iletilir. 🔔
          </span>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] font-bold text-pink-500 uppercase shrink-0 select-none">
          Hızlı Mesaj:
        </span>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(undefined, prompt)}
            disabled={isSending}
            className="text-xs bg-white/80 hover:bg-pink-50 border border-pink-200 text-zinc-700 hover:text-pink-600 font-medium px-3 py-1.5 rounded-full shrink-0 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="bg-white/85 border border-pink-200/60 rounded-3xl p-4 sm:p-6 backdrop-blur-md shadow-xl shadow-pink-100/30 min-h-[360px] max-h-[500px] overflow-y-auto space-y-4">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-pink-500">
            <RefreshCw className="w-6 h-6 animate-spin text-pink-400" />
            <span className="text-xs font-bold text-zinc-500">Sohbet yükleniyor...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-center p-6">
            <div className="text-4xl mb-1">🌸</div>
            <h3 className="text-sm font-bold text-zinc-700">Henüz Mesaj Yazılmamış</h3>
            <p className="text-xs text-zinc-500 max-w-xs">
              İlk mesajı sen yazarak Açık Lise öğrencileriyle sohbeti başlatabilirsin!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.author === authorName;

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${
                  isMe ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-pink-100 border border-pink-200 flex items-center justify-center text-sm shrink-0 shadow-xs mb-1">
                    {msg.avatar || '🌸'}
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-3.5 shadow-sm transition-all ${
                    isMe
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-br-xs'
                      : 'bg-white border border-pink-100 text-zinc-800 rounded-bl-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[11px] font-black truncate ${
                        isMe ? 'text-pink-100' : 'text-pink-600'
                      }`}
                    >
                      {msg.author}
                    </span>

                    {msg.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                          isMe
                            ? 'bg-white/20 text-white'
                            : 'bg-pink-100 text-pink-600'
                        }`}
                      >
                        {msg.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-[13px] leading-relaxed break-words whitespace-pre-wrap">
                    {msg.text}
                  </p>

                  <div
                    className={`text-[9px] mt-1 text-right select-none ${
                      isMe ? 'text-pink-200' : 'text-zinc-400'
                    }`}
                  >
                    {formatMessageTime(msg.createdAt)}
                  </div>
                </div>

                {isMe && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-400 to-rose-400 text-white flex items-center justify-center text-sm shrink-0 shadow-xs mb-1">
                    {selectedAvatar}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={handleSendMessage}
        className="bg-white/90 border border-pink-200/70 rounded-3xl p-2.5 backdrop-blur-md shadow-lg shadow-pink-200/30 flex items-center gap-2"
      >
        <div className="pl-3 pr-1 text-lg select-none">{selectedAvatar}</div>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Bir mesaj yazın (herkese bildirim gider)..."
          maxLength={350}
          disabled={isSending}
          className="flex-1 bg-transparent py-2 px-1 text-xs sm:text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
        />

        <div className="text-[10px] font-bold text-zinc-400 px-1 select-none hidden sm:inline">
          {inputText.length}/350
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-pink-300/50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isSending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span className="text-xs hidden sm:inline">Gönder</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
