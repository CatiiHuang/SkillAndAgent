import { Skill } from './skill';
import { Tool, ToolSchema } from './tool';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface AgentConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  skill?: Skill; // Kept for backward compatibility if needed
  skills?: Skill[];
  tools?: Tool[];
  systemPrompt?: string;
  temperature?: number;
}

export class Agent {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private tools: Map<string, Tool> = new Map();
  private messages: ChatMessage[] = [];
  private systemPrompt: string;
  private temperature: number;

  constructor(config: AgentConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.model = config.model ?? 'gpt-4o';

    this.systemPrompt = config.systemPrompt ?? '你是一个智能助手。';
    this.temperature = config.temperature ?? 0.7;

    if (config.tools) {
      config.tools.forEach((t) => this.tools.set(t.name, t));
    }

    if (config.skills) {
      config.skills.forEach((skill) => {
        skill.initAgent({
          apiKey: this.apiKey,
          baseUrl: this.baseUrl,
          model: this.model,
          temperature: this.temperature,
        });
        const skillTool = skill.asTool();
        this.tools.set(skillTool.name, skillTool);
      });
    }

    this.messages = [{ role: 'system', content: this.systemPrompt }];
  }

  async invoke(input: string): Promise<string> {
    this.messages.push({ role: 'user', content: input });

    const schemas = Array.from(this.tools.values()).map((t) => t.toSchema());
    let rounds = 0;

    while (rounds++ < 10) {
      const msg = await this._chat(schemas);
      this.messages.push(msg);

      if (!msg.tool_calls?.length) {
        return msg.content ?? '';
      }

      for (const tc of msg.tool_calls) {
        const tool = this.tools.get(tc.function.name);
        const params = JSON.parse(tc.function.arguments || '{}');
        const result = tool ? await tool.run(params) : `Tool "${tc.function.name}" not found`;
        this.messages.push({ role: 'tool', tool_call_id: tc.id, content: result });
      }
    }
    return '[max tool rounds reached]';
  }

  private async _chat(tools: ToolSchema[]): Promise<ChatMessage> {
    const body: any = {
      model: this.model,
      messages: this.messages,
      temperature: this.temperature,
    };
    if (tools.length) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    // console.log('======PayLoad======');
    // console.log(JSON.stringify(body, null, 2));
    // console.log('======PayLoad======');

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`LLM error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices: Array<{ message: ChatMessage }> };

    // console.log('======Response======');
    // console.log(data.choices[0].message);
    // console.log('======Response======');
    return data.choices[0].message;
  }
}
