import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages';
import { log } from './logger';
import type { ModelTier } from '@/lib/agents/types';

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
  return client;
}

export function modelFor(tier: ModelTier): string {
  return tier === 'fast'
    ? process.env.LOQI_MODEL_FAST ?? 'claude-haiku-4-5-20251001'
    : process.env.LOQI_MODEL_PRIMARY ?? 'claude-sonnet-4-5';
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface ToolInvocation {
  name: string;
  input: unknown;
  result: string;
  isError: boolean;
  ms: number;
}

export type ToolRunner = (
  name: string,
  input: unknown
) => Promise<{ content: string; isError: boolean }>;

export interface CompleteArgs {
  tier: ModelTier;
  system: string;
  messages: MessageParam[];
  maxTokens?: number;
  temperature?: number;
  tools?: Tool[];
  runTool?: ToolRunner;
  maxToolRounds?: number;
  onDelta?: (text: string) => void | Promise<void>;
  onToolUse?: (invocation: ToolInvocation) => void | Promise<void>;
}

export interface CompleteResult {
  text: string;
  usage: Usage;
  toolCalls: ToolInvocation[];
  stopReason: string | null;
  rounds: number;
}

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    const status = err.status ?? 0;
    return status === 408 || status === 409 || status === 429 || status >= 500;
  }
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return /timeout|econnreset|socket hang up|network|fetch failed/.test(msg);
}

async function streamOnce(args: CompleteArgs, messages: MessageParam[]): Promise<Anthropic.Message> {
  const stream = anthropic().messages.stream({
    model: modelFor(args.tier),
    max_tokens: args.maxTokens ?? 4096,
    temperature: args.temperature ?? 0.3,
    system: args.system,
    messages,
    ...(args.tools?.length ? { tools: args.tools } : {})
  });

  if (args.onDelta) {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        await args.onDelta(event.delta.text);
      }
    }
  }

  return stream.finalMessage();
}

async function streamWithRetry(
  args: CompleteArgs,
  messages: MessageParam[],
  attempts = 3
): Promise<Anthropic.Message> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await streamOnce(args, messages);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === attempts) break;
      const backoff = 500 * 2 ** (attempt - 1) + Math.random() * 250;
      log.warn('anthropic.retry', { attempt, backoff: Math.round(backoff), error: String(err) });
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  throw lastError;
}

export async function completeFull(args: CompleteArgs): Promise<CompleteResult> {
  const maxRounds = args.maxToolRounds ?? 6;
  const messages: MessageParam[] = [...args.messages];
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  const toolCalls: ToolInvocation[] = [];

  let text = '';
  let rounds = 0;
  let stopReason: string | null = null;

  for (;;) {
    const forceAnswer = rounds >= maxRounds;
    const message = await streamWithRetry(forceAnswer ? { ...args, tools: undefined } : args, messages);

    usage.inputTokens += message.usage.input_tokens;
    usage.outputTokens += message.usage.output_tokens;
    stopReason = message.stop_reason;

    const textBlocks = message.content.filter((b): b is Anthropic.TextBlock => b.type === 'text');
    const toolUses = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');

    const roundText = textBlocks.map((b) => b.text).join('');
    if (roundText) text += (text ? '\n\n' : '') + roundText;

    if (!toolUses.length || forceAnswer || !args.runTool) {
      if (message.stop_reason === 'max_tokens') text += '\n\n[truncated: hit max_tokens]';
      break;
    }

    rounds++;
    messages.push({ role: 'assistant', content: message.content });

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      const started = Date.now();
      const outcome = await args.runTool(use.name, use.input);
      const invocation: ToolInvocation = {
        name: use.name,
        input: use.input,
        result: outcome.content,
        isError: outcome.isError,
        ms: Date.now() - started
      };
      toolCalls.push(invocation);
      await args.onToolUse?.(invocation);

      results.push({
        type: 'tool_result',
        tool_use_id: use.id,
        content: outcome.content.slice(0, 40_000),
        is_error: outcome.isError
      });
    }

    messages.push({ role: 'user', content: results });
  }

  return { text: text.trim(), usage, toolCalls, stopReason, rounds };
}

export async function complete(
  args: Omit<CompleteArgs, 'messages'> & { messages: { role: 'user' | 'assistant'; content: string }[] }
): Promise<string> {
  const { text } = await completeFull({ ...args, messages: args.messages as MessageParam[] });
  return text;
}
