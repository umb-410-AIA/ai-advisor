import { useAuth } from "@/contexts/AuthContext";
import { ChangeEvent, FormEvent, FormEventHandler, useCallback, useState, useEffect } from "react";
import Link from 'next/link';
import Head from "next/head";
import { Send, Paperclip, Menu, BookOpen, Award } from "lucide-react";
import { useRouter } from "next/navigation";


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

export default function Home() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isTextBoxHovered, setIsTextBoxHovered] = useState(false);
  const [isSendButtonHovered, setIsSendButtonHovered] = useState(false);
  const [isFileButtonHovered, setIsFileButtonHovered] = useState(false);
  const [isMenuButtonHovered, setIsMenuButtonHovered] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasSubmittedProfile, setHasSubmittedProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    university: "",
    major: "",
    careerGoal: "",
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const { token, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login...');
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const submitMessage = useCallback(async (message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return false;

    if (!token) {
      console.error('No authentication token found');
      setChat((prev) => [
        ...prev,
        { user: trimmedMessage, bot: 'Error: Please log in to use the chat.' },
      ]);
      return false;
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
        body: JSON.stringify({ message: trimmedMessage }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('API request failed:', res.status, res.statusText, errorData);
        throw new Error(`API request failed: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('API response:', data);

      if (data.visualizationType && data.data) {
        setChat((prev) => [
          ...prev,
          { 
            user: trimmedMessage, 
            bot: data.reply,
            visualization: {
              type: data.visualizationType,
              data: data.data
            }
          }
        ]);
      } else {
        setChat((prev) => [...prev, { user: trimmedMessage, bot: data.reply }]);
      }
      
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      setChat((prev) => [
        ...prev,
        { user: trimmedMessage, bot: 'Error: Failed to get response from server.' }
      ]);
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const sendMessage = useCallback<FormEventHandler>(async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    const success = await submitMessage(input);
    if (success) {
      setInput('');
    }
  }, [input, submitMessage]);

  const handleProfileChange = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profileForm.university || !profileForm.major || !profileForm.careerGoal.trim()) {
      setProfileError('Please answer every question before starting the chat.');
      return;
    }

    setProfileError(null);
    setHasSubmittedProfile(true);
    const initialPayload = JSON.stringify({
      university: profileForm.university,
      major: profileForm.major,
      careerGoal: profileForm.careerGoal.trim(),
    });
    await submitMessage(initialPayload);
  }, [profileForm, submitMessage]);

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return '#28a745';
      case 'medium': return '#ffc107';
      case 'hard': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const renderVisualization = (visualization: { type: string; data: any }) => {
    if (visualization.type === 'course_path') {
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
                        background: getDifficultyColor(course.difficulty)
                      }}
                    >
                      {course.difficulty}
                    </div>
                  )}
                </div>
                
                <div style={styles.courseName}>{course.name}</div>
                
                <div style={styles.courseDetails}>
                  <span style={styles.courseDetailItem}>
                    📅 {course.semester}
                  </span>
                  <span style={styles.courseDetailItem}>
                    📚 {course.credits} credits
                  </span>
                </div>
                
                {course.prerequisites && course.prerequisites.length > 0 && (
                  <div style={styles.prerequisites}>
                    <strong>Prerequisites:</strong> {course.prerequisites.join(', ')}
                  </div>
                )}
                
                {index < courses.length - 1 && (
                  <div style={styles.arrow}>↓</div>
                )}
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
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu size={24} color="#ffffff" />
        </button>
        <h1 style={styles.titleBarHeading}>Intelligent Academic Path Planner</h1>

        {/*
        <select style={styles.universityDropdown}>
          <option value="">Select Your University</option>
          <option>UMass Boston</option>
          <option>MIT</option>
          <option>Harvard University</option>
          <option>Boston University</option>
          <option>Northeastern University</option>
        </select>
          */}
      </div>

      {/* Sidebar Menu */}
      {isMenuOpen && (
        <>
          <div 
            style={styles.overlay}
            onClick={() => setIsMenuOpen(false)}
          />
          <div style={styles.sidebar}>
            <div style={styles.sidebarContent}>
              <h2 style={styles.sidebarTitle}>Profile Settings</h2>
              <div style={styles.sidebarDropdowns}>
                <input 
                  style={styles.sidebarInput} 
                  placeholder="Your Name" 
                />
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
            <Link 
              href="logout" 
              style={styles.sidebarLogout}
            >
              Log out
            </Link>
          </div>
        </>
      )}

      <p style={styles.subtitle}>AI-Powered Advisor for University Students</p>

      {!hasSubmittedProfile ? (
        <div style={styles.introFormContainer}>
          <h2 style={styles.introFormTitle}>Before we begin...</h2>
          <p style={styles.introFormDescription}>
            Tell us a few details so the advisor can offer more relevant guidance.
          </p>
          <form style={styles.introForm} onSubmit={handleProfileSubmit}>
            <div style={styles.introFormGroup}>
              <label style={styles.introFormLabel} htmlFor="university">
                What university do you go to?
              </label>
              <select
                id="university"
                name="university"
                style={styles.introFormSelect}
                value={profileForm.university}
                onChange={handleProfileChange}
              >
                <option value="">Select a university</option>
                <option value="UMass Boston">UMass Boston</option>
                <option value="MIT">MIT</option>
                <option value="Stanford">Stanford</option>
              </select>
            </div>

            <div style={styles.introFormGroup}>
              <label style={styles.introFormLabel} htmlFor="major">
                What is your major?
              </label>
              <select
                id="major"
                name="major"
                style={styles.introFormSelect}
                value={profileForm.major}
                onChange={handleProfileChange}
              >
                <option value="">Select a major</option>
                <option value="CS">CS</option>
                <option value="Finance">Finance</option>
                <option value="Math">Math</option>
                <option value="English">English</option>
              </select>
            </div>

            <div style={styles.introFormGroup}>
              <label style={styles.introFormLabel} htmlFor="careerGoal">
                What kind of career do you want?
              </label>
              <input
                id="careerGoal"
                name="careerGoal"
                style={styles.introFormInput}
                type="text"
                placeholder="e.g., Software Engineer, Investment Banker"
                value={profileForm.careerGoal}
                onChange={handleProfileChange}
              />
            </div>

            {profileError && <p style={styles.introFormError}>{profileError}</p>}

            <button
              style={{
                ...styles.introFormButton,
                ...(loading ? styles.introFormButtonDisabled : {}),
              }}
              type="submit"
              disabled={loading}
            >
              {loading ? "Starting chat..." : "Start chat"}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Chat Window */}
          <div style={styles.chatWindow}>
            {chat.length === 0 ? (
              <p style={styles.placeholder}>
                Loading...
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
                    
                    {/* Render visualization if available */}
                    {msg.visualization && (
                      <div style={{ marginTop: 15 }}>
                        {renderVisualization(msg.visualization)}
                      </div>
                    )}
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
        </>
      )}

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
    // color: "#ffffff",
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
  dropdownSection: {
    padding:"40px",
    position: "fixed",
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
  /*chatContainer: {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  width: "100%",
  maxWidth: "1100px",
  margin: "0 auto",
  background: "#ffffffff",
  borderRadius: "10px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  overflow: "hidden",
  position: "relative",
  //paddingTop: "20px",
},*/
topInputBar: {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  background: "#fff",
  padding: "15px 20px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "10px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  height: "80px", // 👈 define a fixed height
},
chatWindow: {
  flex: 1,
  padding: "15px",
  paddingLeft: "0px",
  maxWidth: "1100px",
  overflowY: "auto",
  scrollBehavior: "smooth",
  paddingBottom: "90px", // 👈 enough space for the input bar
  paddingTop: "100px",
  //position: "fixed",
},
chatBar: {
  position: "fixed",     // stays on the viewport, not inside scroll
  bottom: 70,             // anchored to bottom edge
  left: 0,
  right: 0,
  display: "flex",
  gap: "10px",
  padding: " 0px",
  borderTop: "1px solid #ddd",
  maxWidth: "1100px",
  margin: "0 auto",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,          // makes sure it’s above other content
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
  textBox: {
    flex: 1,
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    fontSize: "14px",
    transition: "all 0.3s ease",
    color: "#ffffffff",
  },
  textBoxHover: {
    border: "2px solid #004aad",
    boxShadow: "0 0 12px rgba(0, 74, 173, 0.5)",
    transform: "translateY(-3px) scale(1.00)",
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
  introFormContainer: {
    marginTop: "140px",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "30px",
    maxWidth: "520px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0, 74, 173, 0.2)",
    border: "1px solid #dbe6ff",
  },
  introFormTitle: {
    margin: 0,
    marginBottom: "10px",
    fontSize: "1.6rem",
    color: "#004aad",
    fontWeight: 700,
  },
  introFormDescription: {
    margin: 0,
    marginBottom: "25px",
    color: "#4b5c79",
    fontSize: "1rem",
  },
  introForm: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  introFormGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  introFormLabel: {
    fontWeight: 600,
    color: "#1c2c4c",
  },
  introFormSelect: {
    color: 'black',
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #c5d4f6",
    fontSize: "15px",
    outline: "none",
    background: "#f8fbff",
  },
  introFormInput: {
    color: 'black',
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #c5d4f6",
    fontSize: "15px",
    outline: "none",
    background: "#f8fbff",
  },
  introFormError: {
    color: "#dc3545",
    fontWeight: 600,
    margin: 0,
  },
  introFormButton: {
    marginTop: "10px",
    padding: "14px 18px",
    borderRadius: "999px",
    border: "none",
    background: "linear-gradient(90deg, #004aad, #0066cc)",
    color: "#ffffff",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  introFormButtonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  // Visualization styles
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
