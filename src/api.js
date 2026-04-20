export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const STREAM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const buildFormData = (query, selectedFile = null) => {
  const formData = new FormData();
  formData.append('query', query);
  if (selectedFile) formData.append('file', selectedFile);
  return formData;
};

/**
 * Normalize /api/process response shape to match /api/stream result shape
 * so the rest of the app only ever deals with one consistent schema.
 */
const normalizeProcessResponse = (data) => ({
  intent: data.intent || {},
  canonical_data: data.canonical_data || data.molecule_info || {},
  literature_results: data.literature_results || data.literature || [],
  reaction_results: data.reaction_results || data.reactions || [],
  routes: data.routes || [],
  protocol: data.protocol || null,
  orchestration: data.orchestration || {},
  shared_context: data.shared_context || {},
  agent_conversation: data.agent_conversation || [],
  visited_agents: data.visited_agents || [],
  a2a_messages: data.a2a_messages || [],
  error: data.error || null,
});

const parseStreamEvent = (block, onAgentUpdate, onA2AMessage) => {
  const payloadLines = block
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.replace(/^data:\s?/, '').trim())
    .filter(Boolean);

  if (payloadLines.length === 0) return null;

  const payload = payloadLines.join('\n');
  if (payload === '[DONE]') return null;

  let data;
  try {
    data = JSON.parse(payload);
  } catch (error) {
    console.warn('Skipping unparsable SSE payload:', payload, error);
    return null;
  }

  if (data.type === 'agent' && onAgentUpdate) {
    onAgentUpdate({ name: data.name, status: data.status, index: data.index });
    return null;
  }

  if (data.type === 'a2a' && onA2AMessage) {
    onA2AMessage(data.message);
    return null;
  }

  if (data.type === 'result') {
    return { kind: 'result', data: normalizeProcessResponse(data.data) };
  }

  if (data.type === 'error') {
    return { kind: 'error', message: data.message || 'Streaming pipeline failed.' };
  }

  return null;
};

async function runStreamingQuery(query, selectedFile, onAgentUpdate, onA2AMessage, signal) {
  const response = await fetch(`${API_BASE}/api/stream`, {
    method: 'POST',
    body: buildFormData(query, selectedFile),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Streaming request failed with status ${response.status}`);
  }
  if (!response.body) {
    throw new Error('Streaming response body is empty.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        const event = parseStreamEvent(block, onAgentUpdate, onA2AMessage);
        if (!event) continue;
        if (event.kind === 'error') throw new Error(event.message);
        if (event.kind === 'result') finalResult = event.data;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (buffer.trim()) {
    const event = parseStreamEvent(buffer, onAgentUpdate, onA2AMessage);
    if (event?.kind === 'error') throw new Error(event.message);
    if (event?.kind === 'result') finalResult = event.data;
  }

  if (finalResult !== null) return finalResult;
  throw new Error('Streaming completed without returning a final result.');
}

/**
 * Processes a chemistry query with real-time streaming.
 * Returns a controller so the caller can abort: controller.abort()
 */
export function processQueryStream(query, selectedFile = null, onAgentUpdate = null, onA2AMessage = null) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  const promise = (async () => {
    try {
      return await runStreamingQuery(query, selectedFile, onAgentUpdate, onA2AMessage, controller.signal);
    } catch (streamError) {
      if (streamError.name === 'AbortError') {
        throw new Error('Request timed out after 5 minutes. Please try a simpler query.');
      }
      console.warn('Streaming unavailable, falling back to standard endpoint:', streamError.message);
      try {
        const data = await processQuery(query, selectedFile, controller.signal);
        return normalizeProcessResponse(data);
      } catch (fallbackError) {
        const streamMessage = streamError instanceof Error ? streamError.message : String(streamError);
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(`${streamMessage} | Fallback also failed: ${fallbackMessage}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  promise.abort = () => controller.abort();
  return promise;
}

/**
 * Non-streaming fallback endpoint.
 */
export async function processQuery(query, selectedFile = null, signal = undefined) {
  const response = await fetch(`${API_BASE}/api/process`, {
    method: 'POST',
    body: buildFormData(query, selectedFile),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Delete a backend chat session to free server memory.
 */
export async function deleteChatSession(sessionId) {
  if (!sessionId) return;
  try {
    await fetch(`${API_BASE}/api/chat/session/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
  } catch {
    // Non-critical — session will expire on server naturally
  }
}
