'use strict';

const config = require('../config');

const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOTAL_CHARS = 20000;

function normalizeMessages(value) {
  if (!Array.isArray(value)) return [];
  const result = [];
  let total = 0;
  for (const item of value.slice(-MAX_MESSAGES)) {
    if (!item || !['user', 'assistant'].includes(item.role)) continue;
    const content = String(item.content || '').trim().slice(0, MAX_MESSAGE_CHARS);
    if (!content) continue;
    total += content.length;
    if (total > MAX_TOTAL_CHARS) break;
    result.push({ role: item.role, content });
  }
  return result;
}

async function chat(req, res) {
  const llm = config.llm;
  if (!llm.apiKey || !llm.baseUrl || !llm.model) {
    return res.status(503).json({ error: '服务器尚未配置 AI 服务，请联系管理员' });
  }

  const messages = normalizeMessages(req.body && req.body.messages);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: '请输入要咨询的问题' });
  }

  const context = String((req.body && req.body.context) || '').trim().slice(0, 1200);
  const systemPrompt = [
    '你是中原工学院互动教学平台的 AI 辅导老师。',
    '请使用简体中文，回答准确、清晰、循序渐进；公式使用 LaTeX。',
    '不要声称已经执行未实际执行的代码，也不要索取密码、验证码或 API 密钥。',
    context ? '学生当前学习上下文：' + context : ''
  ].filter(Boolean).join('\n');

  let url = String(llm.baseUrl).trim().replace(/\/+$/, '');
  if (!/\/chat\/completions$/i.test(url)) url += '/chat/completions';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + llm.apiKey
      },
      body: JSON.stringify({
        model: llm.model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 1200,
        stream: false
      })
    });

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch (e) { data = null; }
    if (!response.ok) {
      console.error('[ai] provider error:', response.status, raw.slice(0, 500));
      return res.status(502).json({ error: 'AI 服务暂时不可用，请稍后重试' });
    }
    const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) return res.status(502).json({ error: 'AI 服务返回了无效结果' });
    return res.json({ reply: String(reply), usage: data.usage || null, model: llm.model });
  } catch (e) {
    if (e && e.name === 'AbortError') return res.status(504).json({ error: 'AI 响应超时，请稍后重试' });
    console.error('[ai] request error:', e);
    return res.status(502).json({ error: 'AI 服务连接失败，请稍后重试' });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { chat };
