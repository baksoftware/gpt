export interface MindMapNodeAttributes {
  isLastQuestion?: boolean;
  isAnswer?: boolean;
  // ... keep any existing attributes
}

export interface MindMapNode {
  id: string;
  name: string;  // Required field
  children?: MindMapNode[];
  group?: number;
  isNew?: boolean;
  attributes?: MindMapNodeAttributes;
}
