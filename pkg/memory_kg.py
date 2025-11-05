import os, re, ast, threading, json
import networkx as nx
from openai import OpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
import pyarrow as pa
import pyarrow.ipc as ipc

SHORT_TERM_WINDOW = 15


# ============================================================
# Base Adapter
# ============================================================
class MemoryAdapterBase:
    def save_graph(self, graph: nx.DiGraph): raise NotImplementedError
    def load_graph(self) -> nx.DiGraph: raise NotImplementedError
    def add_embeddings(self, new_summaries: list[str]): raise NotImplementedError
    def load_embeddings(self): raise NotImplementedError
    def search(self, query: str, top_k: int = 5) -> list[str]: raise NotImplementedError


# ============================================================
# Local File Adapter
# ============================================================
class LocalFileAdapter(MemoryAdapterBase):
    """Handles persistent storage of graph + FAISS vector DB per user profile."""

    def __init__(self, profile_name="default", embeddings=None):
        self.profile_name = profile_name
        self.profile_dir = os.path.join("data", profile_name)
        os.makedirs(self.profile_dir, exist_ok=True)

        self.kg_path = os.path.join(self.profile_dir, f"memory_{profile_name}.arrow")
        self.faiss_path = os.path.join(self.profile_dir, f"faiss_{profile_name}")
        self.embeddings = embeddings or OpenAIEmbeddings()
        self.vector_db = None
        self._lock = threading.Lock()

    # -------------------------------
    # Graph persistence
    # -------------------------------
    def save_graph(self, graph: nx.DiGraph):
        try:
            graph_dict = nx.node_link_data(graph, edges="links")
            table = pa.table({"graph": [json.dumps(graph_dict)]})
            with pa.OSFile(self.kg_path, "wb") as sink:
                with ipc.new_file(sink, table.schema) as writer:
                    writer.write_table(table)
        except Exception as e:
            print(f"[ERROR] Failed to save KG: {e}")

    def load_graph(self) -> nx.DiGraph:
        if os.path.exists(self.kg_path):
            try:
                with pa.memory_map(self.kg_path, "r") as source:
                    reader = ipc.open_file(source)
                    table = reader.read_all()
                    graph_json = table["graph"][0].as_py()
                    graph_dict = json.loads(graph_json)
                    return nx.node_link_graph(graph_dict, edges="links")
            except Exception as e:
                print(f"[WARN] Arrow load failed: {e}")
        return nx.DiGraph()

    # -------------------------------
    # Vector memory (FAISS)
    # -------------------------------
    def add_embeddings(self, new_summaries: list[str]):
        """Add new embeddings to FAISS index safely."""
        clean_texts = [t.strip() for t in new_summaries if isinstance(t, str) and t.strip()]
        if not clean_texts:
            print("⚠️ Skipped FAISS update (no valid text)")
            return

        def _update():
            with self._lock:
                try:
                    if os.path.exists(self.faiss_path):
                        db = FAISS.load_local(
                            self.faiss_path, self.embeddings, allow_dangerous_deserialization=True
                        )
                        db.add_texts(clean_texts)
                    else:
                        db = FAISS.from_texts(clean_texts, self.embeddings)
                    db.save_local(self.faiss_path)
                    self.vector_db = db
                    print(f"[FAISS] ✅ Updated ({len(clean_texts)} new items)")
                except Exception as e:
                    print(f"[ERROR] FAISS update failed: {e}")

        threading.Thread(target=_update, daemon=True).start()

    def load_embeddings(self):
        if os.path.exists(self.faiss_path):
            try:
                self.vector_db = FAISS.load_local(
                    self.faiss_path, self.embeddings, allow_dangerous_deserialization=True
                )
                print(f"[FAISS] ✅ Loaded for {self.profile_name}")
            except Exception as e:
                print(f"[WARN] FAISS load failed: {e}")

    def search(self, query: str, top_k: int = 5) -> list[str]:
        if not self.vector_db:
            self.load_embeddings()
        if not self.vector_db:
            return []
        try:
            results = self.vector_db.similarity_search(query, k=top_k)
            return [r.page_content for r in results]
        except Exception as e:
            print(f"[ERROR] FAISS search failed: {e}")
            return []


# ============================================================
# Memory Knowledge Graph
# ============================================================
class MemoryKG:
    """Combines knowledge graph and vector memory (FAISS) for persistent recall."""

    def __init__(self, adapter: MemoryAdapterBase, profile_name="default"):
        self.client = OpenAI()
        self.profile_name = profile_name
        self.adapter = adapter
        self.G = self.adapter.load_graph()
        self.adapter.load_embeddings()
        self.node_counter = len(self.G.nodes)

    # -------------------------------
    # Triplet extraction
    # -------------------------------
    def _extract_triplets_chunk(self, messages_chunk):
        """Extract factual (subject, predicate, object) triplets."""
        text = "\n".join(
            m["content"] for m in messages_chunk
            if m.get("role") in ["user", "assistant"] and isinstance(m.get("content"), str)
        )

        if not text.strip():
            return []

        prompt = (
            "Extract concise (subject, predicate, object) triplets OR high-level summaries "
            "from the text below. If factual extraction fails, return meaningful summaries instead. "
            "Return ONLY a valid Python list of tuples.\n\nText:\n"
            f"{text}"
        )

        try:
            resp = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
            )
            raw = resp.choices[0].message.content
            match = re.search(r"\[.*\]", raw, re.DOTALL)
            parsed = ast.literal_eval(match.group()) if match else []
            triplets = []
            for t in parsed:
                if isinstance(t, (tuple, list)) and len(t) == 3:
                    triplets.append(tuple(map(str, t)))
                elif isinstance(t, dict) and {"subject", "predicate", "object"}.issubset(t):
                    triplets.append((t["subject"], t["predicate"], t["object"]))
            return triplets
        except Exception as e:
            print(f"[WARN] Triplet extraction failed: {e}")
            # fallback — return summaries
            return [("User", "said", text[:200])]

    # -------------------------------
    # Graph management
    # -------------------------------
    def _get_or_create_node(self, label):
        for n, data in self.G.nodes(data=True):
            if data.get("label") == label:
                return n
        node_id = f"entity_{self.node_counter}"
        self.node_counter += 1
        self.G.add_node(node_id, type="Entity", label=label)
        return node_id

    def add_chunk_to_graph(self, new_messages, photo_name=None):
        """Add conversation messages to persistent graph + FAISS memory."""
        clean_messages = [
            {"role": m["role"], "content": m["content"]}
            for m in new_messages
            if m.get("role") in ["user", "assistant"] and isinstance(m.get("content"), str)
        ]
        if not clean_messages:
            return

        triplets = self._extract_triplets_chunk(clean_messages)
        if not triplets:
            return

        new_summaries = []
        for s, p, o in triplets:
            s_id = self._get_or_create_node(s)
            o_id = self._get_or_create_node(o)
            relation = f"{p} [photo: {photo_name}]" if photo_name else p
            self.G.add_edge(s_id, o_id, relation=relation)
            new_summaries.extend([f"{s} {p} {o}"])

        self.adapter.save_graph(self.G)
        self.adapter.add_embeddings(new_summaries)

    # -------------------------------
    # Recall
    # -------------------------------
    def retrieve_relevant_context(self, query, top_k=5):
        """Combine semantic and structural recall."""
        text_hits = self.adapter.search(query, top_k)
        edge_context = []

        for u, v, d in list(self.G.edges(data=True))[-30:]:
            edge_context.append(
                f"{self.G.nodes[u].get('label')} — {d.get('relation', '')} → {self.G.nodes[v].get('label')}"
            )

        context = ""
        if text_hits:
            context += "Semantic recall:\n" + "\n".join(text_hits)
        if edge_context:
            context += "\n\nGraph recall:\n" + "\n".join(edge_context[-10:])
        return context.strip()


# ============================================================
# Frontend visualization helper
# ============================================================
def graph_to_json(graph: nx.Graph):
    nodes = [{"id": str(n), "label": str(graph.nodes[n].get("label", n))} for n in graph.nodes()]
    edges = [{"from": str(u), "to": str(v), "label": d.get("relation", "")} for u, v, d in graph.edges(data=True)]
    return {"nodes": nodes, "edges": edges}