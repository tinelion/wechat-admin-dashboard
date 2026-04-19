'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bot, Send, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { useAccount } from '../account-context';

type ProviderType = 'coze' | 'direct';

interface AiConfig {
  enabled: boolean;
  provider: ProviderType;
  cozeBotId: string;
  cozeApiToken: string;
  cozeApiUrl: string;
  modelProvider: string;
  apiKey: string;
  modelName: string;
  apiUrl: string;
  systemPrompt: string;
  fallbackReply: string;
}

const DEFAULT_CONFIG: AiConfig = {
  enabled: false,
  provider: 'coze',
  cozeBotId: '',
  cozeApiToken: '',
  cozeApiUrl: 'https://api.coze.cn',
  modelProvider: 'deepseek',
  apiKey: '',
  modelName: 'deepseek-chat',
  apiUrl: 'https://api.deepseek.com/v1',
  systemPrompt: '',
  fallbackReply: '抱歉，我暂时无法回答您的问题',
};

const MODEL_PROVIDERS = [
  { value: 'deepseek', label: 'DeepSeek', defaultModel: 'deepseek-chat', defaultUrl: 'https://api.deepseek.com/v1' },
  { value: 'tongyi', label: '通义千问', defaultModel: 'qwen-turbo', defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini', defaultUrl: 'https://api.openai.com/v1' },
];

export default function AiCustomerServicePage() {
  const { currentAccountId } = useAccount();
  const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Test area
  const [testInput, setTestInput] = useState('');
  const [testReply, setTestReply] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');

  useEffect(() => {
    if (!currentAccountId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/ai-config?configId=${currentAccountId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.provider) {
          setConfig({ ...DEFAULT_CONFIG, ...data });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentAccountId]);

  async function handleSave() {
    if (!currentAccountId) return;
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId: currentAccountId, ...config }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMessage('保存成功');
      } else {
        setSaveMessage(data.error || '保存失败');
      }
    } catch {
      setSaveMessage('网络错误，请重试');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testInput.trim() || !currentAccountId) return;
    setTestLoading(true);
    setTestReply('');
    setTestError('');
    try {
      const res = await fetch('/api/ai-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testInput, configId: currentAccountId }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestReply(data.reply);
      } else {
        setTestError(data.error || '测试失败');
      }
    } catch {
      setTestError('网络错误，请重试');
    } finally {
      setTestLoading(false);
    }
  }

  function updateConfig(partial: Partial<AiConfig>) {
    setConfig(prev => ({ ...prev, ...partial }));
  }

  function handleModelProviderChange(value: string) {
    const provider = MODEL_PROVIDERS.find(p => p.value === value);
    if (provider) {
      updateConfig({
        modelProvider: value,
        modelName: provider.defaultModel,
        apiUrl: provider.defaultUrl,
      });
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
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-6 w-6" />
          AI 智能客服
        </h1>
        <p className="text-muted-foreground">配置 AI 自动回复，为粉丝提供智能客服体验</p>
      </div>

      {/* Enable/Disable Switch */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">启用状态</CardTitle>
          <CardDescription>开启后，粉丝发送的消息将由 AI 自动回复</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="ai-enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => updateConfig({ enabled: checked })}
            />
            <Label htmlFor="ai-enabled" className="cursor-pointer">
              {config.enabled ? '已启用' : '已禁用'}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>AI 配置</CardTitle>
          <CardDescription>选择 AI 提供商并填写相关配置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">AI 提供商</Label>
            <div className="grid gap-3">
              <label
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  config.provider === 'coze'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="coze"
                  checked={config.provider === 'coze'}
                  onChange={() => updateConfig({ provider: 'coze' })}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Coze</span>
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">推荐</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">免费知识库 + 工作流，适合复杂场景</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  config.provider === 'direct'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="direct"
                  checked={config.provider === 'direct'}
                  onChange={() => updateConfig({ provider: 'direct' })}
                />
                <div className="flex-1">
                  <span className="font-medium">直连大模型</span>
                  <p className="text-sm text-muted-foreground mt-0.5">DeepSeek / 通义千问 / OpenAI</p>
                </div>
              </label>
            </div>
          </div>

          {/* Coze Configuration */}
          {config.provider === 'coze' && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm">Coze 配置</h4>
              <div className="space-y-2">
                <Label htmlFor="cozeBotId">Bot ID</Label>
                <Input
                  id="cozeBotId"
                  placeholder="请输入 Coze Bot ID"
                  value={config.cozeBotId}
                  onChange={(e) => updateConfig({ cozeBotId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cozeApiToken">API Token</Label>
                <Input
                  id="cozeApiToken"
                  type="password"
                  placeholder="请输入 API Token"
                  value={config.cozeApiToken}
                  onChange={(e) => updateConfig({ cozeApiToken: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cozeApiUrl">API 地址</Label>
                <Input
                  id="cozeApiUrl"
                  placeholder="https://api.coze.cn"
                  value={config.cozeApiUrl}
                  onChange={(e) => updateConfig({ cozeApiUrl: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Direct Model Configuration */}
          {config.provider === 'direct' && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm">直连大模型配置</h4>
              <div className="space-y-2">
                <Label>模型提供商</Label>
                <Select value={config.modelProvider} onValueChange={handleModelProviderChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型提供商" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_PROVIDERS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="请输入 API Key"
                  value={config.apiKey}
                  onChange={(e) => updateConfig({ apiKey: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelName">模型名称</Label>
                <Input
                  id="modelName"
                  placeholder="如 deepseek-chat"
                  value={config.modelName}
                  onChange={(e) => updateConfig({ modelName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiUrl">API 地址</Label>
                <Input
                  id="apiUrl"
                  placeholder="如 https://api.deepseek.com/v1"
                  value={config.apiUrl}
                  onChange={(e) => updateConfig({ apiUrl: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Common Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">通用配置</h4>
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">系统提示词</Label>
              <Textarea
                id="systemPrompt"
                placeholder="请输入系统提示词，用于定义 AI 的角色和行为..."
                value={config.systemPrompt}
                onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                定义 AI 客服的角色、语气和回答范围
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fallbackReply">兜底回复</Label>
              <Input
                id="fallbackReply"
                placeholder="抱歉，我暂时无法回答您的问题"
                value={config.fallbackReply}
                onChange={(e) => updateConfig({ fallbackReply: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                当 AI 无法回答时使用的默认回复
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存配置
            </Button>
            {saveMessage && (
              <span className={`text-sm flex items-center gap-1 ${
                saveMessage.includes('成功') ? 'text-green-600' : 'text-destructive'
              }`}>
                {saveMessage.includes('成功') && <CheckCircle2 className="h-4 w-4" />}
                {saveMessage}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Area */}
      <Card>
        <CardHeader>
          <CardTitle>测试对话</CardTitle>
          <CardDescription>发送测试消息，验证 AI 客服是否正常工作</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="输入测试消息..."
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTest();
                }
              }}
            />
            <Button onClick={handleTest} disabled={testLoading || !testInput.trim()}>
              {testLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              发送
            </Button>
          </div>

          {testError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {testError}
            </div>
          )}

          {testReply && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI 回复</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{testReply}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Coze 接入说明
          </CardTitle>
          <CardDescription>如何配置 Coze 作为 AI 客服后端</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>
                访问{' '}
                <a
                  href="https://www.coze.cn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  coze.cn
                </a>{' '}
                注册账号并登录
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>创建 Bot，配置知识库和工作流</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>在 Bot 设置中获取 API 权限</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span>复制 Bot ID 和 API Token 填入上方配置</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                5
              </span>
              <span>开启启用开关即可</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
