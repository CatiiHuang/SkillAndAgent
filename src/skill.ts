import { Agent, AgentConfig } from './agent';
import { Tool, ToolSchema } from './tool';

interface SkillConfig {
  name: string;
  description: string;
  systemPrompt: string;
  tools?: Tool[];
  maxRounds?: number;
  temperature?: number;
  onLoad?: () => void;
  onExecute?: (task: string) => void;
  onError?: (error: any) => void;
  onUnload?: () => void;
}

export class Skill {
  name: string;
  description: string;
  systemPrompt: string;
  tools: Tool[];
  maxRounds: number;
  temperature: number;
  private agent?: Agent;
  onLoad?: () => void;
  onExecute?: (task: string) => void;
  onError?: (error: any) => void;
  onUnload?: () => void;

  constructor({
    name,
    description,
    systemPrompt,
    tools = [],
    maxRounds = 10,
    temperature = 0.7,
    onLoad,
    onExecute,
    onError,
    onUnload,
  }: SkillConfig) {
    this.name = name;
    this.description = description;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.maxRounds = maxRounds;
    this.temperature = temperature;
    this.onLoad = onLoad;
    this.onExecute = onExecute;
    this.onError = onError;
    this.onUnload = onUnload;
  }

  initAgent(baseConfig: Partial<AgentConfig>) {
    this.agent = new Agent({
      apiKey: baseConfig.apiKey!,
      baseUrl: baseConfig.baseUrl,
      model: baseConfig.model,
      temperature: this.temperature,
      systemPrompt: this.systemPrompt,
      tools: this.tools,
    });
    this.onLoad?.();
  }

  async run(task: string): Promise<string> {
    if (!this.agent) {
      throw new Error(`Skill "${this.name}" agent not initialized.`);
    }
    try {
      this.onExecute?.(task);
      return await this.agent.invoke(task);
    } catch (error) {
      this.onError?.(error);
      throw error;
    }
  }

  unload() {
    this.onUnload?.();
    this.agent = undefined;
  }

  asTool(): Tool {
    return new Tool({
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: `The specific task or query to be handled by the "${this.name}" skill.`,
          },
        },
        required: ['task'],
      },
      execute: async ({ task }: { task: string }) => {
        console.log(`\n[Skill Delegation] Delegating task to skill "${this.name}": ${task}`);
        const result = await this.run(task);
        console.log(`[Skill Delegation] Result from "${this.name}": ${result}\n`);
        return result;
      },
    });
  }
}
