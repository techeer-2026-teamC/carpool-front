// UTF-8 and line endings can be split at any network chunk boundary.
export function createSseParser(onEvent, maxFrameSize = 65536) {
  const decoder = new TextDecoder()
  let line = '', data = [], type = '', id = '', skipLf = false, size = 0
  function endLine() {
    if (!line) {
      if (data.length) onEvent({ type: type || 'message', id, data: data.join('\n') })
      data = []; type = ''; size = 0
    } else if (!line.startsWith(':')) {
      const colon = line.indexOf(':')
      const field = colon < 0 ? line : line.slice(0, colon)
      let value = colon < 0 ? '' : line.slice(colon + 1)
      if (value.startsWith(' ')) value = value.slice(1)
      if (field === 'data') data.push(value)
      if (field === 'event') type = value
      if (field === 'id' && !value.includes('\0')) id = value
    }
    line = ''
  }
  return chunk => {
    for (const char of decoder.decode(chunk, { stream: true })) {
      if (skipLf) { skipLf = false; if (char === '\n') continue }
      if (++size > maxFrameSize) throw new Error('알림 메시지가 너무 큽니다.')
      if (char === '\r' || char === '\n') { endLine(); skipLf = char === '\r' }
      else line += char
    }
  }
}

export async function consumeSse(response, onEvent, signal) {
  if (!response.body || !response.headers.get('content-type')?.startsWith('text/event-stream')) {
    await response.body?.cancel()
    throw new Error('실시간 알림에 연결하지 못했습니다.')
  }
  const reader = response.body.getReader()
  const cancel = () => { void reader.cancel().catch(() => {}) }
  const parse = createSseParser(event => { if (!signal.aborted) onEvent(event) })
  signal.addEventListener('abort', cancel, { once: true })
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read()
      if (done) break
      parse(value)
    }
  } finally {
    signal.removeEventListener('abort', cancel)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
