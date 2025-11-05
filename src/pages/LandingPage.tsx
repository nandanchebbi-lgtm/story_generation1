import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen text-center overflow-hidden"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #fff4ec 0%, #ffe0d4 50%, #ffd4d4 100%)",
        color: "#3a1f1f",
        textAlign: "center",
      }}
    >
      {/* Animated Title */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="text-7xl sm:text-8xl font-extrabold tracking-tight mb-6 text-[#e25b45] drop-shadow-[0_0_20px_rgba(226,91,69,0.4)]"
      >
        Eunoia
      </motion.h1>

      {/* Subtitle / Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="text-[#7b4b3a] text-lg italic mb-10"
      >
        Your gentle AI companion — here with warmth and understanding.
      </motion.p>

      {/* Get Started Button */}
      <motion.button
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        onClick={() => navigate("/profiles")}
        className="bg-[#e25b45] hover:bg-[#d64d3a] px-10 py-3 rounded-xl text-lg font-semibold transition-all shadow-lg hover:shadow-[0_0_25px_rgba(226,91,69,0.4)] text-white"
      >
        Get Started
      </motion.button>
    </div>
  );
}