interface LLMResponse {
  subnodes: string[];
}

export class LLMService {
  private apiUrl = 'http://localhost:3001/api';

  async generateSubnodes(nodeName: string): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/generate-subnodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodeName })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      console.log(JSON.stringify(data, null, 4));
      return data;
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