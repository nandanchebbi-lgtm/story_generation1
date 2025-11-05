import { useContext, useEffect, useState } from "react";
import { ProfileContext } from "../context/ProfileContext";
import { fetchGraph } from "../api/memory";

interface GraphNode {
  id: string;
  label?: string;
  type?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  relation?: string;
}

const GraphPanel: React.FC = () => {
  const { selectedProfile } = useContext(ProfileContext);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProfile) return;
    const loadGraph = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchGraph(selectedProfile);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      } catch (err) {
        console.error("Graph fetch failed:", err);
        setError("Failed to load knowledge graph");
      } finally {
        setLoading(false);
      }
    };
    loadGraph();
  }, [selectedProfile]);

  if (!selectedProfile) {
    return <p className="italic text-gray-500">⚠️ Select a profile to view its graph.</p>;
  }

  return (
    <div className="p-4 border rounded-lg shadow mt-4 bg-white">
      <h2 className="text-xl font-semibold mb-3">
        Knowledge Graph for <span className="text-blue-600">{selectedProfile}</span>
      </h2>

      {loading && <p>Loading graph...</p>}
      {error && <p className="bg-red-100 text-red-700 p-2 rounded">{error}</p>}

      {!loading && !error && nodes.length === 0 ? (
        <p className="text-gray-500">No data yet. Start chatting to populate it.</p>
      ) : (
        <div className="bg-gray-50 p-3 rounded max-h-96 overflow-y-auto text-sm">
          <strong>Nodes:</strong> <pre>{JSON.stringify(nodes, null, 2)}</pre>
          <strong>Edges:</strong> <pre>{JSON.stringify(edges, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default GraphPanel;