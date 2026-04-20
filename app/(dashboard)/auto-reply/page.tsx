'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Edit, MessageCircle, Shield } from 'lucide-react';
import { useAccount } from '../account-context';

interface AutoReply {
  id: number;
  type: string;
  keyword: string | null;
  matchType: string;
  replyType: string;
  replyContent: string;
  enabled: boolean;
  priority: number;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  subscribe: '关注回复',
  keyword: '关键词回复',
  default: '默认回复',
};

const matchTypeLabels: Record<string, string> = {
  exact: '精确匹配',
  partial: '包含匹配',
  regex: '正则匹配',
};

export default function AutoReplyPage() {
  const { currentAccountId } = useAccount();
  const [rules, setRules] = useState<AutoReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReply | null>(null);
  const [form, setForm] = useState({
    type: 'keyword',
    keyword: '',
    matchType: 'exact',
    replyType: 'text',
    replyContent: '',
    priority: 0,
  });

  const fetchRules = async () => {
    if (!currentAccountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/auto-replies?configId=${currentAccountId}`);
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRules([]);
  }, [currentAccountId]);

  useEffect(() => {
    fetchRules();
  }, [currentAccountId]);

  function openCreate(type: string) {
    setEditingRule(null);
    setForm({ type, keyword: '', matchType: 'exact', replyType: 'text', replyContent: '', priority: 0 });
    setDialogOpen(true);
  }

  function openEdit(rule: AutoReply) {
    setEditingRule(rule);
    setForm({
      type: rule.type,
      keyword: rule.keyword || '',
      matchType: rule.matchType,
      replyType: rule.replyType,
      replyContent: rule.replyContent,
      priority: rule.priority,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!currentAccountId) return;
    try {
      if (editingRule) {
        await fetch('/api/auto-replies', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingRule.id, ...form, configId: currentAccountId }),
        });
      } else {
        await fetch('/api/auto-replies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, configId: currentAccountId }),
        });
      }
      setDialogOpen(false);
      fetchRules();
    } catch (error) {
      alert('保存失败');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定要删除该规则吗？')) return;
    try {
      await fetch(`/api/auto-replies?id=${id}&configId=${currentAccountId}`, { method: 'DELETE' });
      fetchRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
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
          <h1 className="text-2xl font-bold tracking-tight">自动回复</h1>
          <p className="text-muted-foreground">配置关注回复、关键词回复和默认回复</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCreate('subscribe')}>
            <MessageCircle className="h-4 w-4 mr-2" />
            关注回复
          </Button>
          <Button variant="outline" onClick={() => openCreate('keyword')}>
            <Plus className="h-4 w-4 mr-2" />
            关键词回复
          </Button>
          <Button variant="outline" onClick={() => openCreate('default')}>
            <Shield className="h-4 w-4 mr-2" />
            默认回复
          </Button>
        </div>
      </div>

      {/* Quick setup cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {(['subscribe', 'keyword', 'default'] as const).map((type) => {
          const typeRules = rules.filter(r => r.type === type);
          const hasActive = typeRules.some(r => r.enabled);
          return (
            <Card key={type} className={hasActive ? 'border-green-200 bg-green-50/50' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  {typeLabels[type]}
                  <Badge variant={hasActive ? 'default' : 'secondary'}>
                    {hasActive ? '已启用' : '未配置'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {type === 'subscribe' && '新粉丝关注后自动发送的欢迎消息'}
                  {type === 'keyword' && `已配置 ${typeRules.length} 个关键词规则`}
                  {type === 'default' && '未匹配到关键词时的兜底回复'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline" size="sm" className="w-full"
                  onClick={() => openCreate(type)}
                >
                  {hasActive ? '编辑规则' : '立即配置'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rules table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">所有规则</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无自动回复规则，点击上方按钮添加
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>关键词</TableHead>
                  <TableHead>匹配方式</TableHead>
                  <TableHead>回复内容</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Badge variant="outline">{typeLabels[rule.type]}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {rule.keyword || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {rule.type === 'keyword' ? matchTypeLabels[rule.matchType] : '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {rule.replyContent}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? '启用' : '禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? '编辑规则' : `添加${typeLabels[form.type]}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {form.type === 'keyword' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">关键词</label>
                <Input
                  placeholder="输入触发关键词"
                  value={form.keyword}
                  onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                />
              </div>
            )}

            {form.type === 'keyword' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">匹配方式</label>
                <div className="flex gap-2">
                  {(['exact', 'partial'] as const).map((mt) => (
                    <Button
                      key={mt}
                      variant={form.matchType === mt ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setForm({ ...form, matchType: mt })}
                    >
                      {matchTypeLabels[mt]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">回复内容</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="输入回复内容..."
                value={form.replyContent}
                onChange={(e) => setForm({ ...form, replyContent: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave} disabled={!form.replyContent.trim()}>
                {editingRule ? '保存修改' : '创建规则'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
