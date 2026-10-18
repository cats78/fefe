import { streamText } from "ai";

const MODEL = process.env.NAVO_MODEL || "openai/gpt-4.1-mini";
const SYSTEM = `You are NAVO 3.1, a capable general-purpose AI assistant. Answer the user's actual question directly and accurately. You can help with general knowledge, coding, study, writing, maths, reasoning, planning and explanations. Produce ONE coherent answer, not a list of multiple search-result summaries. Do not invent facts, sources, quotes, dates, or claim you searched unless search results are supplied. When the supplied web results are relevant, synthesize them into one answer and cite them with [1], [2], etc. If the results are weak or don't answer the question, say so honestly and answer only what you can support. Be concise by default, but provide detail when the question needs it. Never pretend certainty when uncertain.`;

function json(data, status=200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" } });
}
function decode(s) {
  return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
}
function unwrap(href) {
  try { const u=new URL(href, 'https://html.duckduckgo.com'); const target=u.searchParams.get('uddg'); return target ? decodeURIComponent(target) : u.href; } catch { return ''; }
}
async function searchWeb(query) {
  const url='https://html.duckduckgo.com/html/?q='+encodeURIComponent(query);
  const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; NAVO31/1.0)','Accept':'text/html'},signal:AbortSignal.timeout(2800)});
  if(!res.ok) return [];
  const html=await res.text();
  const results=[];
  const re=/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for(const m of html.matchAll(re)) {
    const href=unwrap(m[1]); const title=decode(m[2]);
    if(!/^https?:\/\//i.test(href) || !title || /duckduckgo\.com/i.test(new URL(href).hostname)) continue;
    const pos=m.index||0; const tail=html.slice(pos,Math.min(html.length,pos+2400));
    const sm=tail.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/[^>]+>/i);
    const snippet=sm ? decode(sm[1]) : '';
    if(!results.some(x=>x.url===href)) results.push({title,url:href,snippet});
    if(results.length>=5) break;
  }
  return results;
}
function needsSearch(q) {
  return /\b(latest|current|currently|today|yesterday|this week|this month|news|breaking|recent|right now|as of 202[5-9]|price today|weather|score today|search the web|look up|find sources|with sources|who won|election results|new update)\b/i.test(q) || /\b(search|web search|look online)\b/i.test(q);
}
export async function GET() { return json({ok:true,name:'NAVO 3.1',endpoint:'/api/chat',model:MODEL,auth:'Vercel AI Gateway deployment identity'}); }
export async function POST(request) {
  let body;
  try { body=await request.json(); } catch { return json({error:'Please send a valid chat message.'},400); }
  const messages=Array.isArray(body.messages)?body.messages:[];
  const safe=messages.slice(-12).map(m=>({role:m?.role==='assistant'?'assistant':'user',content:typeof m?.content==='string'?m.content.slice(0,3500):''})).filter(m=>m.content);
  const last=[...safe].reverse().find(m=>m.role==='user');
  if(!last) return json({error:'Please type a question first.'},400);
  let webResults=[]; let searchNotice='';
  if(needsSearch(last.content)) {
    try { webResults=await searchWeb(last.content); } catch { searchNotice='Web search could not be reached for this request.'; }
    if(!webResults.length && !searchNotice) searchNotice='No usable web results were found for this query.';
  }
  let prompt=last.content;
  if(needsSearch(last.content)) {
    prompt += '\n\nWEB SEARCH STATUS: '+(webResults.length?'Search results retrieved.':'No usable search results retrieved. '+searchNotice)+'\n';
    if(webResults.length) prompt += 'Use only the following as retrieved web evidence. Do not invent sources.\n'+webResults.map((r,i)=>`[${i+1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`).join('\n\n');
    prompt += '\nIf no usable results were retrieved, clearly state that live search could not verify the current information. Do not pretend to have searched successfully.';
  }
  const conversation=safe.slice(0,-1).map(m=>({role:m.role,content:m.content}));
  conversation.push({role:'user',content:prompt});
  try {
    const result=streamText({
      model: MODEL,
      system: SYSTEM,
      messages: conversation,
      temperature: 0.4,
      maxOutputTokens: 1200,
      abortSignal: AbortSignal.timeout(25000)
    });
    const textStream=result.textStream;
    const encoder=new TextEncoder();
    const stream=new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of textStream) controller.enqueue(encoder.encode(chunk));
          if(webResults.length) {
            const sourceText='\n\nSources checked:\n'+webResults.slice(0,4).map((r,i)=>`[${i+1}] ${r.title} — ${r.url}`).join('\n');
            controller.enqueue(encoder.encode(sourceText));
          } else if(needsSearch(last.content)) {
            controller.enqueue(encoder.encode('\n\nNote: I could not verify this with live web results in this request.'));
          }
          controller.close();
        } catch(error) {
          controller.enqueue(encoder.encode('\n\n[The response was interrupted. Please try again.]'));
          controller.close();
        }
      }
    });
    return new Response(stream,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-cache, no-transform','X-Content-Type-Options':'nosniff'}});
  } catch(error) {
    return json({error:'NAVO 3.1 could not start the AI response. Check Vercel AI Gateway access and deployment logs. No demo answer was substituted.'},503);
  }
}
