import { useAuth } from "@/contexts/AuthContext";
import { FormEventHandler, useCallback, useState, useEffect } from "react";
import Link from 'next/link';
import Head from "next/head";
import { Send, Paperclip, Menu } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<{ user: string; bot: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isTextBoxHovered, setIsTextBoxHovered] = useState(false);
  const [isSendButtonHovered, setIsSendButtonHovered] = useState(false);
  const [isFileButtonHovered, setIsFileButtonHovered] = useState(false);
  const [isMenuButtonHovered, setIsMenuButtonHovered] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const { token, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login...');
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const sendMessage = useCallback<FormEventHandler>(async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    // Check if token exists
    if (!token) {
      console.error('No authentication token found');
      setChat([...chat, { user: input, bot: 'Error: Please log in to use the chat.' }]);
      setInput('');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending message to API with token:', token ? 'Token present' : 'No token');
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: input }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('API request failed:', res.status, res.statusText, errorData);
        throw new Error(`API request failed: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('API response:', data);

      setChat([...chat, { user: input, bot: data.reply }]);
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      setChat([...chat, { user: input, bot: 'Error: Failed to get response from server.' }]);
      setInput('');
    } finally {
      setLoading(false);
    }
  }, [input, token, chat]);

  return (
    <div style={styles.page}>
      <Head>
        <title>Intelligent Academic Path Planner</title>
        <style>{`
          input::placeholder {
            color: #ffffff !important;
            opacity: 0.9;
          }
        `}</style>
      </Head>

      {/* Title Bar */}
      <div style={styles.titleBar}>
        <button 
          style={{
            ...styles.menuButton,
            ...(isMenuButtonHovered ? {
              ...styles.menuButtonHover,
              background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.35))`,
            } : {}),
          }}
          onMouseEnter={() => setIsMenuButtonHovered(true)}
          onMouseLeave={() => setIsMenuButtonHovered(false)}
          onMouseMove={handleMouseMove}
        >
          <Menu size={24} color="#ffffff" />
        </button>
        <h1 style={styles.titleBarHeading}>Intelligent Academic Path Planner</h1>
        <select style={styles.universityDropdown}>
          <option value="">Select Your University</option>
          <option>UMass Boston</option>
          <option>MIT</option>
          <option>Harvard University</option>
          <option>Boston University</option>
          <option>Northeastern University</option>
        </select>
      </div>

      <p style={styles.subtitle}>AI-Powered Advisor for University Students</p>

      {/* Dropdown Section */}
      <div style={styles.dropdownSection}>
        <input style={styles.input} placeholder="Your Name" />

        <select style={styles.input}>
          <option value="">Select your Major</option>
          <option>Computer Science</option>
          <option>Mathematics</option>
          <option>Engineering</option>
          <option>Biology</option>
        </select>

        <select style={styles.input}>
          <option value="">College Year</option>
          <option>Freshman</option>
          <option>Sophomore</option>
          <option>Junior</option>
          <option>Senior</option>
        </select>

        <select style={styles.input}>
          <option value="">Semester & Year</option>
          <option>Fall 2025</option>
          <option>Spring 2026</option>
          <option>Summer 2026</option>
        </select>
      </div>

      {/* Chat Window */}
      <div style={styles.chatWindow}>
        {chat.length === 0 ? (
          <p style={styles.placeholder}>
            Let's get you started with finding the correct course for you.
          </p>
        ) : (
          chat.map((msg, i) => (
            <div key={i} style={styles.chatMessage}>
              <div style={{ marginBottom: 8 }}>
                <b>You:</b>
                <div style={{ whiteSpace: "pre-line" }}>{msg.user}</div>
              </div>
              <div>
                <b>Bot:</b>
                <div style={{ whiteSpace: "pre-line" }}>{msg.bot}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat Bar */}
      <form onSubmit={sendMessage} style={styles.chatBar}>
        <input
          style={{
            ...styles.textBox,
            ...(isTextBoxHovered ? styles.textBoxHover : {}),
          }}
          disabled={loading}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onMouseEnter={() => setIsTextBoxHovered(true)}
          onMouseLeave={() => setIsTextBoxHovered(false)}
          placeholder="Type your question here..."
        />
        
        {/* File Upload Button */}
        <label 
          htmlFor="file-upload" 
          style={{
            ...styles.fileUploadButton,
            ...(isFileButtonHovered ? {
              ...styles.fileUploadButtonHover,
              background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, #e8edf2, #7a8388)`,
            } : {}),
          }}
          onMouseEnter={() => setIsFileButtonHovered(true)}
          onMouseLeave={() => setIsFileButtonHovered(false)}
          onMouseMove={handleMouseMove as any}
        >
          <Paperclip size={16} style={{ marginRight: 5 }} />
          {selectedFiles && selectedFiles.length > 0 
            ? `${selectedFiles.length} file(s)` 
            : 'Attach'}
        </label>
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={(e) => setSelectedFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        
        <button
          style={{
            ...styles.sendButton,
            ...(isSendButtonHovered ? {
              ...styles.sendButtonHover,
              background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, #99ccff, #1a75d9)`,
            } : {}),
          }}
          disabled={loading}
          type="submit"
          onMouseEnter={() => setIsSendButtonHovered(true)}
          onMouseLeave={() => setIsSendButtonHovered(false)}
          onMouseMove={handleMouseMove}
        >
          <Send size={16} style={{ marginRight: 5 }} />
          {loading ? '...' : 'Send'}
        </button>
      </form>

      <Link href="logout" style={styles.logoutLink}>Log out</Link>

      <footer style={styles.footer}>
        © {new Date().getFullYear()} UMass Boston | Intelligent Academic Path Planner
      </footer>
    </div>
  );
}

const styles: Record<string, any> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "linear-gradient(to bottom right, #f0f6ff, #ffffff)",
    padding: "40px 20px",
    paddingTop: "100px", // Add space for fixed title bar
    fontFamily: "Arial, sans-serif",
  },
  titleBar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "70px",
    background: "linear-gradient(to right, #004aad, #0066cc)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 30px",
    zIndex: 1000,
  },
  menuButton: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s ease",
    borderRadius: "4px",
  },
  menuButtonHover: {
    background: "rgba(255, 255, 255, 0.2)",
    transform: "scale(1.15)",
  },
  titleBarHeading: {
    fontSize: "1.5rem",
    color: "#ffffff",
    fontWeight: "bold",
    margin: 0,
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
  },
  universityDropdown: {
    padding: "10px 15px",
    border: "2px solid #ffffff",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.95)",
    fontSize: "14px",
    fontWeight: "500",
    color: "#004aad",
    cursor: "pointer",
    minWidth: "200px",
    outline: "none",
  },
  title: {
    fontSize: "2.5rem",
    color: "#004aad",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "#555",
    fontSize: "1rem",
    marginBottom: 30,
  },
  dropdownSection: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "10px",
    marginBottom: 40,
  },
  input: {
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    width: "200px",
    fontSize: "14px",
    color: "#ffffff",
  },
  chatWindow: {
    width: "100%",
    maxWidth: "700px",
    height: "400px",
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    padding: "15px",
    overflowY: "auto",
  },
  placeholder: {
    color: "#aaa",
    textAlign: "center",
    marginTop: "30px",
    fontSize: "14px",
  },
  chatMessage: {
    margin: "10px 0",
    color: "#333",
  },
  chatBar: {
    display: "flex",
    gap: "10px",
    marginTop: "15px",
    width: "100%",
    maxWidth: "700px",
  },
  textBox: {
    flex: 1,
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    fontSize: "14px",
    transition: "all 0.3s ease",
    color: "#ffffff",
  },
  textBoxHover: {
    border: "2px solid #004aad",
    boxShadow: "0 0 12px rgba(0, 74, 173, 0.5)",
    transform: "translateY(-2px)",
  },
  fileUploadButton: {
    background: "#6c757d",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    whiteSpace: "nowrap",
  },
  fileUploadButtonHover: {
    background: "#5a6268",
    boxShadow: "0 6px 18px rgba(108, 117, 125, 0.5)",
    transform: "translateY(-3px)",
  },
  sendButton: {
    background: "#004aad",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  sendButtonHover: {
    background: "#0066cc",
    color: "#ffffff",
    boxShadow: "0 6px 18px rgba(0, 74, 173, 0.6)",
    transform: "translateY(-3px) scale(1.05)",
  },
  logoutLink: {
    marginTop: "20px",
    color: "#004aad",
    textDecoration: "underline",
  },
  footer: {
    marginTop: "20px",
    color: "#777",
    fontSize: "12px",
  },
};
