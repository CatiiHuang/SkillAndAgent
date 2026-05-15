interface ToolConfig {
  name: string;
  description: string;
  parameters?: object;
  execute: (params: any) => any | Promise<any>;
}

export interface ToolSchema {
  type: 'function';
  function: { name: string; description: string; parameters: object };
}

export class Tool {
  name: string;
  description: string;
  parameters: object;
  private _execute: ToolConfig['execute'];

  constructor({ name, description, parameters, execute }: ToolConfig) {
    this.name = name;
    this.description = description;
    this.parameters = parameters ?? { type: 'object', properties: {} };
    this._execute = execute;
  }

  async run(params: any): Promise<string> {
    const r = await this._execute(params);
    return typeof r === 'string' ? r : JSON.stringify(r);
  }

  toSchema(): ToolSchema {
    return {
      type: 'function',
      function: { name: this.name, description: this.description, parameters: this.parameters },
    };
  }
}
