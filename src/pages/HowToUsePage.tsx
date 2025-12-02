import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function HowToUsePage() {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col items-center justify-start text-center overflow-auto w-full"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start", // start from top
        alignItems: "center",
        background: "linear-gradient(135deg, #ffe0d4 0%, #ffc1b0 50%, #ff9f95 100%)",
        color: "#3a1f1f",
        textAlign: "center",
        padding: "4rem 2rem", // more space from top
      }}
    >
      {/* Main Heading */}
      <h1 className="text-5xl font-extrabold mb-16">
        How to Use Eunoia
      </h1>

      {/* Instructions / Content */}
      <div className="flex flex-col items-center space-y-12 text-lg leading-relaxed max-w-3xl w-full">
        
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-4">1. Create a Profile</h2>
          <p>
            Begin by creating a profile for yourself or someone else. Each profile stores
            uploaded photos and AI-generated insights tailored to that person.
          </p>
        </div>

        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-4">2. Upload Photos</h2>
          <p>
            Add clear, well-lit face photos. These help Eunoia interpret emotions, trends,
            and personality cues for deeper analysis.
          </p>
        </div>

        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-4">3. Generate Insights</h2>
          <p>
            Choose features like <strong>Year in Review</strong>. Eunoia will analyze uploaded
            photos and generate personalized insights.
          </p>
        </div>

        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-4">4. Browse Past Results</h2>
          <p>
            All insights are saved per profile, letting you revisit past readings or compare
            how someone’s emotional patterns evolve over time.
          </p>
        </div>

        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-4">Need Help?</h2>
          <p>
            If something isn’t working, ensure your backend is running at 
            <code className="block mx-auto bg-white/40 px-2 py-1 rounded mt-2">
              http://YOUR-LAN-IP:8000/api
            </code>
            and that you’re connected to the same Wi-Fi network.
          </p>
        </div>

      </div>

      {/* Continue Button */}
      <motion.button
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="bg-[#e25b45] hover:bg-[#d64d3a] px-10 py-3 rounded-xl text-lg font-semibold transition-all shadow-lg hover:shadow-[0_0_25px_rgba(226,91,69,0.4)] text-white mt-16"
        onClick={() => navigate("/profiles")}
      >
        Continue to Profiles
      </motion.button>
    </div>
  );
}