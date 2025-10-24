import { useAuth } from "@/contexts/AuthContext";
import { FormEventHandler, useCallback, useState } from "react";
import Link from 'next/link';
import Head from "next/head";
import { Send } from "lucide-react";
//
export default function Home() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<{ user: string; bot: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const { token } = useAuth();

  const sendMessage = useCallback<FormEventHandler>(async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    // Check if token exists
    if (!token) {
      console.error('No authentication token found');
      setChat([...chat, { user: input, bot: 'Error: Please log in to use the chat.' }]);
      return;
    }

    setLoading(true);
    try {
      console.log('Sending message to API...');
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: input }),
      });
      
      if (!res.ok) {
        console.error('API request failed:', res.status, res.statusText);
        throw new Error(`API request failed: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('API response:', data);

      setChat([...chat, { user: input, bot: data.reply }]);
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      setChat([...chat, { user: input, bot: 'Error: Failed to get response from server.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, token, chat]);

  return (
    <div style={styles.page}>
      <Head>
        <title>Intelligent Academic Path Planner</title>
      </Head>

      <h1 style={styles.title}>Intelligent Academic Path Planner</h1>
      <p style={styles.subtitle}>AI-Powered Advisor for University Students</p>

      {/* Dropdown Section */}
      <div style={styles.dropdownSection}>
        <input style={styles.input} placeholder="Your Name" />

        <select style={styles.input}>
          <option value="">Select Major</option>
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
          style={styles.textBox}
          disabled={loading}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question here..."
        />
        <button style={styles.sendButton} disabled={loading} type="submit">
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
    fontFamily: "Arial, sans-serif",
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
  },
  sendButton: {
    background: "#004aad",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
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
