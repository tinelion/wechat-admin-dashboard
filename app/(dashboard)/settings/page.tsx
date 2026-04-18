'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Check, AlertCircle } from 'lucide-react';

interface Config {
  id?: number;
  appid: string;
  appSecret: string;
  name: string;
  enabled: boolean;
  hasSecret?: boolean;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ appid: '', appSecret: '', name: '默认公众号' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/wechat/config')
      .then(res => res.json())
      .then(data => {
        if (data.configured) {
          setConfig(data);
          setForm({
            appid: data.appid || '',
            appSecret: '',
            name: data.name || '默认公众号',
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/wechat/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: 'error', text: data.error });
      } else {
        setMessage({ type: 'success', text: '配置已保存' });
        setConfig({ ...config!, appid: form.appid, name: form.name, enabled: true, hasSecret: true });
        setForm({ ...form, appSecret: '' });
      }
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">系统设置</h1>
        <p className="text-muted-foreground">配置微信公众号接入参数</p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            接入状态
            {config ? (
              <Badge variant="default" className="bg-green-600">已配置</Badge>
            ) : (
              <Badge variant="secondary">未配置</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">公众号名称</span>
                <span className="font-medium">{config.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AppID</span>
                <span className="font-mono text-sm">{config.appid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AppSecret</span>
                <span className="font-mono text-sm">{'*'.repeat(20)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              尚未配置微信公众号，请填写下方信息完成接入。
            </p>
          )}
        </CardContent>
      </Card>

      {/* Config Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">公众号配置</CardTitle>
          <CardDescription>
            请在微信公众平台（mp.weixin.qq.com）获取以下信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">公众号名称</label>
            <Input
              placeholder="给你的公众号起个名字，方便识别"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">AppID</label>
            <Input
              placeholder="wx..."
              value={form.appid}
              onChange={(e) => setForm({ ...form, appid: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              开发 → 基本配置 → AppID
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">AppSecret</label>
            <Input
              type="password"
              placeholder={config?.hasSecret ? '留空则不修改' : '请输入AppSecret'}
              value={form.appSecret}
              onChange={(e) => setForm({ ...form, appSecret: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              开发 → 基本配置 → AppSecret（重置后获取）
            </p>
          </div>

          {message && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-md ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {message.text}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving || !form.appid}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </CardContent>
      </Card>

      {/* Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">接入指南</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-1">
            <p className="font-medium text-foreground">1. 登录微信公众平台</p>
            <p>访问 <a href="https://mp.weixin.qq.com" target="_blank" className="text-blue-600 underline" rel="noreferrer">mp.weixin.qq.com</a> 并使用公众号管理员账号登录</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">2. 获取开发者凭证</p>
            <p>进入 开发 → 基本配置，获取 AppID 和 AppSecret</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">3. 配置服务器地址</p>
            <p>在 开发 → 基本配置 → 服务器配置 中，设置服务器地址(URL)、Token 和 EncodingAESKey</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">4. 保存配置</p>
            <p>将 AppID 和 AppSecret 填入上方表单并保存，即可开始使用管理后台功能</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
