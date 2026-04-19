'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ACCOUNT_TYPES = [
  {
    value: 'subscription',
    label: '个人订阅号',
    description: '个人申请的订阅号，API 权限有限',
    features: ['✅ 接收消息', '✅ 自动回复', '✅ 自定义菜单', '✅ 关注/取关事件', '❌ 粉丝列表同步', '❌ 主动发消息', '❌ 模板消息'],
  },
  {
    value: 'subscription_certified',
    label: '认证订阅号',
    description: '企业/组织认证的订阅号，拥有大部分接口权限',
    features: ['✅ 接收消息', '✅ 自动回复', '✅ 自定义菜单', '✅ 粉丝列表同步', '✅ 主动发消息', '✅ 模板消息', '❌ 微信支付'],
  },
  {
    value: 'service',
    label: '服务号',
    description: '企业/组织申请的服务号',
    features: ['✅ 接收消息', '✅ 自动回复', '✅ 自定义菜单', '✅ 粉丝列表同步', '✅ 主动发消息', '✅ 模板消息', '✅ 微信支付'],
  },
  {
    value: 'miniprogram',
    label: '小程序',
    description: '关联的小程序（仅消息管理）',
    features: ['✅ 接收消息', '✅ 自动回复', '❌ 自定义菜单', '❌ 粉丝列表同步'],
  },
  {
    value: 'test',
    label: '测试号',
    description: '微信公众平台接口测试帐号，拥有所有权限',
    features: ['✅ 所有接口权限', '✅ 适合开发调试'],
  },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form state
  const [appid, setAppid] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('subscription');

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const res = await fetch('/api/wechat/config');
      const data = await res.json();
      if (data.configured === false) {
        setConfig(null);
      } else {
        setConfig(data);
        setAppid(data.appid || '');
        setName(data.name || '');
        setAccountType(data.accountType || 'subscription');
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/wechat/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appid, appSecret, name, accountType }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('保存成功');
        fetchConfig();
        setAppSecret('');
      } else {
        setMessage(data.error || '保存失败');
      }
    } catch {
      setMessage('网络错误，请重试');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">加载中...</p></div>;
  }

  const selectedType = ACCOUNT_TYPES.find(t => t.value === accountType) || ACCOUNT_TYPES[0];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">系统设置</h2>
        <p className="text-muted-foreground">配置微信公众号接入参数</p>
      </div>

      <div className="grid gap-6">
        {/* 公众号类型选择 */}
        <Card>
          <CardHeader>
            <CardTitle>公众号类型</CardTitle>
            <CardDescription>选择你的公众号类型，系统会自动适配可用功能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {ACCOUNT_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
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
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{type.label}</span>
                      {type.value === 'test' && <Badge variant="secondary">推荐开发</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {type.features.map((f, i) => (
                        <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${
                          f.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* API 配置 */}
        <Card>
          <CardHeader>
            <CardTitle>API 配置</CardTitle>
            <CardDescription>
              在微信公众平台 → 开发 → 基本配置中获取
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  placeholder={config?.hasSecret ? '留空保持原密钥不变' : '请输入 AppSecret'}
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  required={!config?.hasSecret}
                />
                {config?.hasSecret && (
                  <p className="text-xs text-muted-foreground">已设置密钥，留空则不修改</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">服务器地址 (URL)</label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/wechat/webhook`}
                    className="bg-muted"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/wechat/webhook`);
                    setMessage('已复制到剪贴板');
                    setTimeout(() => setMessage(''), 2000);
                  }}>
                    复制
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  将此地址填入微信公众平台 → 设置与开发 → 基本配置 → 服务器配置
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Token (令牌)</label>
                <p className="text-xs text-muted-foreground">
                  使用 AppSecret 作为 Token 进行签名验证。如需自定义 Token，请在环境变量中设置 WECHAT_TOKEN
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? '保存中...' : '保存配置'}
                </Button>
                {config && (
                  <Badge variant="outline" className="h-9 flex items-center">
                    已配置 · {selectedType.label}
                  </Badge>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 功能说明 */}
        <Card>
          <CardHeader>
            <CardTitle>当前可用功能</CardTitle>
            <CardDescription>根据你选择的公众号类型，以下功能已自动适配</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">所有类型通用</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✅ 接收用户消息（通过 Webhook）</li>
                  <li>✅ 自动回复（关注/关键词/默认）</li>
                  <li>✅ 自定义菜单配置</li>
                  <li>✅ 关注/取关事件记录</li>
                  <li>✅ 粉丝数据（通过事件积累）</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  {accountType === 'subscription' ? '个人订阅号不可用' : '认证号/服务号/测试号可用'}
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className={accountType === 'subscription' ? 'text-gray-400' : ''}>
                    {accountType === 'subscription' ? '❌' : '✅'} 从微信同步粉丝列表
                  </li>
                  <li className={accountType === 'subscription' ? 'text-gray-400' : ''}>
                    {accountType === 'subscription' ? '❌' : '✅'} 主动发送客服消息
                  </li>
                  <li className={accountType === 'subscription' ? 'text-gray-400' : ''}>
                    {accountType === 'subscription' ? '❌' : '✅'} 模板消息推送
                  </li>
                  <li className={accountType === 'subscription' ? 'text-gray-400' : ''}>
                    {accountType === 'subscription' ? '❌' : '✅'} 获取用户详细信息
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
