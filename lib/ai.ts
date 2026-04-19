import 'server-only';
import { getAiConfig } from '@/lib/db';
import type { SelectAiConfig } from '@/lib/db';

// ==================== Coze API ====================

export async function cozeChat(query: string, userId: string, config: SelectAiConfig): Promise<string> {
  const apiBase = config.cozeApiBase || 'https://api.coze.cn';
  const url = `${apiBase}/v3/chat`;

  const body: Record<string, unknown> = {
    bot_id: config.cozeBotId,
    user_id: userId,
    stream: false,
    auto_save_history: true,
    additional_messages: [
      {
        role: 'user',
        content: query,
        content_type: 'text',
      },
    ],
  };

  if (config.systemPrompt) {
    (body as Record<string, unknown>).meta_data = {
      user_info: config.systemPrompt,
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.cozeApiToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.code !== 0) {
    throw new Error(`Coze API error [${data.code}]: ${data.msg}`);
  }

  // Parse response: non-streaming mode returns data in messages array
  if (data.messages && data.messages.length > 0) {
    // Find the last assistant message
    const assistantMsg = [...data.messages].reverse().find(
      (msg: { role: string }) => msg.role === 'assistant'
    );
    if (assistantMsg) {
      return assistantMsg.content || config.fallbackReply || '';
    }
  }

  return config.fallbackReply || '抱歉，我暂时无法回答您的问题。';
}

// ==================== Direct LLM (OpenAI compatible) ====================

const LLM_BASE_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
};

export async function directLlmChat(query: string, config: SelectAiConfig): Promise<string> {
  const provider = config.llmProvider || 'deepseek';
  const baseUrl = config.llmBaseUrl || LLM_BASE_URLS[provider] || LLM_BASE_URLS.deepseek;
  const model = config.llmModel || (provider === 'deepseek' ? 'deepseek-chat' : provider === 'qwen' ? 'qwen-turbo' : 'gpt-3.5-turbo');

  const messages: Array<{ role: string; content: string }> = [];

  if (config.systemPrompt) {
    messages.push({ role: 'system', content: config.systemPrompt });
  }

  messages.push({ role: 'user', content: query });

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.llmApiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`LLM API error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message?.content || config.fallbackReply || '';
  }

  return config.fallbackReply || '抱歉，我暂时无法回答您的问题。';
}

// ==================== Unified Entry ====================

export async function aiReply(query: string, userId: string, configId?: number): Promise<string | null> {
  try {
    const config = await getAiConfig(configId);
    if (!config || !config.enabled) {
      return null;
    }

    const provider = config.provider || 'coze';

    if (provider === 'coze' && config.cozeBotId && config.cozeApiToken) {
      return cozeChat(query, userId, config);
    }

    if (provider === 'dify' && config.llmBaseUrl && config.llmApiKey) {
      // Dify uses OpenAI-compatible format
      return directLlmChat(query, { ...config, llmProvider: 'dify' });
    }

    if (provider === 'direct' && config.llmApiKey) {
      return directLlmChat(query, config);
    }

    // Fallback: try direct LLM if configured
    if (config.llmApiKey) {
      return directLlmChat(query, config);
    }

    return null;
  } catch (error) {
    console.error('AI reply failed:', error);
    return null;
  }
}
