'use client';

import { memo, useMemo, useState } from 'react';

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; level: 1 | 2 | 3 | 4; text: string }
  | { kind: 'code'; lang: string; code: string; open: boolean }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[]; start: number }
  | { kind: 'quote'; text: string }
  | { kind: 'hr' }
  | { kind: 'table'; head: string[]; rows: string[][] };

function splitRow(line: string): string[] { return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim()); }

function parse(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n'); const blocks: Block[] = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i]; const fence = line.match(/^```+\s*([\w+-]*)\s*$/);
    if (fence) { const lang=fence[1]||'text'; const body:string[]=[]; i++; let closed=false; while(i<lines.length){if(/^```+\s*$/.test(lines[i])){closed=true;i++;break;}body.push(lines[i]);i++;} blocks.push({kind:'code',lang,code:body.join('\n'),open:!closed}); continue; }
    if (!line.trim()) { i++; continue; }
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) { blocks.push({kind:'hr'}); i++; continue; }
    const heading=line.match(/^(#{1,4})\s+(.*)$/); if(heading){blocks.push({kind:'h',level:heading[1].length as 1|2|3|4,text:heading[2]});i++;continue;}
    if(line.includes('|')&&/^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i+1]??'')){const head=splitRow(line);i+=2;const rows:string[][]=[];while(i<lines.length&&lines[i].includes('|')&&lines[i].trim()){rows.push(splitRow(lines[i]));i++;}blocks.push({kind:'table',head,rows});continue;}
    if(/^\s*>\s?/.test(line)){const body:string[]=[];while(i<lines.length&&/^\s*>\s?/.test(lines[i])){body.push(lines[i].replace(/^\s*>\s?/,''));i++;}blocks.push({kind:'quote',text:body.join(' ')});continue;}
    if(/^\s*[-*+]\s+/.test(line)){const items:string[]=[];while(i<lines.length&&/^\s*[-*+]\s+/.test(lines[i])){items.push(lines[i].replace(/^\s*[-*+]\s+/,''));i++;while(i<lines.length&&/^\s{2,}\S/.test(lines[i])&&!/^\s*[-*+]\s+/.test(lines[i])){items[items.length-1]+=' '+lines[i].trim();i++;}}blocks.push({kind:'ul',items});continue;}
    const ordered=line.match(/^\s*(\d+)[.)]\s+/); if(ordered){const start=Number(ordered[1]);const items:string[]=[];while(i<lines.length&&/^\s*\d+[.)]\s+/.test(lines[i])){items.push(lines[i].replace(/^\s*\d+[.)]\s+/,''));i++;while(i<lines.length&&/^\s{2,}\S/.test(lines[i])&&!/^\s*\d+[.)]\s+/.test(lines[i])){items[items.length-1]+=' '+lines[i].trim();i++;}}blocks.push({kind:'ol',items,start});continue;}
    const para:string[]=[];while(i<lines.length&&lines[i].trim()&&!/^(#{1,4}\s|```|\s*[-*+]\s|\s*\d+[.)]\s|\s*>\s?)/.test(lines[i])&&!/^\s*(---+|\*\*\*+)\s*$/.test(lines[i])){para.push(lines[i]);i++;}if(para.length)blocks.push({kind:'p',text:para.join(' ')});else i++;
  }
  return blocks;
}

function inline(text:string,keyPrefix:string):React.ReactNode[]{const out:React.ReactNode[]=[];const pattern=/(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(~~[^~\n]+~~)|(\[[^\]\n]+\]\([^)\s]+\))/g;let last=0;let match:RegExpExecArray|null;let n=0;while((match=pattern.exec(text))!==null){if(match.index>last)out.push(text.slice(last,match.index));const token=match[0];const key=`${keyPrefix}-i${n++}`;if(token.startsWith('`'))out.push(<code key={key}>{token.slice(1,-1)}</code>);else if(token.startsWith('**')||token.startsWith('__'))out.push(<strong key={key}>{token.slice(2,-2)}</strong>);else if(token.startsWith('~~'))out.push(<span key={key} className="line-through opacity-60">{token.slice(2,-2)}</span>);else if(token.startsWith('[')){const link=token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);if(link){const safe=/^(https?:|mailto:|\/|#)/i.test(link[2])?link[2]:'#';out.push(<a key={key} href={safe} target="_blank" rel="noopener noreferrer nofollow">{link[1]}</a>);}else out.push(token);}else out.push(<em key={key}>{token.slice(1,-1)}</em>);last=match.index+token.length;}if(last<text.length)out.push(text.slice(last));return out;}

function CodeBlock({lang,code,open}:{lang:string;code:string;open:boolean}){const[copied,setCopied]=useState(false);return <div className="group relative my-3"><div className="flex items-center justify-between rounded-t-md border border-b-0 border-seam bg-plate/80 px-3 py-1.5"><span className="font-mono text-[10px] uppercase tracking-[.18em] text-ash-dim">{lang}{open&&<span className="ml-2 text-quasar">▮ streaming</span>}</span><button onClick={()=>{void navigator.clipboard.writeText(code).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1600);});}} className="font-mono text-[10px] uppercase tracking-[.14em] text-ash-dim transition hover:text-quasar">{copied?'copied':'copy'}</button></div><pre className="!mt-0 !rounded-t-none"><code>{code}</code></pre></div>}

function Markdown({children,className}:{children:string;className?:string}){const blocks=useMemo(()=>parse(children??''),[children]);return <div className={className??'prose-loqi'}>{blocks.map((block,bi)=>{const key=`b${bi}`;switch(block.kind){case'h':{const Tag=(['h1','h2','h3','h4'] as const)[block.level-1];return <Tag key={key}>{inline(block.text,key)}</Tag>;}case'code':return <CodeBlock key={key} lang={block.lang} code={block.code} open={block.open}/>;case'ul':return <ul key={key}>{block.items.map((item,ii)=><li key={`${key}-${ii}`}>{inline(item,`${key}-${ii}`)}</li>)}</ul>;case'ol':return <ol key={key} start={block.start}>{block.items.map((item,ii)=><li key={`${key}-${ii}`}>{inline(item,`${key}-${ii}`)}</li>)}</ol>;case'quote':return <blockquote key={key} className="my-3 border-l-2 border-quasar/50 pl-4 text-ash-dim">{inline(block.text,key)}</blockquote>;case'hr':return <hr key={key} className="my-5 border-seam"/>;case'table':return <div key={key} className="my-4 overflow-x-auto"><table className="w-full border-collapse text-left text-[13px]"><thead><tr className="border-b border-seam">{block.head.map((cell,ci)=><th key={ci} className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-ash-dim">{inline(cell,`${key}-h${ci}`)}</th>)}</tr></thead><tbody>{block.rows.map((row,ri)=><tr key={ri} className="border-b border-seam/50">{row.map((cell,ci)=><td key={ci} className="px-3 py-2 align-top">{inline(cell,`${key}-${ri}-${ci}`)}</td>)}</tr>)}</tbody></table></div>;default:return <p key={key}>{inline(block.text,key)}</p>;}})}</div>}

export default memo(Markdown);
export { parse as parseMarkdown };
