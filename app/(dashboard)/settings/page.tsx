'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useAccount } from '../account-context';

const ACCOUNT_TYPES = [
  { value: 'subscription', label: '个人订阅号' },
  { value: 'subscription_certified', label: '认证订阅号' },
  { value: 'service', label: '服务号' },
  { value: 'miniprogram', label: '小程序' },
  { value: 'test', label: '测试号' },
];

const typeLabelMap: Record<string, string> = {};
ACCOUNT_TYPES.forEach(t => { typeLabelMap[t.value] = t.label; });

export default function SettingsPage() {
  const { accounts, refreshAccounts } = useAccount();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form state
  const [appid, setAppid] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('subscription');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    refreshAccounts().finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingId(null);
    setAppid('');
    setAppSecret('');
    setName('');
    setAccountType('subscription');
    setEnabled(true);
    setMessage('');
    setDialogOpen(true);
  }

  function openEdit(account: any) {
    setEditingId(account.id);
    setAppid(account.appid || '');
    setAppSecret('');
    setName(account.name || '');
    setAccountType(account.accountType || 'subscription');
    setEnabled(account.enabled !== false);
    setMessage('');
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const body: any = { appid, name, accountType, enabled };
      if (appSecret) body.appSecret = appSecret;

      const url = editingId ? `/api/wechat/config?id=${editingId}` : '/api/wechat/config';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('保存成功');
        setTimeout(() => {
          setDialogOpen(false);
          refreshAccounts();
        }, 500);
      } else {
        setMessage(data.error || '保存失败');
      }
    } catch {
      setMessage('网络错误，请重试');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定要删除该公众号配置吗？删除后相关数据将无法恢复。')) return;
    try {
      const res = await fetch(`/api/wechat/config?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        refreshAccounts();
      }
    } catch {
      alert('删除失败');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">加载中...</p></div>;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">公众号管理</h2>
          <p className="text-muted-foreground">管理所有已配置的微信公众号</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          添加公众号
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground text-center">
              <p className="text-lg font-medium mb-2">暂无公众号配置</p>
              <p className="text-sm mb-4">请点击上方按钮添加你的第一个公众号</p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              添加公众号
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className={!account.enabled ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{account.name || '未命名'}</CardTitle>
                    <CardDescription className="mt-1 font-mono text-xs">{account.appid}</CardDescription>
                  </div>
                  <Badge variant={account.enabled ? 'default' : 'secondary'}>
                    {account.enabled ? '已启用' : '已禁用'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">类型</span>
                    <span>{typeLabelMap[account.accountType] || account.accountType}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">状态</span>
                    <Badge variant="outline" className="text-xs">
                      {account.enabled ? '正常' : '停用'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(account)}>
                    <Edit className="h-4 w-4 mr-1" />
                    编辑
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(account.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Webhook info */}
      <Card>
        <CardHeader>
          <CardTitle>服务器配置说明</CardTitle>
          <CardDescription>每个公众号需要配置相同的服务器地址</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/wechat/webhook`}
                className="bg-muted"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/api/wechat/webhook`);
              }}>
                复制
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {'将此地址填入微信公众平台 -\u003e 设置与开发 -\u003e 基本配置 -\u003e 服务器配置'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑公众号' : '添加公众号'}</DialogTitle>
            <DialogDescription>
              {editingId ? '修改公众号配置信息' : '填写微信公众号接入参数'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {message && (
              <div className={`text-sm p-3 rounded-md ${
                message.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-destructive/10 text-destructive'
              }`}>
                {message}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">公众号名称</label>
              <Input
                id="name"
                placeholder="给你的公众号起个名字，方便识别"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="appid">AppID</label>
              <Input
                id="appid"
                placeholder="wx1234567890abcdef"
                value={appid}
                onChange={(e) => setAppid(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="appSecret">AppSecret</label>
              <Input
                id="appSecret"
                type="password"
                placeholder={editingId ? '留空保持原密钥不变' : '请输入 AppSecret'}
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                required={!editingId}
              />
              {editingId && (
                <p className="text-xs text-muted-foreground">已设置密钥，留空则不修改</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">公众号类型</label>
              <div className="grid gap-3">
                {ACCOUNT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      accountType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value={type.value}
                      checked={accountType === type.value}
                      onChange={(e) => setAccountType(e.target.value)}
                    />
                    <span className="text-sm font-medium">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">启用</label>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm text-muted-foreground">禁用后该公众号将不接收消息</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button type="submit" disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
