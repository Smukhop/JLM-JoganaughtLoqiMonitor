'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AGENT_LIST } from '@/lib/agents/registry';
import type { AgentId } from '@/lib/agents/types';
import { cn } from '@/lib/utils';
import Markdown from '@/components/ui/Markdown';
import { Empty } from '@/components/ui/Empty';

interface ChatMessage { id:string; role:'user'|'assistant'; content:string; agentId?:AgentId }
interface ThreadSummary { id:string; title:string; agentId:string }

export default function ChatStudio() {
  const [agentId,setAgentId]=useState<AgentId>('sol-quasar');
  const [threadId,setThreadId]=useState<string|null>(null);
  const [threads,setThreads]=useState<ThreadSummary[]>([]);
  const [messages,setMessages]=useState<ChatMessage[]>([]);
  const [input,setInput]=useState('');
  const [streaming,setStreaming]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const scrollRef=useRef<HTMLDivElement>(null);
  const abortRef=useRef<AbortController|null>(null);
  const agent=AGENT_LIST.find((a)=>a.id===agentId)!;

  useEffect(()=>{fetch('/api/threads').then((r)=>(r.ok?r.json():[])).then(setThreads).catch(()=>{});},[]);
  useEffect(()=>{scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:'smooth'});},[messages]);

  const loadThread=useCallback(async(id:string)=>{const res=await fetch(`/api/threads/${id}`);if(!res.ok)return;const thread=await res.json();setThreadId(thread.id);setAgentId(thread.agentId as AgentId);setMessages(thread.messages.filter((m:ChatMessage)=>m.role!=='system').map((m:ChatMessage)=>({id:m.id,role:m.role,content:m.content,agentId:m.agentId})));},[]);

  async function deleteThread(id:string,e:React.MouseEvent){e.stopPropagation();const res=await fetch(`/api/threads/${id}`,{method:'DELETE'});if(!res.ok)return;setThreads((prev)=>prev.filter((t)=>t.id!==id));if(threadId===id){setThreadId(null);setMessages([]);}}
  const newThread=()=>{abortRef.current?.abort();setThreadId(null);setMessages([]);setError(null);};

  async function send(){
    const text=input.trim(); if(!text||streaming)return;
    setInput('');setError(null);setStreaming(true);
    const userMsg:ChatMessage={id:crypto.randomUUID(),role:'user',content:text}; const assistantId=crypto.randomUUID();
    setMessages((prev)=>[...prev,userMsg,{id:assistantId,role:'assistant',content:'',agentId}]);
    const controller=new AbortController(); abortRef.current=controller;
    try{
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({threadId,agentId,message:text}),signal:controller.signal});
      if(!res.ok||!res.body)throw new Error(await res.text());
      const reader=res.body.getReader();const decoder=new TextDecoder();let buffer='';
      while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const frames=buffer.split('\n\n');buffer=frames.pop()??'';for(const frame of frames){const line=frame.split('\n').find((l)=>l.startsWith('data: '));if(!line)continue;const event=JSON.parse(line.slice(6));if(event.type==='meta'&&!threadId){setThreadId(event.threadId);setThreads((prev)=>[{id:event.threadId,title:text.slice(0,70),agentId},...prev]);}if(event.type==='delta')setMessages((prev)=>prev.map((m)=>m.id===assistantId?{...m,content:m.content+event.text}:m));if(event.type==='error')setError(event.message);}}
    }catch(err){if((err as Error).name!=='AbortError')setError(err instanceof Error?err.message:'Transmission failed');}
    finally{setStreaming(false);abortRef.current=null;}
  }

  return <div className="mx-auto grid h-[calc(100dvh-3.5rem)] max-w-[1600px] grid-cols-1 lg:grid-cols-[260px_1fr_240px]">
    <aside className="hidden flex-col border-r border-white/[.05] lg:flex"><div className="flex items-center justify-between border-b border-white/[.05] px-4 py-3"><p className="kicker">Transmissions</p><button onClick={newThread} className="font-mono text-[11px] text-quasar transition hover:text-quasar-glow">+ new</button></div><div className="flex-1 overflow-y-auto p-2">{threads.length===0&&<p className="px-2 py-4 text-xs leading-relaxed text-ash-dim">No transmissions yet. Pick a world and open a channel.</p>}{threads.map((t)=><div key={t.id} onClick={()=>void loadThread(t.id)} className={cn('group mb-1 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-[13px] transition',threadId===t.id?'bg-white/[.06] text-white':'text-ash hover:bg-white/[.03] hover:text-white')}><span className="min-w-0 flex-1 truncate">{t.title}</span><button onClick={(e)=>void deleteThread(t.id,e)} aria-label="Delete transmission" className="shrink-0 font-mono text-[11px] text-ash-dim opacity-0 transition group-hover:opacity-100 hover:text-quasar-hot">✕</button></div>)}</div></aside>
    <section className="flex min-w-0 flex-col"><div className="flex items-center gap-3 border-b border-white/[.05] px-6 py-3"><span className="h-2 w-2 rounded-full" style={{background:agent.accent,boxShadow:`0 0 14px ${agent.accent}`}}/><div className="min-w-0"><p className="truncate font-display text-[13px] text-white">{agent.world}</p><p className="font-mono text-[10px] uppercase tracking-[.2em] text-ash-dim">{agent.callsign} · {agent.role}</p></div>{streaming&&<span className="ml-auto font-mono text-[10px] uppercase tracking-[.2em] text-quasar animate-blink">▮ receiving</span>}</div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">{messages.length===0&&<Empty kicker={`${agent.callsign} standing by`} title={`Channel open to ${agent.world}`} body={agent.blurb}/>}<div className="mx-auto max-w-3xl space-y-7">{messages.map((m)=><article key={m.id} className={cn('flex gap-4',m.role==='user'&&'flex-row-reverse')}><span className="mt-1 h-6 w-6 shrink-0 rounded-full border" style={{borderColor:m.role==='user'?'#2c3450':agent.accent,background:m.role==='user'?'#111524':`${agent.accent}22`}}/><div className={cn('min-w-0 flex-1 rounded-lg px-5 py-4',m.role==='user'?'bg-plate/70':'bg-hull/60 shadow-rim')}><p className="kicker mb-2">{m.role==='user'?'You':AGENT_LIST.find((a)=>a.id===m.agentId)?.callsign??'AGENT'}</p>{m.role==='user'?<div className="prose-loqi whitespace-pre-wrap break-words">{m.content}</div>:m.content?<Markdown>{m.content}</Markdown>:streaming?<span className="animate-blink text-quasar">▮</span>:null}</div></article>)}</div>{error&&<div className="mx-auto mt-6 max-w-3xl rounded-md border border-quasar-hot/40 bg-quasar-hot/[.08] px-4 py-3 text-sm text-quasar-glow">{error}</div>}</div>
      <div className="border-t border-white/[.05] px-6 py-4"><div className="mx-auto flex max-w-3xl items-end gap-3"><textarea value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send();}}} rows={1} placeholder={`Transmit to ${agent.callsign}…`} className="field max-h-48 resize-none" disabled={streaming}/>{streaming?<button onClick={()=>abortRef.current?.abort()} className="btn-ghost h-[46px]">Stop</button>:<button onClick={()=>void send()} disabled={!input.trim()} className="btn-primary h-[46px]">Send</button>}</div><p className="mx-auto mt-2 max-w-3xl font-mono text-[10px] text-ash-dim">Enter to send · Shift+Enter for a newline</p></div>
    </section>
    <aside className="hidden flex-col border-l border-white/[.05] lg:flex"><div className="border-b border-white/[.05] px-4 py-3"><p className="kicker">Select world</p></div><div className="flex-1 overflow-y-auto p-2">{AGENT_LIST.map((a)=><button key={a.id} onClick={()=>setAgentId(a.id)} className={cn('mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition',agentId===a.id?'bg-white/[.06]':'hover:bg-white/[.03]')}><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{background:a.accent}}/><span className="min-w-0"><span className="block truncate text-[13px] text-white">{a.world}</span><span className="block font-mono text-[10px] uppercase tracking-[.18em] text-ash-dim">{a.callsign}</span></span></button>)}</div></aside>
  </div>;
}
