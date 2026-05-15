import { Agent } from './agent';
import { Skill } from './skill';
import { Tool } from './tool';

// 1. 计算 Skill
const calculationSkill = new Skill({
  name: 'calculator',
  description: '数学计算专家',
  systemPrompt: '你是一个数学计算专家，擅长使用计算工具进行精确计算。',
  tools: [
    new Tool({
      name: 'calculator',
      description: '计算数学表达式',
      parameters: { type: 'object', properties: { expr: { type: 'string' } }, required: ['expr'] },
      execute: ({ expr }: { expr: string }) => ({ result: new Function(`return (${expr})`)() }),
    }),
  ],
  onLoad: () => console.log('✅ [Lifecycle] 数学专家技能加载完毕！'),
  onExecute: (task) => console.log(`🚀 [Lifecycle] 数学专家正在执行任务: ${task}`),
  onError: (e) => console.error(`❌ [Lifecycle] 数学专家遇到错误: ${e}`),
  onUnload: () => console.log('👋 [Lifecycle] 数学专家技能已卸载。'),
});

// 2. 通用 Skill (包含时间和天气查询)
const generalSkill = new Skill({
  name: 'general_assistant',
  description: '日常信息查询工具',
  systemPrompt: '你是一个贴心的日常助手，可以帮助用户查询时间和天气。',
  tools: [
    new Tool({
      name: 'get_time',
      description: '获取当前时间',
      execute: () => ({ time: new Date().toISOString() }),
    }),
    new Tool({
      name: 'get_weather',
      description: '获取指定城市的天气',
      parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
      execute: ({ city }: { city: string }) => {
        const weathers = ['晴朗 ☀️', '多云 ⛅️', '下雨 🌧️', '下雪 ❄️', '刮大风 🌬️'];
        const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
        return { city, weather: randomWeather, temperature: Math.floor(Math.random() * 35) + '°C' };
      },
    }),
  ],
  onLoad: () => console.log('✅ [Lifecycle] 日常信息查询工具技能加载完毕！'),
  onExecute: (task) => console.log(`🚀 [Lifecycle] 日常信息查询工具正在执行任务: ${task}`),
  onError: (e) => console.error(`❌ [Lifecycle] 日常信息查询工具遇到错误: ${e}`),
  onUnload: () => console.log('👋 [Lifecycle] 日常信息查询工具已卸载。'),
});

// 3. 实例化 Agent，传入多个 Skill，并自定义系统提示词
const agent = new Agent({
  apiKey: 'sk-cfcc3af8db3e4e6e99022f678d49b2fb',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen3.6-plus',
  skills: [calculationSkill, generalSkill],
  systemPrompt:
    '你是一个全能的超级智能体，你的名字叫“小星”。你集成了数学计算和日常查询的能力。当用户问候你时，请先做自我介绍，并根据用户的需求选择合适的工具进行解答。回答要活泼幽默。',
});

(async () => {
  console.log('====提问：现在几点了？并帮我计算1000*99等于多少？====');
  console.log(await agent.invoke('现在几点了？并帮我计算1000*99等于多少？'));
})();
