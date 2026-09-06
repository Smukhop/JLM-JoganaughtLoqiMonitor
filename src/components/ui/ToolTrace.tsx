'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface ToolEvent { tool:string; input:unknown; isError:boolean; ms:number; preview:string }
const ICONS:Record<string,string>={kb_search:'⌕',kb_commit:'⛁',web_fetch:'↯',calculate:'∑',emit_artifact:'⎘'};
export function ToolTrace({events}:{events:ToolEvent[]}){const[open,setOpen]=useState<number|null>(null);if(!events.length)return null;return <div className="mt-3 space-y-1"><p className="kicker mb-2">Tool trace · {events.length} call{events.length===1?'':'s'}</p>{events.map((event,i)=><div key={i} className="rounded border border-seam bg-void/50"><button onClick={()=>setOpen(open===i?null:i)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left"><span className={cn('font-mono text-xs',event.isError?'text-quasar-hot':'text-plasma')}>{ICONS[event.tool]??'◈'}</span><span className="font-mono text-[11px] text-ash">{event.tool}</span><span className="ml-auto font-mono text-[10px] text-ash-dim">{event.ms}ms</span>{event.isError&&<span className="font-mono text-[9px] uppercase text-quasar-hot">error</span>}</button>{open===i&&<div className="border-t border-seam px-3 py-2.5"><p className="kicker mb-1">Input</p><pre className="mb-3 overflow-x-auto font-mono text-[11px] text-ash-dim">{JSON.stringify(event.input,null,2)}</pre><p className="kicker mb-1">Result</p><pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-ash">{event.preview}</pre></div>}</div>)}</div>}
