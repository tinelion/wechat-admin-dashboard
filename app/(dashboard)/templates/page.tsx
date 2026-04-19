'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Send, Trash2, RefreshCw } from 'lucide-react';
import { useAccount } from '../account-context';

interface Template {
  id: number;
  templateId: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
}

export default function TemplatesPage() {
  const { currentAccountId } = useAccount();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // 添加模板弹窗
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ templateId: '', title: '', content: '' });

  // 发送模板弹窗
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<Template | null>(null);
  const [sendForm, setSendForm] = useState({ openid: '', data: '' });

  const fetchTemplates = useCallback(async () => {
    if (!currentAccountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/templates?configId=${currentAccountId}`);
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }, [currentAccountId]);

  useEffect(() => {
    setTemplates([]);
  }, [currentAccountId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleAdd() {
    if (!currentAccountId || !addForm.templateId || !addForm.title) return;
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, configId: currentAccountId }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setAddOpen(false);
        setAddForm({ templateId: '', title: '', content: '' });
        fetchTemplates();
      }
    } catch (error) {
      alert('添加失败');
    }
  }

  async function handleSend() {
    if (!currentAccountId || !sendTarget || !sendForm.openid) return;
    try {
      const res = await fetch('/api/templates/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: sendTarget.templateId,
          openid: sendForm.openid,
          data: sendForm.data,
          configId: currentAccountId,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setSendOpen(false);
        setSendTarget(null);
        setSendForm({ openid: '', data: '' });
        alert('发送成功');
      }
    } catch (error) {
      alert('发送失败');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定要删除该模板吗？')) return;
    try {
      await fetch(`/api/templates?id=${id}&configId=${currentAccountId}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
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
          <h1 className="text-2xl font-bold tracking-tight">模板消息管理</h1>
          <p className="text-muted-foreground">管理已保存的模板消息</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTemplates} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            添加模板
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无模板消息，点击"添加模板"创建
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>模板ID</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>内容示例</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell className="font-mono text-sm">{tpl.templateId}</TableCell>
                    <TableCell className="font-medium">{tpl.title}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {tpl.content || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tpl.status === 'active' ? 'default' : 'secondary'}>
                        {tpl.status === 'active' ? '正常' : tpl.status || '未知'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSendTarget(tpl);
                          setSendForm({ openid: '', data: '' });
                          setSendOpen(true);
                        }}>
                          <Send className="h-4 w-4 mr-1" />
                          发送
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(tpl.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
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

      {/* 添加模板弹窗 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加模板</DialogTitle>
            <DialogDescription>填写模板信息以添加新的模板消息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>模板ID</Label>
              <Input
                placeholder="输入微信模板ID"
                value={addForm.templateId}
                onChange={(e) => setAddForm({ ...addForm, templateId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>标题</Label>
              <Input
                placeholder="输入模板标题"
                value={addForm.title}
                onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>内容示例</Label>
              <Textarea
                placeholder="输入模板内容示例（JSON格式）"
                value={addForm.content}
                onChange={(e) => setAddForm({ ...addForm, content: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={!addForm.templateId || !addForm.title}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 发送模板弹窗 */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发送模板消息</DialogTitle>
            <DialogDescription>
              向指定用户发送模板消息：{sendTarget?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>用户 OpenID</Label>
              <Input
                placeholder="输入接收用户的 OpenID"
                value={sendForm.openid}
                onChange={(e) => setSendForm({ ...sendForm, openid: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>模板数据（JSON）</Label>
              <Textarea
                placeholder='{"first": {"value": "标题", "color": "#173177"}, "keyword1": {"value": "内容"}}'
                value={sendForm.data}
                onChange={(e) => setSendForm({ ...sendForm, data: e.target.value })}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>取消</Button>
            <Button onClick={handleSend} disabled={!sendForm.openid}>发送</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
