import Head from "next/head";
import { useRouter } from 'next/navigation';
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<{ user: string; bot: string }[]>([]);

  async function sendMessage() {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });
    const data = await res.json();
    setChat([...chat, { user: input, bot: data.reply }]);
  }

  const { isAuthenticated } = useAuth();
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
        <div style={{ display: "flex" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ flex: 1, padding: 8 }}
            placeholder="Ask a question..."
          />
          <button onClick={sendMessage} style={{ padding: "8px 16px" }}>
            Send
          </button>
        </div>
      </div>
    </main>
  );
}


