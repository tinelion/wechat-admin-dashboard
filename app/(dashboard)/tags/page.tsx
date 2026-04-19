'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Plus, RefreshCw, Eye, ArrowUpDown } from 'lucide-react';
import { useAccount } from '../account-context';

interface Tag {
  id: number;
  name: string;
  count: number;
}

export default function TagsPage() {
  const { currentAccountId } = useAccount();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // 创建标签弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [tagName, setTagName] = useState('');

  const fetchTags = useCallback(async () => {
    if (!currentAccountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tags?configId=${currentAccountId}`);
      const data = await res.json();
      setTags(Array.isArray(data) ? data : data.tags || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  }, [currentAccountId]);

  useEffect(() => {
    setTags([]);
  }, [currentAccountId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  async function handleSync() {
    if (!currentAccountId) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/tags/sync?configId=${currentAccountId}`, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert(`同步完成！共 ${data.count || tags.length} 个标签`);
        fetchTags();
      }
    } catch (error) {
      alert('同步失败');
    } finally {
      setSyncing(false);
    }
  }

  async function handleCreate() {
    if (!currentAccountId || !tagName) return;
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName, configId: currentAccountId }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setCreateOpen(false);
        setTagName('');
        fetchTags();
      }
    } catch (error) {
      alert('创建失败');
    }
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
          <h1 className="text-2xl font-bold tracking-tight">粉丝标签管理</h1>
          <p className="text-muted-foreground">
            共 {tags.length} 个标签
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <ArrowUpDown className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同步中...' : '同步标签'}
          </Button>
          <Button variant="outline" onClick={fetchTags} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            创建标签
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : tags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无标签，点击"创建标签"或"同步标签"获取
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标签ID</TableHead>
                  <TableHead>标签名</TableHead>
                  <TableHead>粉丝数量</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="font-mono text-sm">{tag.id}</TableCell>
                    <TableCell className="font-medium">{tag.name}</TableCell>
                    <TableCell>{tag.count || 0}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/fans?tagId=${tag.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          查看粉丝
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建标签弹窗 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建标签</DialogTitle>
            <DialogDescription>创建新的粉丝标签</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>标签名称</Label>
              <Input
                placeholder="输入标签名称"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!tagName}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
