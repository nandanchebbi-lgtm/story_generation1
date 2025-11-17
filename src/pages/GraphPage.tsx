import ChatPanel from "../components/ChatPage";
import { ProfileContext } from "../context/ProfileContext";
import { useContext } from "react";



const ChatPage: React.FC = () => {
  const { selectedProfile } = useContext(ProfileContext);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Chat</h1>

      {!selectedProfile ? (
        <p className="italic text-gray-500">
          ⚠️ Please select a profile first to start chatting.
        </p>
      ) : (
        <ChatPanel />
      )}
    </div>
  );
};

export default ChatPage;