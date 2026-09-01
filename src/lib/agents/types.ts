export type AgentId =
  | 'sol-quasar'
  | 'itachi'
  | 'minato'
  | 'zoro'
  | 'loqisurfer'
  | 'kairo'
  | 'vexa'
  | 'orion'
  | 'nara';

export type Capability =
  | 'orchestrate'
  | 'research'
  | 'analyse'
  | 'route'
  | 'build'
  | 'harvest'
  | 'memory'
  | 'validate'
  | 'metrics'
  | 'write';

export type ModelTier = 'primary' | 'fast';

export interface AgentSpec {
  id: AgentId;
  world: string;
  callsign: string;
  role: string;
  blurb: string;
  capabilities: Capability[];
  accent: string;
  tier: ModelTier;
  maxTokens: number;
  temperature: number;
  maxToolRounds: number;
  systemPrompt: string;
}

export type TaskStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
export type MissionStatus = 'PLANNING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface PlannedTask {
  key: string;
  agentId: AgentId;
  title: string;
  brief: string;
  dependsOn: string[];
}

export interface MissionPlan {
  objective: string;
  rationale: string;
  tasks: PlannedTask[];
}

export interface TaskUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface TaskResult {
  key: string;
  agentId: AgentId;
  status: TaskStatus;
  output?: string;
  error?: string;
  ms: number;
  usage?: TaskUsage;
  toolCalls?: number;
  rounds?: number;
}

export type ArmyEvent =
  | { type: 'plan'; plan: MissionPlan }
  | { type: 'task:start'; key: string; agentId: AgentId; title: string; tools: string[] }
  | { type: 'task:delta'; key: string; text: string }
  | {
      type: 'task:tool';
      key: string;
      tool: string;
      input: unknown;
      isError: boolean;
      ms: number;
      preview: string;
    }
  | { type: 'task:end'; result: TaskResult }
  | { type: 'report'; text: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number; toolCalls: number }
  | { type: 'done'; status: MissionStatus }
  | { type: 'error'; message: string };

export interface MissionArtifact {
  id: string;
  filename: string;
  language: string;
  content: string;
  agentId: string;
}
