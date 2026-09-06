import { cn } from '@/lib/utils';
import type { MissionStatus, TaskStatus } from '@/lib/agents/types';

const STYLES:Record<TaskStatus|MissionStatus,string>={QUEUED:'text-ash-dim border-seam',RUNNING:'text-quasar border-quasar/50',SUCCEEDED:'text-plasma border-plasma/40',FAILED:'text-quasar-hot border-quasar-hot/50',SKIPPED:'text-ash-dim/60 border-seam',PLANNING:'text-horizon border-horizon/50',CANCELLED:'text-ash-dim/60 border-seam'};
export function StatusPill({status,pulse=false,className}:{status:TaskStatus|MissionStatus;pulse?:boolean;className?:string}){return <span className={cn('shrink-0 rounded border px-2 py-1 font-mono text-[9px] uppercase tracking-wider',STYLES[status],pulse&&(status==='RUNNING'||status==='PLANNING')&&'animate-blink',className)}>{status}</span>}
