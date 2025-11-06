import { useCallback, useState } from "react";
import { Send, Paperclip, Menu, BookOpen, GraduationCap, Calendar, User, Sparkles } from "lucide-react";

export default function Home() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<{ user: string; bot: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState({
    name: "",
    major: "",
    year: "",
    semester: "",
    university: ""
  });

  const sendMessage = useCallback(() => {
    if (!input.trim()) return;

    setLoading(true);
    setTimeout(() => {
      setChat([...chat, { 
        user: input, 
        bot: "This is a demo response. In production, this would connect to your API endpoint." 
      }]);
      setInput('');
      setLoading(false);
    }, 1000);
  }, [input, chat]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .chat-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .chat-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .chat-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Animated background blobs */}
      <div style={styles.backgroundContainer}>
        <div style={{...styles.blob, ...styles.blob1}} className="animate-blob"></div>
        <div style={{...styles.blob, ...styles.blob2}} className="animate-blob animation-delay-2000"></div>
        <div style={{...styles.blob, ...styles.blob3}} className="animate-blob animation-delay-4000"></div>
      </div>

      {/* Top Navigation Bar */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={styles.menuButton}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            
          >
            <Menu size={24} color="#4f46e5" />
          </button >
          
          <div style={styles.logoSection}>
            <GraduationCap color="#4f46e5" size={32} />
            <h1 style={styles.logoText}>
              Academic Path Planner
            </h1>
          </div>

          <select 
            value={userInfo.university}
            onChange={(e) => setUserInfo({...userInfo, university: e.target.value})}
            style={styles.universitySelect}
          >
            <option value="">Select University</option>
            <option>UMass Boston</option>
            <option>MIT</option>
            <option>Harvard University</option>
            <option>Boston University</option>
            <option>Northeastern University</option>
          </select>
        </div>
      </nav>

      {/* Sidebar */}
      <div style={{
        ...styles.sidebar,
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
      }}>
        <div style={styles.sidebarContent}>
          <h2 style={styles.sidebarTitle}>
            <User size={24} color="#4f46e5" />
            <span style={{marginLeft: '8px'}}>Your Profile</span>
          </h2>
          
          <div style={styles.sidebarFields}>
            <div>
              <label style={styles.label}>Name</label>
              <input
                type="text"
                value={userInfo.name}
                onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                style={styles.sidebarInput}
                placeholder="Your Name"
              />
            </div>

            <div>
              <label style={styles.label}>Major</label>
              <select 
                value={userInfo.major}
                onChange={(e) => setUserInfo({...userInfo, major: e.target.value})}
                style={styles.sidebarInput}
              >
                <option value="">Select Major</option>
                <option>Computer Science</option>
                <option>Mathematics</option>
                <option>Engineering</option>
                <option>Biology</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>College Year</label>
              <select 
                value={userInfo.year}
                onChange={(e) => setUserInfo({...userInfo, year: e.target.value})}
                style={styles.sidebarInput}
              >
                <option value="">Select Year</option>
                <option>Freshman</option>
                <option>Sophomore</option>
                <option>Junior</option>
                <option>Senior</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Semester</label>
              <select 
                value={userInfo.semester}
                onChange={(e) => setUserInfo({...userInfo, semester: e.target.value})}
                style={styles.sidebarInput}
              >
                <option value="">Select Semester</option>
                <option>Fall 2025</option>
                <option>Spring 2026</option>
                <option>Summer 2026</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay when sidebar is open */}
      {isSidebarOpen && (
        <div 
          
          style={styles.overlay}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Hero Section */}
        <div style={styles.heroSection}>
          <div style={styles.badge}>
            <Sparkles size={16} />
            <span style={{marginLeft: '8px'}}>AI-Powered Academic Advisor</span>
          </div>
          <h2 style={styles.heroTitle}>
            Plan Your Academic Journey
          </h2>
          <p style={styles.heroSubtitle}>
            Get personalized course recommendations, track your progress, and navigate your path to graduation with confidence.
          </p>
        </div>

       {/* Chat Window */}
        <div style={styles.chatContainer}>
          <div style={styles.chatHeader}>
            <h3 style={styles.chatHeaderTitle}>
              <Sparkles size={20} />
              <span style={{marginLeft: '8px'}}>Chat with Your AI Advisor</span>
            </h3>
          </div>
          
          <div style={styles.chatWindow} className="chat-scroll">
            {chat.length === 0 ? (
              <div style={styles.emptyChat}>
                <div style={styles.emptyChatIcon}>
                  <BookOpen color="#4f46e5" size={32} />
                </div>
                <h4 style={styles.emptyChatTitle}>Ready to start planning?</h4>
                <p style={styles.emptyChatText}>
                  Ask me anything about courses, requirements, prerequisites, or your academic path. I'm here to help!
                </p>
              </div>
            ) : (
              <div style={styles.chatMessages}>
                {chat.map((msg, i) => (
                  <div key={i} style={styles.messageGroup}>
                    <div style={styles.userMessageContainer}>
                      <div style={styles.userMessage}>
                        <p style={styles.messageText}>{msg.user}</p>
                      </div>
                    </div>
                    <div style={styles.botMessageContainer}>
                      <div style={styles.botMessage}>
                        <p style={styles.messageText}>{msg.bot}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div style={styles.inputContainer}>
          <div style={styles.inputWrapper}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              placeholder="Ask about courses, requirements, or your academic path..."
              style={styles.textInput}
            />
            
            <label 
              htmlFor="file-upload" 
              style={styles.fileButton}
            >
              <Paperclip size={18} />
              {selectedFiles && selectedFiles.length > 0 && (
                <span style={{marginLeft: '4px'}}>{selectedFiles.length}</span>
              )}
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(e.target.files)}
              style={{display: 'none'}}
            />
            
            <button
              onClick={sendMessage}
              disabled={loading}
              style={{
                ...styles.sendButton,
                opacity: loading ? 0.5 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (
                <>Processing...</>
              ) : (
                <>
                  <Send size={18} />
                  <span style={{marginLeft: '8px'}}>Send</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>© {new Date().getFullYear()} UMass Boston | Intelligent Academic Path Planner</p>
          <button style={styles.logoutButton}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #e9d5ff 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundContainer: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  blob: {
    position: 'absolute',
    borderRadius: '50%',
    mixBlendMode: 'multiply',
    filter: 'blur(40px)',
    opacity: 0.3,
    width: '288px',
    height: '288px',
  },
  blob1: {
    background: '#93c5fd',
    top: '80px',
    left: '40px',
  },
  blob2: {
    background: '#c4b5fd',
    top: '160px',
    right: '40px',
  },
  blob3: {
    background: '#f9a8d4',
    bottom: '-32px',
    left: '80px',
  },
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
  },
  navContent: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    padding: '8px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
  },
  universitySelect: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '2px solid #c7d2fe',
    background: 'rgba(255, 255, 255, 0.8)',
    fontSize: '14px',
    transition: 'all 0.3s',
    outline: 'none',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100%',
    width: '320px',
    background: 'white',
    boxShadow: '2px 0 20px rgba(0, 0, 0, 0.1)',
    zIndex: 40,
    transition: 'transform 0.3s',
  },
  sidebarContent: {
    padding: '24px',
    marginTop: '80px',
  },
  sidebarTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
  },
  sidebarFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
  },
  sidebarInput: {
    width: '100%',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    fontSize: '14px',
    transition: 'all 0.3s',
    outline: 'none',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(2px)',
    zIndex: 30,
  },
  mainContent: {
    position: 'relative',
    zIndex: 10,
    paddingTop: '96px',
    paddingLeft: '24px',
    paddingRight: '24px',
    paddingBottom: '48px',
    maxWidth: '1280px',
    margin: '0 auto',
  },
  heroSection: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '9999px',
    background: '#e0e7ff',
    color: '#4338ca',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '16px',
  },
  heroTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '16px',
    marginTop: 0,
  },
  heroSubtitle: {
    fontSize: '18px',
    color: '#6b7280',
    maxWidth: '672px',
    margin: '0 auto',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '48px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  cardLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '12px',
  },
  cardInput: {
    width: '100%',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    fontSize: '14px',
    background: 'rgba(255, 255, 255, 0.8)',
    transition: 'all 0.3s',
    outline: 'none',
  },
  chatContainer: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  chatHeader: {
    background: 'linear-gradient(135deg, #6366f1 0%, #9333ea 100%)',
    padding: '16px 24px',
  },
  chatHeaderTitle: {
    color: 'white',
    fontWeight: '600',
    fontSize: '16px',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  chatWindow: {
    height: '384px',
    overflowY: 'auto',
    padding: '24px',
    background: 'rgba(255, 255, 255, 0.5)',
  },
  emptyChat: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  emptyChatIcon: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  emptyChatTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  emptyChatText: {
    color: '#6b7280',
    maxWidth: '448px',
    margin: 0,
  },
  chatMessages: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  messageGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userMessageContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  userMessage: {
    background: 'linear-gradient(135deg, #6366f1 0%, #9333ea 100%)',
    color: 'white',
    borderRadius: '16px',
    borderTopRightRadius: '4px',
    padding: '12px 20px',
    maxWidth: '448px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.3s',
  },
  botMessageContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  botMessage: {
    background: 'white',
    borderRadius: '16px',
    borderTopLeftRadius: '4px',
    padding: '12px 20px',
    maxWidth: '448px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f3f4f6',
    transition: 'transform 0.3s',
  },
  messageText: {
    fontSize: '14px',
    margin: 0,
    lineHeight: '1.5',
  },
  inputContainer: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '16px',
    padding: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  inputWrapper: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    padding: '12px 20px',
    borderRadius: '12px',
    border: '2px solid transparent',
    fontSize: '14px',
    background: 'rgba(255, 255, 255, 0.8)',
    transition: 'all 0.3s',
    outline: 'none',
  },
  fileButton: {
    padding: '12px 16px',
    background: '#f3f4f6',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    border: 'none',
  },
  sendButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #6366f1 0%, #9333ea 100%)',
    color: 'white',
    borderRadius: '12px',
    fontWeight: '500',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    border: 'none',
    fontSize: '14px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '32px',
    fontSize: '14px',
    color: '#9ca3af',
  },
  footerText: {
    margin: 0,
  },
  logoutButton: {
    color: '#6366f1',
    fontWeight: '500',
    marginTop: '8px',
    transition: 'color 0.3s',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
  },
};