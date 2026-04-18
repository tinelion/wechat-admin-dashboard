'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send } from 'lucide-react';

interface Message {
  id: number;
  openid: string;
  msgType: string;
  content: string | null;
  isOutgoing: boolean;
  event: string | null;
  eventKey: string | null;
  createdAt: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const offset = useRef(0);
  const limit = 50;

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?offset=${offset.current}&limit=${limit}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  async function handleSend(openid: string) {
    if (!replyContent.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openid, content: replyContent }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setReplyContent('');
        setReplyTo(null);
        fetchMessages();
      }
    } catch {
      alert('发送失败');
    } finally {
      setSending(false);
    }
  }

  function getMsgTypeLabel(msgType: string, event: string | null) {
    if (event === 'subscribe') return '关注';
    if (event === 'unsubscribe') return '取关';
    if (event === 'SCAN') return '扫码';
    if (event === 'CLICK') return '菜单点击';
    if (event === 'VIEW') return '菜单跳转';
    const map: Record<string, string> = {
      text: '文字', image: '图片', voice: '语音',
      video: '视频', location: '位置', link: '链接',
    };
    return map[msgType] || msgType;
  }

  function formatTime(time: string) {
    return new Date(time).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">消息管理</h1>
        <p className="text-muted-foreground">查看和回复粉丝消息（每10秒自动刷新）</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">消息列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无消息记录
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  {/* Avatar */}
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    msg.isOutgoing ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {msg.isOutgoing ? '我' : '粉'}
                  </div>

                  {/* Message bubble */}
                  <div className={`flex-1 max-w-[70%] ${msg.isOutgoing ? 'ml-auto' : ''}`}>
                    <div className={`rounded-lg px-3 py-2 text-sm ${
                      msg.isOutgoing
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {getMsgTypeLabel(msg.msgType, msg.event)}
                        </Badge>
                        <span className="text-xs opacity-60">{msg.openid.slice(0, 8)}...</span>
                      </div>
                      {msg.content ? (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      ) : msg.event ? (
                        <p className="text-muted-foreground italic">
                          {msg.event === 'subscribe' && '用户关注了公众号'}
                          {msg.event === 'unsubscribe' && '用户取消了关注'}
                          {msg.event === 'SCAN' && `扫码参数: ${msg.eventKey || '-'}`}
                          {msg.event === 'CLICK' && `点击菜单: ${msg.eventKey || '-'}`}
                          {msg.event === 'VIEW' && `跳转: ${msg.eventKey || '-'}`}
                        </p>
                      ) : (
                        <p className="text-muted-foreground italic">[无文本内容]</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1 px-1">
                      <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
                      {!msg.isOutgoing && msg.msgType === 'text' && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-6 text-xs"
                          onClick={() => setReplyTo(replyTo === msg.openid ? null : msg.openid)}
                        >
                          回复
                        </Button>
                      )}
                    </div>

                    {/* Reply input */}
                    {replyTo === msg.openid && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="输入回复内容..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSend(msg.openid)}
                          className="text-sm"
                        />
                        <Button size="sm" onClick={() => handleSend(msg.openid)} disabled={sending}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
