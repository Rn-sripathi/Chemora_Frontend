export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Processes a chemistry query with real-time streaming.
 */
export async function processQueryStream(query, selectedFile = null, onAgentUpdate = null) {
  const formData = new FormData();
  formData.append('query', query);
  if (selectedFile) formData.append('file', selectedFile);

  return new Promise((resolve, reject) => {
    fetch(`${API_BASE}/api/stream`, {
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          reject(new Error(`Streaming request failed with status ${response.status}`));
          return;
        }
        if (!response.body) {
          reject(new Error('Streaming response body is empty.'));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processBlock = (text) => {
          const lines = text.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'agent' && onAgentUpdate) {
                onAgentUpdate({ name: data.name, status: data.status, index: data.index });
              } else if (data.type === 'result') {
                resolve(data.data);
              } else if (data.type === 'error') {
                reject(new Error(data.message));
              }
            } catch (error) {
              console.error('SSE parse error:', error);
            }
          }
        };

        const read = () => {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                if (buffer) processBlock(buffer);
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const splitIndex = buffer.lastIndexOf('\n\n');
              if (splitIndex !== -1) {
                processBlock(buffer.slice(0, splitIndex));
                buffer = buffer.slice(splitIndex + 2);
              }
              read();
            })
            .catch(reject);
        };

        read();
      })
      .catch(reject);
  });
}

/**
 * Non-streaming fallback endpoint.
 */
export async function processQuery(query, selectedFile = null) {
  const formData = new FormData();
  formData.append('query', query);
  if (selectedFile) formData.append('file', selectedFile);

  const response = await fetch(`${API_BASE}/api/process`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
