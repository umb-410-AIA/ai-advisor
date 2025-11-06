import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchChatMessages } from "@/utils/chats";
import { FormEventHandler, useCallback, useEffect, useState } from "react";
import { Send, Paperclip, Menu, BookOpen, Award } from "lucide-react";

interface Course {
  id: string;
  name: string;
  semester: string;
  credits: number;
  difficulty?: string;
  prerequisites: string[];
}

interface ChatMessage {
  user: string;
  bot: string;
  visualization?: {
    type: string;
    data: any;
  };
}

interface AssistantPayload {
  reply: string;
  visualizationType?: string;
  visualizationData?: any;
}

interface ChatPageProps {
  chatId: string;
  initialChat: ChatMessage[];
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseAssistantMessage(raw: string): AssistantPayload {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.reply === "string") {
      return parsed;
    }
  } catch (err) {
    // Fall back to treating the message as plain text.
  }
  return { reply: raw };
}

function buildChatHistory(rows: any[]): ChatMessage[] {
  const chat: ChatMessage[] = [];
  let pendingUser: string | null = null;

  for (const row of rows) {
    if (row.role === "system") {
      continue;
    }

    if (row.role === "user") {
      if (pendingUser) {
        chat.push({ user: pendingUser, bot: "" });
      }
      pendingUser = row.message;
      continue;
    }

    if (row.role === "assistant") {
      const { reply, visualizationType, visualizationData } = parseAssistantMessage(row.message);
      const visualization = visualizationType && visualizationData
        ? { type: visualizationType, data: visualizationData }
        : undefined;

      if (pendingUser) {
        chat.push({
          user: pendingUser,
          bot: reply,
          ...(visualization ? { visualization } : {}),
        });
        pendingUser = null;
      } else {
        chat.push({
          user: "",
          bot: reply,
          ...(visualization ? { visualization } : {}),
        });
      }
    }
  }

  if (pendingUser) {
    chat.push({ user: pendingUser, bot: "" });
  }

  return chat;
}

export default function ChatPage({ chatId, initialChat }: ChatPageProps) {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>(initialChat);
  const [loading, setLoading] = useState<boolean>(false);
  const [isTextBoxHovered, setIsTextBoxHovered] = useState(false);
  const [isSendButtonHovered, setIsSendButtonHovered] = useState(false);
  const [isFileButtonHovered, setIsFileButtonHovered] = useState(false);
  const [isMenuButtonHovered, setIsMenuButtonHovered] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const { token, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // if (!isAuthenticated) {
    //   router.push("/login");
    // }
  }, [isAuthenticated, router]);

  useEffect(() => {
    setChat(initialChat);
  }, [initialChat]);

  const sendMessage = useCallback<FormEventHandler>(
    async (e) => {
      if (e) e.preventDefault();
      if (!input.trim()) return;

      if (!token) {
        setChat((prev) => [
          ...prev,
          { user: input, bot: "Error: Please log in to use the chat." },
        ]);
        setInput("");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: input, chatId }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            `API request failed: ${res.status} ${res.statusText} ${JSON.stringify(errorData)}`
          );
        }

        const data = await res.json();

        setChat((prev) => [
          ...prev,
          data.visualizationType && data.data
            ? {
                user: input,
                bot: data.reply,
                visualization: {
                  type: data.visualizationType,
                  data: data.data,
                },
              }
            : { user: input, bot: data.reply },
        ]);

        setInput("");
      } catch (error) {
        console.error("Error sending message:", error);
        setChat((prev) => [
          ...prev,
          { user: input, bot: "Error: Failed to get response from server." },
        ]);
        setInput("");
      } finally {
        setLoading(false);
      }
    },
    [input, token, chatId]
  );

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "#28a745";
      case "medium":
        return "#ffc107";
      case "hard":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const renderVisualization = (visualization: { type: string; data: any }) => {
    if (visualization.type === "course_path") {
      const courses: Course[] = visualization.data.courses || [];

      return (
        <div style={styles.visualizationContainer}>
          <div style={styles.visualizationHeader}>
            <BookOpen size={20} style={{ marginRight: 8 }} />
            <h3 style={styles.visualizationTitle}>Your Course Pathway</h3>
          </div>

          <div style={styles.coursePathway}>
            {courses.map((course, index) => (
              <div key={course.id} style={styles.courseCard}>
                <div style={styles.courseCardHeader}>
                  <div style={styles.courseId}>{course.id}</div>
                  {course.difficulty && (
                    <div
                      style={{
                        ...styles.difficultyBadge,
                        background: getDifficultyColor(course.difficulty),
                      }}
                    >
                      {course.difficulty}
                    </div>
                  )}
                </div>

                <div style={styles.courseName}>{course.name}</div>

                <div style={styles.courseDetails}>
                  <span style={styles.courseDetailItem}>📅 {course.semester}</span>
                  <span style={styles.courseDetailItem}>📚 {course.credits} credits</span>
                </div>

                {course.prerequisites && course.prerequisites.length > 0 && (
                  <div style={styles.prerequisites}>
                    <strong>Prerequisites:</strong> {course.prerequisites.join(", ")}
                  </div>
                )}

                {index < courses.length - 1 && <div style={styles.arrow}>↓</div>}
              </div>
            ))}
          </div>

          <div style={styles.visualizationFooter}>
            <Award size={16} style={{ marginRight: 5 }} />
            Total Credits: {courses.reduce((sum, c) => sum + c.credits, 0)}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={styles.page}>
      <Head>
        <title>Intelligent Academic Path Planner</title>
        <style>{`
          input::placeholder {
            color: #999999 !important;
            opacity: 0.9;
          }
          @keyframes slideIn {
            from {
              transform: translateX(-100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}</style>
      </Head>

      <div style={styles.titleBar}>
        <button
          style={{
            ...styles.menuButton,
            ...(isMenuButtonHovered
              ? {
                  ...styles.menuButtonHover,
                  background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.35))`,
                }
              : {}),
          }}
          onMouseEnter={() => setIsMenuButtonHovered(true)}
          onMouseLeave={() => setIsMenuButtonHovered(false)}
          onMouseMove={handleMouseMove}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
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

      {isMenuOpen && (
        <>
          <div style={styles.overlay} onClick={() => setIsMenuOpen(false)} />
          <div style={styles.sidebar}>
            <div style={styles.sidebarContent}>
              <h2 style={styles.sidebarTitle}>Profile Settings</h2>
              <div style={styles.sidebarDropdowns}>
                <input style={styles.sidebarInput} placeholder="Your Name" />
                <select style={styles.sidebarInput}>
                  <option value="">Select your Major</option>
                  <option>Computer Science</option>
                  <option>Mathematics</option>
                  <option>Engineering</option>
                  <option>Biology</option>
                </select>
                <select style={styles.sidebarInput}>
                  <option value="">College Year</option>
                  <option>Freshman</option>
                  <option>Sophomore</option>
                  <option>Junior</option>
                  <option>Senior</option>
                </select>
                <select style={styles.sidebarInput}>
                  <option value="">Semester & Year</option>
                  <option>Fall 2025</option>
                  <option>Spring 2026</option>
                  <option>Summer 2026</option>
                </select>
              </div>
            </div>
            <Link href="logout" style={styles.sidebarLogout}>
              Log out
            </Link>
          </div>
        </>
      )}

      <p style={styles.subtitle}>AI-Powered Advisor for University Students</p>

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

                {msg.visualization && (
                  <div style={{ marginTop: 15 }}>{renderVisualization(msg.visualization)}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

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

        <label
          htmlFor="file-upload"
          style={{
            ...styles.fileUploadButton,
            ...(isFileButtonHovered
              ? {
                  ...styles.fileUploadButtonHover,
                  background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, #e8edf2, #7a8388)`,
                }
              : {}),
          }}
          onMouseEnter={() => setIsFileButtonHovered(true)}
          onMouseLeave={() => setIsFileButtonHovered(false)}
          onMouseMove={handleMouseMove as any}
        >
          <Paperclip size={16} style={{ marginRight: 5 }} />
          {selectedFiles && selectedFiles.length > 0
            ? `${selectedFiles.length} file(s)`
            : "Attach"}
        </label>
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={(e) => setSelectedFiles(e.target.files)}
          style={{ display: "none" }}
        />

        <button
          style={{
            ...styles.sendButton,
            ...(isSendButtonHovered
              ? {
                  ...styles.sendButtonHover,
                  background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, #99ccff, #1a75d9)`,
                }
              : {}),
          }}
          disabled={loading}
          type="submit"
          onMouseEnter={() => setIsSendButtonHovered(true)}
          onMouseLeave={() => setIsSendButtonHovered(false)}
          onMouseMove={handleMouseMove}
        >
          <Send size={16} style={{ marginRight: 5 }} />
          {loading ? "..." : "Send"}
        </button>
      </form>

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
    paddingTop: "100px",
    paddingBottom: "60px",
    fontFamily: "Arial, sans-serif",
    position: "relative",
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
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: 1500,
  },
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "280px",
    height: "100vh",
    background: "linear-gradient(to bottom, #006effff, #0066cc)",
    boxShadow: "2px 0 15px rgba(0,0,0,0.3)",
    zIndex: 2000,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    animation: "slideIn 0.3s ease",
  },
  sidebarContent: {
    padding: "30px 20px",
    flex: 1,
  },
  sidebarTitle: {
    color: "#ffffff",
    fontSize: "1.5rem",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  sidebarDropdowns: {
    display: "flex",
    flexDirection: "column",
    paddingTop: "20px",
    gap: "15px",
  },
  sidebarInput: {
    padding: "15px 20px",
    border: "2px solid rgba(0, 0, 0, 1)",
    borderRadius: "8px",
    background: "rgba(0, 0, 0, 0.1)",
    fontSize: "14px",
    color: "#ffffff",
    width: "100%",
    outline: "none",
    transition: "all 0.3s ease",
    "&::placeholder": {
      color: "rgba(255, 255, 255, 0.7)",
    },
    "&:focus": {
      border: "2px solid rgba(255, 255, 255, 0.6)",
      background: "rgba(255, 255, 255, 0.2)",
    },
    "&:hover": {
      border: "2px solid rgba(255, 255, 255, 0.5)",
    },
    marginBottom: "20px",
    borderBottom: "2px solid rgba(255, 255, 255, 0.3)",
    paddingBottom: "15px",
  },
  sidebarLogout: {
    display: "block",
    padding: "15px 20px",
    background: "rgba(255, 255, 255, 0.1)",
    color: "#ffffff",
    textDecoration: "none",
    borderTop: "1px solid rgba(255, 255, 255, 0.2)",
    fontSize: "16px",
    fontWeight: "500",
    transition: "all 0.3s ease",
    textAlign: "center",
  },
  subtitle: {
    position: "fixed",
    color: "#555",
    fontSize: "1.3rem",
    marginBottom: 30,
  },
  chatWindow: {
    color: "black",
    width: "100%",
    maxWidth: "800px",
    minHeight: "60vh",
    background: "#ffffff",
    borderRadius: "15px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
    padding: "30px",
    marginTop: "120px",
    marginBottom: "30px",
    overflowY: "auto",
    border: "1px solid #e0e7ff",
  },
  placeholder: {
    color: "#8f9bb3",
    fontSize: "1.1rem",
    textAlign: "center",
  },
  chatMessage: {
    background: "#f8faff",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "15px",
    border: "1px solid #e1e8ff",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.1)",
  },
  chatBar: {
    width: "100%",
    maxWidth: "800px",
    display: "flex",
    background: "#ffffff",
    borderRadius: "15px",
    padding: "15px",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e0e7ff",
    gap: "10px",
  },
  textBox: {
    flexGrow: 1,
    padding: "12px 18px",
    border: "2px solid #dbe2ff",
    borderRadius: "12px",
    outline: "none",
    fontSize: "16px",
    transition: "all 0.3s ease",
  },
  textBoxHover: {
    border: "2px solid #1a75d9",
    boxShadow: "0 10px 20px rgba(26, 117, 217, 0.15)",
  },
  fileUploadButton: {
    background: "#e7ecff",
    color: "#1a75d9",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  fileUploadButtonHover: {
    background: "#d0d9ff",
    color: "#1a4ad9",
    boxShadow: "0 6px 18px rgba(26, 117, 217, 0.4)",
    transform: "translateY(-2px)",
  },
  sendButton: {
    background: "#1a75d9",
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
  footer: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "linear-gradient(to right, #004aad, #0066cc)",
    color: "#ffffff",
    fontSize: "14px",
    padding: "15px 20px",
    textAlign: "center",
    boxShadow: "0 -2px 10px rgba(0,0,0,0.15)",
    zIndex: 1000,
  },
  visualizationContainer: {
    background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
    borderRadius: "12px",
    padding: "20px",
    marginTop: "15px",
    border: "2px solid #004aad",
  },
  visualizationHeader: {
    display: "flex",
    alignItems: "center",
    color: "#004aad",
    marginBottom: "20px",
    paddingBottom: "10px",
    borderBottom: "2px solid #004aad",
  },
  visualizationTitle: {
    margin: 0,
    fontSize: "1.2rem",
    fontWeight: "bold",
  },
  coursePathway: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  courseCard: {
    background: "#ffffff",
    borderRadius: "8px",
    padding: "15px",
    marginBottom: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "1px solid #dee2e6",
    position: "relative",
  },
  courseCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  courseId: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#004aad",
    background: "#e3f2fd",
    padding: "4px 12px",
    borderRadius: "4px",
  },
  difficultyBadge: {
    fontSize: "12px",
    color: "#ffffff",
    padding: "4px 10px",
    borderRadius: "12px",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  courseName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#333",
    marginBottom: "10px",
  },
  courseDetails: {
    display: "flex",
    gap: "15px",
    fontSize: "13px",
    color: "#666",
    marginBottom: "8px",
  },
  courseDetailItem: {
    display: "flex",
    alignItems: "center",
  },
  prerequisites: {
    fontSize: "12px",
    color: "#666",
    fontStyle: "italic",
    marginTop: "8px",
    paddingTop: "8px",
    borderTop: "1px solid #e9ecef",
  },
  arrow: {
    textAlign: "center",
    fontSize: "24px",
    color: "#004aad",
    margin: "5px 0",
  },
  visualizationFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "15px",
    paddingTop: "15px",
    borderTop: "2px solid #dee2e6",
    color: "#004aad",
    fontWeight: "bold",
    fontSize: "14px",
  },
};

export const getServerSideProps: GetServerSideProps<ChatPageProps> = async (context) => {
  const slug = context.params?.chat;
  const chatId = typeof slug === "string" ? slug : Array.isArray(slug) ? slug[0] : "";

  if (!chatId || !isValidUuid(chatId)) {
    console.log({chatId, isValid: isValidUuid(chatId)})
    return { notFound: true };
  }

  try {
    const rows = await fetchChatMessages(chatId);
    const initialChat = buildChatHistory(rows ?? []);

    return {
      props: {
        chatId,
        initialChat,
      },
    };
  } catch (error) {
    console.error("Error loading chat history", error);
    return { notFound: true };
  }
};
