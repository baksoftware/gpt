interface LLMResponse {
  subnodes: string[];
}

export class LLMService {
  // Mock API call that simulates calling an LLM
  async generateSubnodes(nodeName: string): Promise<LLMResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock responses based on node names
    const mockResponses: Record<string, string[]> = {
      "Components": [
        "Functional Components",
        "Class Components",
        "Higher Order Components",
        "Pure Components"
      ],
      "State": [
        "useState",
        "useReducer",
        "State Management Libraries",
        "Immutable State"
      ],
      // Add more mock responses as needed
      "default": [
        "Concept 1",
        "Concept 2",
        "Concept 3"
      ]
    };

    return {
      subnodes: mockResponses[nodeName] || mockResponses.default
    };
  }
}

export const llmService = new LLMService(); 