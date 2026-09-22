'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  RefreshCw,
  Sparkles,
  Heart,
  Search,
  X,
  Reply,
  Smile,
  Copy,
  Check,
  CheckCheck,
  Clock,
  Smartphone,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  Lock,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { ChatMessage, ChatReplyPreview } from '@/app/api/chat/route';

const QUICK_PROMPTS = [
  'Seni çok seviyorum ❤️',
  'Özledim seni 🥺',
  'Konuşalım mı? 🌸',
  'Aramayı açar mısın? 📞',
  'Ben her zaman yanındayım 🫂',
  'Hadi barışalım artık 🎀'
];

const REACTION_EMOJIS = ['❤️', '🥺', '🌸', '😂', '🫂', '✨'];

export interface DeviceDetectionResult {
  author: 'Ceyda' | 'Fatih';
  avatar: string;
  deviceName: string;
}

// iPhone 11 / 11 Pro vs. iPhone 17 Pro Max / Apple iPhone device detector
export function detectDeviceAuthor(): DeviceDetectionResult {
  if (typeof window === 'undefined') {
    return { author: 'Fatih', avatar: '🎓', deviceName: 'Apple iPhone' };
  }

  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  
  // Ekran boyutları (CSS pikselleri ve DPR)
  const screenW = window.screen.width;
  const screenH = window.screen.height;
  const dpr = window.devicePixelRatio || 1;
  const minDim = Math.min(screenW, screenH);
  const maxDim = Math.max(screenW, screenH);

  // iPhone 11 ve 11 Pro serisi tespiti:
  // iPhone 11 / XR: 414 x 896, DPR = 2
  // iPhone 11 Pro / X / XS: 375 x 812, DPR = 3
  // iPhone 11 Pro Max / XS Max: 414 x 896, DPR = 3
  const isIphone11OrXR = minDim === 414 && maxDim === 896 && Math.round(dpr) === 2;
  const isIphone11Pro = minDim === 375 && maxDim === 812 && Math.round(dpr) === 3;
  const isIphone11ProMax = minDim === 414 && maxDim === 896 && Math.round(dpr) === 3;

  // Ekran boyutu 896 veya daha küçük ve 414 veya daha dar olan seriler
  const isIphone11Family = isIOS && (
    isIphone11OrXR ||
    isIphone11Pro ||
    isIphone11ProMax ||
    (maxDim <= 896 && minDim <= 414 && maxDim !== 844 && maxDim !== 852 && maxDim !== 932 && maxDim !== 956)
  );

  // iPhone 17 Pro Max / 16 Pro Max / 15 Pro Max / 14 Pro Max
  const isProMax = isIOS && (
    (minDim >= 430 && maxDim >= 932) ||
    (minDim >= 440 && maxDim >= 956)
  );

  if (isIphone11Family) {
    let name = 'iPhone 11';
    if (isIphone11Pro) name = 'iPhone 11 Pro';
    if (isIphone11ProMax) name = 'iPhone 11 Pro Max';
    return { author: 'Ceyda', avatar: '🎀', deviceName: name };
  }

  if (isProMax) {
    return { author: 'Fatih', avatar: '🎓', deviceName: 'iPhone 17 Pro Max' };
  }

  // Varsayılan iOS cihazlar (Apple iPhone) veya masaüstü/diğer -> Fatih
  return { author: 'Fatih', avatar: '🎓', deviceName: isIOS ? 'Apple iPhone' : 'Web Cihazı' };
}

interface ChatSectionProps {
  onKeyboardChange?: (isOpen: boolean) => void;
}

export default function ChatSection({ onKeyboardChange }: ChatSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [authorName, setAuthorName] = useState<string>('Fatih');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🎓');
  const [detectedInfo, setDetectedInfo] = useState<DeviceDetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Read receipts (Last Seen by Fatih & Ceyda)
  const [lastSeenTimes, setLastSeenTimes] = useState<{ Fatih: string | null; Ceyda: string | null }>({
    Fatih: null,
    Ceyda: null
  });

  // Search feature states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Reply feature state
  const [replyingTo, setReplyingTo] = useState<ChatReplyPreview | null>(null);

  // Active reaction picker message ID
  const [activePickerMsgId, setActivePickerMsgId] = useState<string | null>(null);

  // Quick prompts toggle
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);

  // Scroll to bottom button visibility
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Safari iOS keyboard & visualViewport management
  const [viewportMetrics, setViewportMetrics] = useState<{ height: number; top: number } | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-detect device (iPhone 11 -> Ceyda, iPhone 17 Pro Max / Apple iPhone -> Fatih)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const detected = detectDeviceAuthor();
      setDetectedInfo(detected);

      const savedName = localStorage.getItem('aol_chat_dm_author');
      if (savedName === 'Ceyda' || savedName === 'Fatih') {
        setAuthorName(savedName);
        setSelectedAvatar(savedName === 'Ceyda' ? '🎀' : '🎓');
      } else {
        // Automatic detection fallback
        setAuthorName(detected.author);
        setSelectedAvatar(detected.avatar);
        localStorage.setItem('aol_chat_dm_author', detected.author);
      }
    }
  }, []);

  const switchAuthor = (name: 'Fatih' | 'Ceyda') => {
    setAuthorName(name);
    setSelectedAvatar(name === 'Ceyda' ? '🎀' : '🎓');
    if (typeof window !== 'undefined') {
      localStorage.setItem('aol_chat_dm_author', name);
    }
    showToast(`Şu an "${name}" olarak mesaj yazıyorsunuz ✨`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Safari visualViewport handling for 100% fluid mobile keyboard experience
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportChange = () => {
      if (window.visualViewport) {
        const vv = window.visualViewport;
        setViewportMetrics({
          height: vv.height,
          top: vv.offsetTop
        });

        // Check if keyboard is open
        const keyboardActive = window.innerHeight - vv.height > 140;
        setIsKeyboardOpen(keyboardActive);
        if (onKeyboardChange) {
          onKeyboardChange(keyboardActive);
        }

        // Prevent Safari from bouncing the outer window
        if (keyboardActive) {
          window.scrollTo(0, 0);
          document.body.scrollTop = 0;
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
      handleViewportChange();
    }

    // Lock page window scroll when chat is active
    const handleWindowScroll = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('scroll', handleWindowScroll, { passive: true });

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, [onKeyboardChange]);

  // Lock body scroll when chat is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, []);

  // Fetch messages from API (NEVER purges, loads full history and tracks read status)
  const fetchMessages = async (silent: boolean = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const userParam = authorName ? `&user=${encodeURIComponent(authorName)}` : '';
      const res = await fetch(`/api/chat?_t=${Date.now()}${userParam}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
        if (data.lastSeen) {
          setLastSeenTimes(data.lastSeen);
        }
      }
    } catch (err) {
      console.error('Chat fetch error:', err);
    } finally {
      setIsLoading(false);
      if (!silent) setIsRefreshing(false);
    }
  };

  // Initial load and polling every 3.5s
  useEffect(() => {
    fetchMessages();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMessages(true);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [authorName]);

  // Initial scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      if (isFirstLoad.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        isFirstLoad.current = false;
      }
    }
  }, [messages]);

  // Monitor scroll for scroll-to-bottom button
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isFarFromBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  // Search matches
  const matchedMessageIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return messages
      .filter((m) => m.text.toLowerCase().includes(q))
      .map((m) => m.id);
  }, [messages, searchQuery]);

  useEffect(() => {
    setCurrentMatchIndex(0);
    if (matchedMessageIds.length > 0) {
      scrollToMatch(0);
    }
  }, [searchQuery, matchedMessageIds.length]);

  const scrollToMatch = (index: number) => {
    if (matchedMessageIds.length === 0) return;
    const targetId = matchedMessageIds[index];
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchedMessageIds.length;
    setCurrentMatchIndex(nextIdx);
    scrollToMatch(nextIdx);
  };

  const handlePrevMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const prevIdx =
      (currentMatchIndex - 1 + matchedMessageIds.length) % matchedMessageIds.length;
    setCurrentMatchIndex(prevIdx);
    scrollToMatch(prevIdx);
  };

  // Send a new message
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputText).trim();

    if (!textToSend || isSending) return;

    setIsSending(true);

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      author: authorName,
      avatar: selectedAvatar,
      text: textToSend,
      createdAt: new Date().toISOString(),
      badge: 'Sen',
      replyTo: replyingTo || undefined,
      reactions: {}
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setReplyingTo(null);

    // Scroll down immediately
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: authorName,
          avatar: selectedAvatar,
          text: textToSend,
          replyTo: replyingTo || undefined
        })
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m))
        );
      } else {
        showToast(data.error || 'Mesaj gönderilemedi.');
      }
    } catch (err) {
      console.error('Send message error:', err);
      showToast('Bağlantı hatası, tekrar deneyin.');
    } finally {
      setIsSending(false);
      fetchMessages(true);
    }
  };

  // Toggle reaction on a message
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setActivePickerMsgId(null);

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const users = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
        const userIdx = users.indexOf(authorName);

        if (userIdx > -1) {
          users.splice(userIdx, 1);
          if (users.length === 0) {
            delete currentReactions[emoji];
          } else {
            currentReactions[emoji] = users;
          }
        } else {
          users.push(authorName);
          currentReactions[emoji] = users;
        }

        return { ...m, reactions: currentReactions };
      })
    );

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'react',
          messageId,
          emoji,
          user: authorName
        })
      });
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  // Copy message text
  const handleCopyMessage = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Mesaj panoya kopyalandı 📋');
    }
  };

  // Read status helper: true if receiver opened chat after this message was sent
  const isMessageRead = (msg: ChatMessage) => {
    if (!msg || msg.id.startsWith('temp_')) return false;
    const partnerKey = authorName === 'Ceyda' ? 'Fatih' : 'Ceyda';
    const partnerSeen = lastSeenTimes[partnerKey];
    if (!partnerSeen) return false;

    try {
      const msgTime = new Date(msg.createdAt).getTime();
      const seenTime = new Date(partnerSeen).getTime();
      return seenTime >= msgTime;
    } catch {
      return false;
    }
  };

  // Normalize author naming for legacy messages
  const getDisplayAuthor = (author: string) => {
    if (author === 'Açık Liseli' || author.toLowerCase().includes('ceyda')) {
      return 'Ceyda 🎀';
    }
    if (author.toLowerCase().includes('fatih')) {
      return 'Fatih 🎓';
    }
    return author;
  };

  const getDisplayAvatar = (msg: ChatMessage) => {
    if (msg.author === 'Açık Liseli' || msg.author.toLowerCase().includes('ceyda')) {
      return '🎀';
    }
    if (msg.author.toLowerCase().includes('fatih')) {
      return '🎓';
    }
    return msg.avatar || '🌸';
  };

  const isMyMessage = (msg: ChatMessage) => {
    if (authorName === 'Ceyda') {
      return msg.author === 'Ceyda' || msg.author === 'Açık Liseli';
    }
    return msg.author === 'Fatih';
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

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const formatDateDivider = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (isSameDay(d, today)) return 'Bugün';
      if (isSameDay(d, yesterday)) return 'Dün';

      return d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return '';
    }
  };

  // Highlight search keywords
  const renderMessageText = (text: string) => {
    const q = searchQuery.trim();
    if (!q) return text;

    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark
          key={i}
          className="bg-amber-300 text-zinc-950 font-bold px-0.5 rounded shadow-xs"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-[#ffe5ec] flex flex-col justify-between overflow-hidden select-text text-left"
      style={{
        height: viewportMetrics ? `${viewportMetrics.height}px` : '100dvh',
        maxHeight: viewportMetrics ? `${viewportMetrics.height}px` : '100dvh',
        top: viewportMetrics ? `${viewportMetrics.top}px` : 0,
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: 'max(env(safe-area-inset-top, 0px), 6px)',
        paddingBottom: isKeyboardOpen ? '4px' : 'calc(env(safe-area-inset-bottom, 0px) + 68px)'
      }}
    >
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full overflow-hidden px-2 sm:px-4">
        {/* Toast Alert Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-pink-600 to-rose-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-fade-in pointer-events-none">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TOP DM HEADER BAR */}
        <div className="shrink-0 bg-white/95 backdrop-blur-md border border-pink-200/80 rounded-2xl p-2.5 sm:p-3 shadow-md shadow-pink-100/40 mb-2">
          <div className="flex items-center justify-between gap-2">
            {/* Couple Title & Live Status & Device Detection Pill */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-lg shadow-sm text-white">
                  💖
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black text-zinc-800 tracking-tight truncate">
                    Ceyda & Fatih
                  </h2>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded-md shrink-0">
                    Özel DM
                  </span>
                  {detectedInfo && (
                    <span
                      className="text-[10px] font-semibold text-pink-700 bg-pink-50/80 border border-pink-200/60 px-1.5 py-0.5 rounded-md hidden xs:inline-flex items-center gap-1 shrink-0"
                      title={`Algılanan Cihaz: ${detectedInfo.deviceName} (${detectedInfo.author})`}
                    >
                      <Smartphone className="w-2.5 h-2.5 text-pink-500" />
                      <span>{detectedInfo.deviceName}</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 flex items-center gap-1 truncate">
                  <Lock className="w-3 h-3 text-pink-500 shrink-0" />
                  <span>Uçtan uca şifreli özel alan • {messages.length} mesaj</span>
                </p>
              </div>
            </div>

          {/* Right Action Icons: Identity Switcher & Search & Refresh */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick 1-Tap Identity Switcher */}
            <div className="flex items-center bg-pink-50 border border-pink-200/70 rounded-xl p-0.5 text-[11px] font-bold">
              <button
                onClick={() => switchAuthor('Fatih')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  authorName === 'Fatih'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-pink-600'
                }`}
                title="Fatih olarak yaz"
              >
                <span>🎓</span>
                <span className="hidden sm:inline">Fatih</span>
              </button>
              <button
                onClick={() => switchAuthor('Ceyda')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  authorName === 'Ceyda'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-pink-600'
                }`}
                title="Ceyda olarak yaz"
              >
                <span>🎀</span>
                <span className="hidden sm:inline">Ceyda</span>
              </button>
            </div>

            {/* Search Toggle Button */}
            <button
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) {
                  setSearchQuery('');
                }
              }}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isSearchOpen || searchQuery
                  ? 'bg-pink-500 text-white border-pink-500 shadow-sm'
                  : 'bg-white hover:bg-pink-50 text-zinc-700 border-pink-200'
              }`}
              title="Mesajlarda Ara"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => fetchMessages(false)}
              disabled={isRefreshing}
              title="Sohbeti Yenile"
              className="p-2 rounded-xl bg-white hover:bg-pink-50 text-pink-600 border border-pink-200 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* SEARCH BAR DROPDOWN */}
        {isSearchOpen && (
          <div className="mt-2.5 pt-2.5 border-t border-pink-100 flex items-center gap-2 animate-fade-in">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Önceki mesajlarda kelime ara..."
                className="w-full bg-pink-50/60 border border-pink-200/80 rounded-xl pl-8 pr-7 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-600 shrink-0">
                <span>
                  {matchedMessageIds.length > 0
                    ? `${currentMatchIndex + 1}/${matchedMessageIds.length}`
                    : 'Bulunamadı'}
                </span>
                <button
                  onClick={handlePrevMatch}
                  disabled={matchedMessageIds.length === 0}
                  className="p-1 rounded-lg bg-pink-100 hover:bg-pink-200 text-pink-700 disabled:opacity-40"
                  title="Önceki eşleşme"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextMatch}
                  disabled={matchedMessageIds.length === 0}
                  className="p-1 rounded-lg bg-pink-100 hover:bg-pink-200 text-pink-700 disabled:opacity-40"
                  title="Sonraki eşleşme"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MESSAGES SCROLL CONTAINER */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white/85 border border-pink-200/70 rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-inner space-y-3 relative"
      >
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-pink-500 py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-pink-400" />
            <span className="text-xs font-bold text-zinc-500">
              Özel sohbet geçmişi yükleniyor...
            </span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-6 py-12">
            <div className="text-4xl mb-1">💖</div>
            <h3 className="text-sm font-bold text-zinc-700">Ceyda & Fatih Özel Alanı</h3>
            <p className="text-xs text-zinc-500 max-w-xs">
              Burası sadece ikinize özeldir. İlk mesajı yazarak konuşmayı başlatabilirsiniz!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = isMyMessage(msg);
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const showDateDivider =
              !prevMsg ||
              !isSameDay(new Date(prevMsg.createdAt), new Date(msg.createdAt));

            const isMatched =
              searchQuery &&
              msg.text.toLowerCase().includes(searchQuery.trim().toLowerCase());
            const isCurrentMatch =
              isMatched && matchedMessageIds[currentMatchIndex] === msg.id;

            const reactions = msg.reactions || {};
            const hasReactions = Object.keys(reactions).length > 0;

            return (
              <div key={msg.id} id={`msg-${msg.id}`} className="space-y-2">
                {/* Date divider pill */}
                {showDateDivider && (
                  <div className="flex items-center justify-center my-3 select-none">
                    <span className="bg-pink-100/80 text-pink-700 text-[10px] font-bold px-3 py-1 rounded-full shadow-xs border border-pink-200/50">
                      {formatDateDivider(msg.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={`flex items-end gap-1.5 group relative ${
                    isMe ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Left Avatar for other person */}
                  {!isMe && (
                    <div
                      className="w-7 h-7 rounded-full bg-pink-100 border border-pink-200 flex items-center justify-center text-xs shrink-0 shadow-xs mb-0.5 select-none"
                      title={getDisplayAuthor(msg.author)}
                    >
                      {getDisplayAvatar(msg)}
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div
                    className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-xs transition-all duration-200 ${
                      isMe
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-br-xs'
                        : 'bg-white border border-pink-100 text-zinc-850 rounded-bl-xs'
                    } ${
                      isCurrentMatch
                        ? 'ring-3 ring-amber-400 shadow-md shadow-amber-200 scale-[1.01]'
                        : isMatched
                        ? 'ring-2 ring-pink-400/60'
                        : ''
                    }`}
                  >
                    {/* Replying quote inside bubble */}
                    {msg.replyTo && (
                      <div
                        onClick={() => {
                          const el = document.getElementById(`msg-${msg.replyTo?.id}`);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className={`mb-2 p-2 rounded-xl text-[11px] cursor-pointer border-l-3 transition-colors ${
                          isMe
                            ? 'bg-white/15 border-white text-pink-100 hover:bg-white/20'
                            : 'bg-pink-50 border-pink-500 text-zinc-700 hover:bg-pink-100'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1 text-[10px] opacity-90">
                          <Reply className="w-2.5 h-2.5" />
                          <span>{msg.replyTo.author}</span>
                        </div>
                        <p className="truncate opacity-80 mt-0.5">{msg.replyTo.text}</p>
                      </div>
                    )}

                    {/* Author & Actions header */}
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span
                        className={`text-[11px] font-black truncate ${
                          isMe ? 'text-pink-100' : 'text-pink-600'
                        }`}
                      >
                        {isMe ? 'Sen' : getDisplayAuthor(msg.author)}
                      </span>

                      {/* Message hover actions (Reply, React, Copy) */}
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            setReplyingTo({
                              id: msg.id,
                              author: getDisplayAuthor(msg.author),
                              text: msg.text
                            })
                          }
                          className={`p-1 rounded hover:bg-black/10 transition-colors cursor-pointer ${
                            isMe ? 'text-pink-100' : 'text-zinc-500'
                          }`}
                          title="Cevapla"
                        >
                          <Reply className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() =>
                            setActivePickerMsgId(
                              activePickerMsgId === msg.id ? null : msg.id
                            )
                          }
                          className={`p-1 rounded hover:bg-black/10 transition-colors cursor-pointer ${
                            isMe ? 'text-pink-100' : 'text-zinc-500'
                          }`}
                          title="Emoji Ekle"
                        >
                          <Smile className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => handleCopyMessage(msg.text)}
                          className={`p-1 rounded hover:bg-black/10 transition-colors cursor-pointer ${
                            isMe ? 'text-pink-100' : 'text-zinc-500'
                          }`}
                          title="Kopyala"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Message Text with highlight */}
                    <p className="text-xs sm:text-[13px] leading-relaxed break-words whitespace-pre-wrap select-text">
                      {renderMessageText(msg.text)}
                    </p>

                    {/* Timestamp & single/double checkmark status */}
                    <div
                      className={`text-[9px] mt-1.5 flex items-center justify-end gap-1 select-none ${
                        isMe ? 'text-pink-100' : 'text-zinc-400'
                      }`}
                    >
                      <span>{formatMessageTime(msg.createdAt)}</span>
                      {isMe && (
                        <>
                          {msg.id.startsWith('temp_') ? (
                            <span className="inline-flex items-center" title="Gönderiliyor...">
                              <Clock className="w-2.5 h-2.5 text-pink-200 animate-spin inline" />
                            </span>
                          ) : isMessageRead(msg) ? (
                            <span className="inline-flex items-center text-sky-200 font-bold" title="Okundu (Çift Tik)">
                              <CheckCheck className="w-3.5 h-3.5 inline drop-shadow-xs" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-pink-200/90" title="İletildi (Tek Tik)">
                              <Check className="w-3 h-3 inline" />
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Reactions display pills */}
                    {hasReactions && (
                      <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-1 border-t border-pink-200/40">
                        {Object.entries(reactions).map(([emoji, users]) => {
                          const iReacted = users.includes(authorName);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                iReacted
                                  ? 'bg-pink-100 text-pink-700 border-pink-300 shadow-xs'
                                  : isMe
                                  ? 'bg-white/20 text-white border-white/30'
                                  : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span>{users.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Floating Reaction Emoji Picker Popover */}
                    {activePickerMsgId === msg.id && (
                      <div
                        className={`absolute -top-10 z-40 bg-white/95 backdrop-blur-md border border-pink-200 rounded-full px-2 py-1 shadow-lg flex items-center gap-1.5 animate-fade-in ${
                          isMe ? 'right-0' : 'left-0'
                        }`}
                      >
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="text-base hover:scale-130 transition-transform cursor-pointer p-0.5"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          onClick={() => setActivePickerMsgId(null)}
                          className="text-zinc-400 hover:text-zinc-600 pl-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Avatar for me */}
                  {isMe && (
                    <div
                      className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-400 to-rose-400 text-white flex items-center justify-center text-xs shrink-0 shadow-xs mb-0.5 select-none"
                      title="Sen"
                    >
                      {selectedAvatar}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />

        {/* Floating Scroll to Bottom Button */}
        {showScrollBottom && (
          <button
            onClick={scrollToBottom}
            className="sticky bottom-2 right-2 float-right z-30 p-2.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white shadow-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-bold animate-bounce"
            title="En alta in"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* QUICK PROMPTS CHIPS ROW */}
      <div className="shrink-0 mt-1">
        <div className="flex items-center justify-between px-1 mb-1">
          <button
            onClick={() => setShowQuickPrompts(!showQuickPrompts)}
            className="text-[10px] font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{showQuickPrompts ? 'Hızlı Mesajları Gizle ✕' : '💖 Hızlı Mesajlar'}</span>
          </button>
        </div>

        {showQuickPrompts && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none animate-fade-in">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(undefined, prompt)}
                disabled={isSending}
                className="text-xs bg-white hover:bg-pink-50 border border-pink-200 text-zinc-700 hover:text-pink-600 font-medium px-2.5 py-1 rounded-full shrink-0 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* REPLY PREVIEW BAR (if replying to a message) */}
      {replyingTo && (
        <div className="shrink-0 bg-pink-50/90 border border-pink-200/80 rounded-xl px-3 py-1.5 mb-1 flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-3.5 h-3.5 text-pink-600 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-pink-700 block truncate">
                {replyingTo.author} alıntılanıyor:
              </span>
              <span className="text-zinc-600 truncate block text-[11px]">
                {replyingTo.text}
              </span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BOTTOM INPUT BAR - SAFARI OPTIMIZED */}
      <form
        onSubmit={handleSendMessage}
        className="shrink-0 bg-white/95 border border-pink-200/80 rounded-2xl p-1.5 sm:p-2 backdrop-blur-md shadow-md shadow-pink-100/40 flex items-center gap-2"
      >
        <div
          className="pl-2 pr-1 text-base select-none cursor-pointer"
          title={`Şu an yazan: ${authorName}`}
          onClick={() => switchAuthor(authorName === 'Fatih' ? 'Ceyda' : 'Fatih')}
        >
          {selectedAvatar}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`${authorName} olarak mesaj yaz...`}
          maxLength={1000}
          disabled={isSending}
          onFocus={() => {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          className="flex-1 bg-transparent py-1.5 px-1 text-xs sm:text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
        />

        <div className="text-[10px] font-bold text-zinc-400 px-1 select-none hidden sm:inline">
          {inputText.length}/1000
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-pink-300/40 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {isSending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span className="text-xs hidden sm:inline">Gönder</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>
      </div>
    </div>
  );
}
