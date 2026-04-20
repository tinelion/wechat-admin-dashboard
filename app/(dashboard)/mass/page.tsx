'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, RefreshCw } from 'lucide-react';
import { useAccount } from '../account-context';

interface MassRecord {
  id: number;
  msgType: string;
  content: string;
  target: string;
  status: string;
  createdAt: string;
}

interface Tag {
  id: number;
  name: string;
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: '待发送', variant: 'outline' },
  sending: { label: '发送中', variant: 'secondary' },
  completed: { label: '已完成', variant: 'default' },
  failed: { label: '失败', variant: 'destructive' },
};

export default function MassPage() {
  const { currentAccountId } = useAccount();
  const [records, setRecords] = useState<MassRecord[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // 新建群发弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    msgType: 'text',
    content: '',
    target: 'all',
    tagId: '',
  });

  const fetchRecords = useCallback(async () => {
    if (!currentAccountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/mass?configId=${currentAccountId}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : (Array.isArray(data?.records) ? data.records : []));
    } catch (error) {
      console.error('Failed to fetch mass records:', error);
    } finally {
      setLoading(false);
    }
  }, [currentAccountId]);

  const fetchTags = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await fetch(`/api/tags?configId=${currentAccountId}`);
      const data = await res.json();
      setTags(Array.isArray(data) ? data : (Array.isArray(data?.tags) ? data.tags : []));
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  }, [currentAccountId]);

  useEffect(() => {
    setRecords([]);
  }, [currentAccountId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  async function handleCreate() {
    if (!currentAccountId || !form.content) return;
    try {
      const res = await fetch('/api/mass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, configId: currentAccountId }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setCreateOpen(false);
        setForm({ msgType: 'text', content: '', target: 'all', tagId: '' });
        fetchRecords();
      }
    } catch (error) {
      alert('创建失败');
    }
  }

  function getStatusBadge(status: string) {
    const info = statusMap[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  }

  function getMsgTypeLabel(type: string) {
    const map: Record<string, string> = { text: '文字', image: '图片', news: '图文' };
    return map[type] || type;
  }

  function getTargetLabel(target: string) {
    if (target === 'all') return '全部粉丝';
    const tag = tags.find(t => String(t.id) === target);
    return tag ? `标签: ${tag.name}` : target;
  }

  if (!currentAccountId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">请先选择公众号</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">群发消息</h1>
          <p className="text-muted-foreground">向粉丝群发消息</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchRecords} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新建群发
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无群发记录，点击"新建群发"创建
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>消息类型</TableHead>
                  <TableHead>内容摘要</TableHead>
                  <TableHead>发送对象</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>发送时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Badge variant="outline">{getMsgTypeLabel(record.msgType)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {record.content.length > 50 ? record.content.slice(0, 50) + '...' : record.content}
                    </TableCell>
                    <TableCell>{getTargetLabel(record.target)}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.createdAt ? new Date(record.createdAt).toLocaleString('zh-CN') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 新建群发弹窗 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建群发</DialogTitle>
            <DialogDescription>创建新的群发消息任务</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>消息类型</Label>
              <Select value={form.msgType} onValueChange={(v) => setForm({ ...form, msgType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">文字</SelectItem>
                  <SelectItem value="image">图片</SelectItem>
                  <SelectItem value="news">图文</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>内容</Label>
              {form.msgType === 'text' ? (
                <Textarea
                  placeholder="输入文字内容"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={4}
                />
              ) : (
                <Input
                  placeholder={form.msgType === 'image' ? '输入图片URL或media_id' : '输入图文消息media_id'}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>发送对象</Label>
              <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部粉丝</SelectItem>
                  <SelectItem value="tag">按标签</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.target === 'tag' && (
              <div className="space-y-2">
                <Label>选择标签</Label>
                <Select value={form.tagId} onValueChange={(v) => setForm({ ...form, tagId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择标签" />
                  </SelectTrigger>
                  <SelectContent>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={String(tag.id)}>{tag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!form.content}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
