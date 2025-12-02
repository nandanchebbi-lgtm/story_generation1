# pkg/memory_kg.py
import os
import re
import ast
import threading
import json
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
# Local File Adapter (graph + FAISS storage)
# ============================================================
class LocalFileAdapter(MemoryAdapterBase):

    def __init__(self, profile_name="default", embeddings=None):
        base_data_dir = os.getenv("DATA_DIR", "data")

        self.profile_name = profile_name
        self.profile_dir = os.path.join(base_data_dir, profile_name)
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
                print(f"[WARN] Failed to load KG: {e}")
        return nx.DiGraph()

    # -------------------------------
    # Vector memory (FAISS)
    # -------------------------------
    def add_embeddings(self, new_summaries: list[str]):
        clean_texts = [t.strip() for t in new_summaries if t.strip()]
        if not clean_texts:
            return

        def _update():
            with self._lock:
                try:
                    if os.path.exists(self.faiss_path):
                        db = FAISS.load_local(
                            self.faiss_path,
                            self.embeddings,
                            allow_dangerous_deserialization=True,
                        )
                        db.add_texts(clean_texts)
                    else:
                        db = FAISS.from_texts(clean_texts, self.embeddings)

                    db.save_local(self.faiss_path)
                    self.vector_db = db
                except Exception as e:
                    print(f"[ERROR] FAISS update error: {e}")

        threading.Thread(target=_update, daemon=True).start()

    def load_embeddings(self):
        if os.path.exists(self.faiss_path):
            try:
                self.vector_db = FAISS.load_local(
                    self.faiss_path,
                    self.embeddings,
                    allow_dangerous_deserialization=True,
                )
            except Exception as e:
                print(f"[WARN] Failed to load FAISS: {e}")

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
# Memory Knowledge Graph (KG + FAISS)
# ============================================================
class MemoryKG:

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
        text = "\n".join(
            m["content"]
            for m in messages_chunk
            if m.get("role") in ["user", "assistant"]
        )

        if not text.strip():
            return []

        prompt = (
            "Extract concise (subject, predicate, object) triplets OR a list of summary "
            "sentences from the following text. Return ONLY a Python list.\n\nText:\n"
            f"{text}"
        )

        try:
            resp = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
            )
            raw = resp.choices[0].message.content
            match = re.search(r"\[.*\]", raw, re.DOTALL)
            parsed = ast.literal_eval(match.group()) if match else []

            out = []
            for t in parsed:
                if isinstance(t, (tuple, list)) and len(t) == 3:
                    out.append(tuple(map(str, t)))
                else:
                    out.append(("Summary", "says", str(t)))
            return out

        except Exception as e:
            print(f"[WARN] Triplet extraction failed: {e}")
            return [("Summary", "says", text[:200])]

    # -------------------------------
    # Graph utilities
    # -------------------------------
    def _node(self, label):
        for n, data in self.G.nodes(data=True):
            if data.get("label") == label:
                return n
        new_id = f"entity_{self.node_counter}"
        self.node_counter += 1
        self.G.add_node(new_id, label=label)
        return new_id

    def add_chunk_to_graph(self, new_messages, photo_name=None):
        clean = [
            {"role": m["role"], "content": m["content"]}
            for m in new_messages
            if isinstance(m.get("content"), str)
        ]
        if not clean:
            return

        triplets = self._extract_triplets_chunk(clean)

        summaries = []
        for s, p, o in triplets:
            s_id = self._node(s)
            o_id = self._node(o)
            rel = f"{p} [photo: {photo_name}]" if photo_name else p
            self.G.add_edge(s_id, o_id, relation=rel)
            summaries.append(f"{s} {p} {o}")

        self.adapter.save_graph(self.G)
        self.adapter.add_embeddings(summaries)

    # -------------------------------
    # Retrieval
    # -------------------------------
    def retrieve_relevant_context(self, query, top_k=5):
        memory_text = self.adapter.search(query, top_k)

        graph_snippets = []
        for u, v, d in list(self.G.edges(data=True))[-20:]:
            graph_snippets.append(
                f"{self.G.nodes[u].get('label')} — {d.get('relation')} → {self.G.nodes[v].get('label')}"
            )

        out = ""
        if memory_text:
            out += "Semantic memory:\n" + "\n".join(memory_text)
        if graph_snippets:
            out += "\n\nGraph memory:\n" + "\n".join(graph_snippets)
        return out.strip()

    # -------------------------------
    # Dump everything (for Year-in-Review)
    # -------------------------------
    def dump_all(self):
        lines = []

        # Graph edges
        for u, v, d in self.G.edges(data=True):
            s = self.G.nodes[u].get("label")
            o = self.G.nodes[v].get("label")
            rel = d.get("relation", "")
            lines.append(f"{s} — {rel} → {o}")

        # FAISS memory
        if self.adapter.vector_db and hasattr(self.adapter.vector_db, "texts"):
            for t in self.adapter.vector_db.texts:
                lines.append(t)

        return "\n".join(lines)


# ============================================================
# Frontend helper
# ============================================================
def graph_to_json(graph: nx.Graph):
    return {
        "nodes": [
            {"id": str(n), "label": graph.nodes[n].get("label", str(n))}
            for n in graph.nodes()
        ],
        "edges": [
            {"from": str(u), "to": str(v), "label": d.get("relation", "")}
            for u, v, d in graph.edges(data=True)
        ],
    }