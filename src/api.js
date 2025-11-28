const API_BASE = 'http://localhost:8000';

/**
 * Processes a chemistry query with real-time streaming
 * @param {string} query - The user's chemistry query
 * @param {File} selectedFile - Optional image file
 * @param {Function} onAgentUpdate - Callback for agent progress updates
 * @returns {Promise} - Final result data
 */
export async function processQueryStream(query, selectedFile = null, onAgentUpdate = null) {
    const formData = new FormData();
    formData.append('query', query);
    if (selectedFile) {
        formData.append('file', selectedFile);
    }

    return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`${API_BASE}/api/stream?query=${encodeURIComponent(query)}`);

        // For POST with FormData, EventSource doesn't support it directly
        // We need to use fetch with streaming instead
        fetch(`${API_BASE}/api/stream`, {
            method: 'POST',
            body: formData,
        }).then(response => {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = '';

            function processText(text) {
                const lines = text.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));

                            if (data.type === 'start') {
                                console.log('Pipeline started:', data.message);
                            } else if (data.type === 'agent') {
                                if (onAgentUpdate) {
                                    onAgentUpdate({
                                        name: data.name,
                                        status: data.status,
                                        index: data.index
                                    });
                                }
                            } else if (data.type === 'result') {
                                resolve(data.data);
                            } else if (data.type === 'error') {
                                reject(new Error(data.message));
                            } else if (data.type === 'done') {
                                // Stream complete
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }

            function read() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        if (buffer) processText(buffer);
                        return;
                    }

                    buffer += decoder.decode(value, { stream: true });

                    // Process complete messages
                    const lastNewline = buffer.lastIndexOf('\n\n');
                    if (lastNewline !== -1) {
                        processText(buffer.substring(0, lastNewline));
                        buffer = buffer.substring(lastNewline + 2);
                    }

                    read();
                }).catch(reject);
            }

            read();
        }).catch(reject);
    });
}

/**
 * Original non-streaming API (fallback)
 */
export async function processQuery(query, selectedFile = null) {
    const formData = new FormData();
    formData.append('query', query);
    if (selectedFile) {
        formData.append('file', selectedFile);
    }

    const response = await fetch(`${API_BASE}/api/process`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
}
