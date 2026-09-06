'use client';

import { useRef, useState } from 'react';
import { AGENT_LIST, AGENTS } from '@/lib/agents/registry';
import type { AgentId, ArmyEvent, MissionPlan, TaskStatus } from '@/lib/agents/types';
import { cn } from '@/lib/utils';
import Markdown from '@/components/ui/Markdown';
import { StatusPill } from '@/components/ui/StatusPill';
import { ToolTrace, type ToolEvent } from '@/components/ui/ToolTrace';

interface LiveTask {
  key: string;
  agentId: AgentId;
  title: string;
  status: TaskStatus;
  output: string;
  error?: string;
  ms?: number;
  tools: string[];
  toolEvents: ToolEvent[];
  tokensIn?: number;
  tokensOut?: number;
}

interface MissionUsage {
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
}

const PRESETS = [
  'Audit our FEED report structure against AACE Class 3 requirements and list every gap.',
  'Design the data model and API surface for a multi-tenant analytics dashboard.',
  'Research the current state of WebGPU adoption and recommend whether we migrate.'
];

export default function WarRoom() {
  const [objective, setObjective] = useState('');
  const [plan, setPlan] = useState<MissionPlan | null>(null);
  const [tasks, setTasks] = useState<Record<string, LiveTask>>({});
  const [report, setReport] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [usage, setUsage] = useState<MissionUsage | null>(null);
  const [missionId, setMissionId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  function applyEvent(event: ArmyEvent) {
    switch (event.type) {
      case 'plan':
        setPlan(event.plan);
        setTasks(
          Object.fromEntries(
            event.plan.tasks.map((t) => [
              t.key,
              {
                key: t.key,
                agentId: t.agentId,
                title: t.title,
                status: 'QUEUED' as TaskStatus,
                output: '',
                tools: [],
                toolEvents: []
              }
            ])
          )
        );
        break;
      case 'task:start':
        setTasks((prev) => ({
          ...prev,
          [event.key]: { ...prev[event.key], status: 'RUNNING', output: '', tools: event.tools }
        }));
        setOpenKey((k) => k ?? event.key);
        break;
      case 'task:tool':
        setTasks((prev) => ({
          ...prev,
          [event.key]: {
            ...prev[event.key],
            toolEvents: [
              ...prev[event.key].toolEvents,
              { tool: event.tool, input: event.input, isError: event.isError, ms: event.ms, preview: event.preview }
            ]
          }
        }));
        break;
      case 'task:delta':
        setTasks((prev) => ({ ...prev, [event.key]: { ...prev[event.key], output: prev[event.key].output + event.text } }));
        break;
      case 'task:end':
        setTasks((prev) => ({
          ...prev,
          [event.result.key]: {
            ...prev[event.result.key],
            status: event.result.status,
            output: event.result.output ?? prev[event.result.key].output,
            error: event.result.error,
            ms: event.result.ms,
            tokensIn: event.result.usage?.inputTokens,
            tokensOut: event.result.usage?.outputTokens
          }
        }));
        break;
      case 'usage':
        setUsage({ inputTokens: event.inputTokens, outputTokens: event.outputTokens, toolCalls: event.toolCalls });
        break;
      case 'report':
        setReport(event.text);
        break;
      case 'error':
        setError(event.message);
        break;
    }
  }

  async function dispatch() {
    const text = objective.trim();
    if (text.length < 8 || running) return;

    setRunning(true);
    setError(null);
    setPlan(null);
    setTasks({});
    setReport('');
    setOpenKey(null);
    setUsage(null);
    setMissionId(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/agents/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective: text }),
        signal: controller.signal
      });

      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const line = frame.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          const payload = JSON.parse(line.slice(6));
          if (payload.type === 'mission') {
            setMissionId(payload.id);
            continue;
          }
          applyEvent(payload as ArmyEvent);
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Mission failed to launch');
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  const taskList = plan?.tasks.map((t) => tasks[t.key]).filter(Boolean) ?? [];
  const done = taskList.filter((t) => t.status !== 'QUEUED' && t.status !== 'RUNNING').length;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="ticked panel mb-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="kicker mb-1">Sol Quasar · command core</p>
            <h1 className="font-display text-lg text-white">Mission dispatch</h1>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] text-ash-dim">
            <span>{AGENT_LIST.length - 1} field agents standing by</span>
            {plan && <span className="text-quasar">{done}/{taskList.length} settled</span>}
          </div>
        </div>

        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={3}
          placeholder="State the objective. Command will decompose it into a task graph and dispatch the army…"
          className="field mt-5 resize-none"
          disabled={running}
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={() => void dispatch()} disabled={running || objective.trim().length < 8} className="btn-primary">
            {running ? 'Army engaged…' : 'Dispatch army'}
          </button>
          {running && (
            <button onClick={() => abortRef.current?.abort()} className="btn-ghost">Abort</button>
          )}
          {!running && !plan && PRESETS.map((preset, i) => (
            <button key={i} onClick={() => setObjective(preset)} className="rounded border border-seam px-2.5 py-1.5 font-mono text-[10px] text-ash-dim transition hover:border-quasar/40 hover:text-ash">preset {i + 1}</button>
          ))}
        </div>

        {error && <p className="mt-4 rounded-md border border-quasar-hot/40 bg-quasar-hot/[.08] px-4 py-3 text-sm text-quasar-glow">{error}</p>}
      </div>

      {plan && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-3">
            <p className="kicker">Task graph</p>
            <p className="mb-4 text-sm leading-relaxed text-ash-dim">{plan.rationale}</p>
            {taskList.map((task) => {
              const agent = AGENTS[task.agentId];
              const dependsOn = plan.tasks.find((t) => t.key === task.key)?.dependsOn ?? [];
              const open = openKey === task.key;
              return (
                <div key={task.key} className={cn('panel overflow-hidden transition-colors', open && 'bg-plate/70')}>
                  <button onClick={() => setOpenKey(open ? null : task.key)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', task.status === 'RUNNING' && 'animate-blink')} style={{ background: agent.accent, boxShadow: task.status === 'RUNNING' ? `0 0 14px ${agent.accent}` : 'none' }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-white">{task.title}</span>
                      <span className="block font-mono text-[10px] uppercase tracking-[.18em] text-ash-dim">{agent.callsign} · {task.key}{dependsOn.length > 0 && ` ← ${dependsOn.join(', ')}`}</span>
                    </span>
                    <StatusPill status={task.status} pulse />
                  </button>
                  {open && (
                    <div className="border-t border-seam px-4 py-4">
                      {task.error && <p className="mb-3 font-mono text-[11px] text-quasar-hot">{task.error}</p>}
                      {task.tools.length > 0 && <p className="kicker mb-3">granted: {task.tools.join(' · ')}</p>}
                      <div className="max-h-80 overflow-y-auto">{task.output ? <Markdown>{task.output}</Markdown> : <p className="font-mono text-[12px] text-ash-dim">{task.status === 'RUNNING' ? '▮' : '(no return)'}</p>}</div>
                      <ToolTrace events={task.toolEvents} />
                      {task.ms !== undefined && <p className="mt-3 flex gap-4 font-mono text-[10px] text-ash-dim"><span>{(task.ms / 1000).toFixed(1)}s</span>{task.tokensIn !== undefined && <span>{task.tokensIn.toLocaleString()} in / {task.tokensOut?.toLocaleString()} out</span>}{task.toolEvents.length > 0 && <span>{task.toolEvents.length} tool calls</span>}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div>
            <p className="kicker mb-4">Mission report</p>
            <div className="ticked panel min-h-[300px] p-6">{report ? <Markdown>{report}</Markdown> : <p className="text-sm text-ash-dim">{running ? 'Command is holding until the field returns are in…' : 'No report yet.'}</p>}</div>
            {usage && <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/[.06] bg-white/[.04]">{[[usage.inputTokens.toLocaleString(),'tokens in'],[usage.outputTokens.toLocaleString(),'tokens out'],[String(usage.toolCalls),'tool calls']].map(([value,label]) => <div key={label} className="bg-hull/80 px-4 py-3"><dt className="font-mono text-sm text-white">{value}</dt><dd className="kicker mt-1">{label}</dd></div>)}</dl>}
            {report && <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => navigator.clipboard.writeText(report)} className="btn-ghost">Copy report</button>{missionId && <a href={`/missions/${missionId}`} className="btn-ghost">Open mission record</a>}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
