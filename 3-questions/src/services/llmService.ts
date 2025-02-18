interface LLMResponse {
  subnodes: string[];
}

export class LLMService {
  // Mock API call that simulates calling an LLM
  async generateSubnodes(nodeName: string): Promise<LLMResponse> {
    // Simulate API delay
    // await new Promise(resolve => setTimeout(resolve, 100));

    // generate 1-3 random subnodes with the text nodeName + random text
    const subnodes = Array.from(
      { length: Math.floor(Math.random() * 3) + 2 }, 
      () => `${nodeName} ${Math.random().toString(36).substring(2, 3)}`);

    return {
      subnodes
    };
  }
}

export const llmService = new LLMService(); 