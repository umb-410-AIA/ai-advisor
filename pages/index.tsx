import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import { FormEventHandler, useCallback, useEffect, useState } from "react";
import Link from 'next/link';

export default function Home() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<{ user: string; bot: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const { isAuthenticated, token } = useAuth();

  const sendMessage = useCallback<FormEventHandler>(async (e) => {
    if (e) e.preventDefault();

    setLoading(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ message: input }),
    });
    const data = await res.json();

    setChat([...chat, { user: input, bot: data.reply }]);
    setInput('');
    setLoading(false);
  }, [input, token, chat]);

  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated]);

  return (
    <main style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
        <h1>UMB AI Advisor</h1>
        <div style={{ width: 800, background: "#000000", padding: 20, borderRadius: 10 }}>
        <div style={{ height: 600, overflowY: "auto", marginBottom: 10 }}>
          {chat.map((msg, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <b>You:</b>
              <div style={{ whiteSpace: "pre-line" }}>{msg.user}</div>
              <b>Bot:</b>
              <div style={{ whiteSpace: "pre-line" }}>{msg.bot}</div>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} style={{ display: "flex" }}>
          <input
            disabled={loading}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ flex: 1, padding: 8 }}
            placeholder="Ask a question..."
          />
          <button disabled={loading} onClick={sendMessage} style={{ padding: "8px 16px" }}>
          {loading ? '...' : 'Send'}
          </button>
        </form>
      </div>
      <Link href="logout">Log out</Link>
    </main>
  );
}


