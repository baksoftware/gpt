import OpenAI from 'openai';
import { config } from '../config/config.example';

interface LLMResponse {
  subnodes: string[];
}

export class LLMService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async generateSubnodes(nodeName: string): Promise<LLMResponse> {
    try {
      const prompt = `Given the topic or question "${nodeName}", generate 2-3 relevant follow-up questions or subtopics. 
      Return them as a concise list without numbering or bullets.
      Each response should be a natural follow-up question or subtopic that helps explore the main topic further.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates relevant follow-up questions and subtopics. Keep responses concise and natural."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      });

      // Extract the generated text and split into subnodes
      const generatedText = response.choices[0]?.message?.content || '';
      const subnodes = generatedText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      return {
        subnodes: subnodes.slice(0, 3) // Ensure we don't return more than 3 subnodes
      };
    } catch (error) {
      console.error('Error generating subnodes:', error);
      // Fallback to random generation in case of API error
      const subnodes = Array.from(
        { length: Math.floor(Math.random() * 2) + 2 },
        () => `${nodeName} ${Math.random().toString(36).substring(2, 8)}`
      );
      return { subnodes };
    }
  }
}

export const llmService = new LLMService(); 