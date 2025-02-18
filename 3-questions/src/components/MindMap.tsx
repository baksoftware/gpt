import { MindMapNode } from '../types/mindmap';
import ReactRulesMindmap from '../examples/ReactRulesMindmap';

interface MindMapProps {
  data: MindMapNode;
}

const MindMap = ({ data }: MindMapProps) => {
  return (
    <ReactRulesMindmap 
      data={data}
      width={window.innerWidth}
      height={window.innerHeight - 70} // Subtract header height
    />
  );
};

export default MindMap; 