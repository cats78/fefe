(() => {
  const panel = document.getElementById('chat-panel'), launcher = document.getElementById('chat-launcher'), closeButton = document.getElementById('close-chat'), inlineOpen = document.getElementById('open-inline'), form = document.getElementById('chat-form'), input = document.getElementById('chat-input'), sendButton = document.getElementById('send-button'), messages = document.getElementById('messages'), suggestions = document.getElementById('suggestions');
  const history = [];
  function openChat() { panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); launcher.setAttribute('aria-expanded', 'true'); setTimeout(() => input.focus(), 50); }
  function closeChat() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); launcher.setAttribute('aria-expanded', 'false'); }
  launcher.addEventListener('click', () => panel.classList.contains('open') ? closeChat() : openChat()); inlineOpen.addEventListener('click', openChat); closeButton.addEventListener('click', closeChat);
  function addMessage(role, text, extraClass = '') { const row = document.createElement('div'); row.className = 'message ' + role + (extraClass ? ' ' + extraClass : ''); const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = text; row.appendChild(bubble); messages.appendChild(row); messages.scrollTop = messages.scrollHeight; return row; }
  function addSourceLinks(row, text) {
    const urls = [...text.matchAll(/https?:\/\/[^\s)\]]+/g)].map(m => m[0].replace(/[.,;]+$/, ''));
    [...new Set(urls)].slice(0, 5).forEach(url => { try { const a=document.createElement('a'); a.className='inline-source'; a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent='Open source: '+new URL(url).hostname; row.appendChild(a); } catch {} });
  }
  function autoGrow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 100) + 'px'; }
  input.addEventListener('input', autoGrow); input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
  suggestions.addEventListener('click', event => { const button = event.target.closest('button'); if (!button) return; input.value = button.textContent === 'Help me write' ? 'Write a professional email asking for an update.' : 'Explain photosynthesis in simple words.'; suggestions.hidden = true; form.requestSubmit(); });
  form.addEventListener('submit', async event => {
    event.preventDefault(); const text = input.value.trim(); if (!text || sendButton.disabled) return;
    addMessage('user', text); history.push({role:'user', content:text}); input.value=''; autoGrow(); suggestions.hidden=true; sendButton.disabled=true;
    const row=addMessage('assistant','Connecting to NAVO 3.1…','typing');
    try {
      const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history.slice(-12)})});
      if (!response.ok) { const data=await response.json().catch(()=>({})); throw new Error(data.error || `Chat service error (${response.status}).`); }
      if (!response.body) throw new Error('Streaming is not supported by this browser. Please try again.');
      const reader=response.body.getReader(), decoder=new TextDecoder(); let answer='', first=true;
      while(true){const {value,done}=await reader.read(); if(done) break; const chunk=decoder.decode(value,{stream:true}); if(first){row.querySelector('.bubble').textContent='';row.classList.remove('typing');first=false;} answer+=chunk; row.querySelector('.bubble').textContent=answer; messages.scrollTop=messages.scrollHeight;}
      answer+=decoder.decode(); row.querySelector('.bubble').textContent=answer || 'NAVO 3.1 returned an empty answer. Please try again.'; addSourceLinks(row,answer); history.push({role:'assistant',content:answer});
    } catch(error) { row.classList.remove('typing'); row.querySelector('.bubble').textContent=error?.message || 'NAVO 3.1 could not connect. Please try again.'; }
    finally { sendButton.disabled=false; input.focus(); }
  });
})();
