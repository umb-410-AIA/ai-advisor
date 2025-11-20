import { useAuth } from "@/contexts/AuthContext";
import { FormEventHandler, useCallback, useState, useEffect } from "react";
import Link from 'next/link';
import Head from "next/head";
import { Send, Paperclip, Menu, BookOpen, Award, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

interface CourseSession {
  section: string;
  schedule: string;
  instructor: string;
  location: string;
  classDate: string;
  capacity: string;
  enrolled: string;
  status: string;
}

interface Course {
  id: string;
  name: string;
  semester: string;
  credits: number;
  difficulty?: string;
  prerequisites: string[];
  description?: string;
  sessions?: CourseSession[];
}

interface ChatMessage {
  user: string;
  bot: string;
  visualization?: {
    type: string;
    data: any;
  };
}

interface UserProfile {
  name: string;
  college: string;
  major: string;
  collegeYear: string;
  graduationYear: string;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

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
      return;
    }

    // Check if onboarding is completed
    const onboardingCompleted = localStorage.getItem("onboarding_completed");
    if (!onboardingCompleted) {
      console.log('Onboarding not completed, redirecting...');
      router.push('/onboarding');
      return;
    }

    // Load user profile from localStorage
    const storedProfile = localStorage.getItem("user_profile");
    if (storedProfile) {
      try {
        setUserProfile(JSON.parse(storedProfile));
      } catch (e) {
        console.error("Failed to parse user profile:", e);
      }
    }
  }, [isAuthenticated, router]);

  const sendMessage = useCallback<FormEventHandler>(async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

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

      // Check if response includes visualization data
      if (data.visualizationType && data.data) {
        setChat([...chat, {
          user: input,
          bot: data.reply,
          visualization: {
            type: data.visualizationType,
            data: data.data
          }
        }]);
      } else {
        setChat([...chat, { user: input, bot: data.reply }]);
      }

      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      setChat([...chat, { user: input, bot: 'Error: Failed to get response from server.' }]);
      setInput('');
    } finally {
      setLoading(false);
    }
  }, [input, token, chat]);

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return '#28a745';
      case 'medium': return '#ffc107';
      case 'hard': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const renderVisualization = (visualization: { type: string; data: any }) => {
    if (visualization.type === 'degree_plan') {
      const semesters = visualization.data.semesters || [];
      const notes: string[] = visualization.data.notes || [];

      return (
        <div style={styles.visualizationContainer}>
          <div style={styles.visualizationHeader}>
            <BookOpen size={24} style={{ marginRight: 10 }} />
            <div>
              <h3 style={styles.visualizationTitle}>CS Degree Roadmap (UMass Boston)</h3>
              <p style={styles.visualizationSubtitle}>
                {semesters.length} terms • {semesters.reduce((sum: number, s: any) => sum + (s.totalCredits || 0), 0)} total credits
              </p>
            </div>
            <button
              type="button"
              style={styles.printButton}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof window !== "undefined") window.print();
              }}
              aria-label="Print plan"
            >
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>

          <div style={styles.semesterTimeline}>
            {semesters.map((semester: any, idx: number) => (
              <div key={semester.term} style={styles.semesterBlock}>
                <div style={styles.semesterHeader}>
                  <div style={styles.semesterBadge}>📅 {semester.term}</div>
                  <div style={styles.semesterCredits}>
                    {semester.totalCredits || semester.courses?.reduce((sum: number, c: any) => sum + (c.credits || 0), 0) || 0} Credits
                  </div>
                </div>

                <div style={styles.coursesGrid}>
                  {(semester.courses || []).map((course: any) => (
                    <div key={course.id} style={styles.courseCard}>
                      <div style={styles.courseCardHeader}>
                        <div style={styles.courseIdBadge}>{course.id}</div>
                        <div style={styles.creditsBadge}>{course.credits} CR</div>
                      </div>

                      <div style={styles.courseName}>{course.name}</div>

                      {course.description && (
                        <div style={styles.courseDescription}>
                          {course.description.length > 150 && !expandedDescriptions[course.id]
                            ? course.description.substring(0, 150) + "..."
                            : course.description}
                          {course.description.length > 150 && (
                            <button
                              style={styles.moreButton}
                              onClick={() =>
                                setExpandedDescriptions((prev) => ({
                                  ...prev,
                                  [course.id]: !prev[course.id],
                                }))
                              }
                            >
                              {expandedDescriptions[course.id] ? "Less" : "More"}
                            </button>
                          )}
                        </div>
                      )}

                      {course.prerequisites && course.prerequisites.length > 0 && (
                        <div style={styles.prerequisitesSection}>
                          <strong>📋 Prerequisites:</strong>
                          <div style={styles.prerequisitesList}>
                            {course.prerequisites.map((pr: string, i: number) => (
                              <span key={i} style={styles.prerequisiteTag}>{pr}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {course.sessions && course.sessions.length > 0 && (
                        <div style={styles.sessionsSection}>
                          <div style={styles.sessionsSectionHeader}>
                            🕒 Available Sections ({course.sessions.length})
                          </div>
                          <div style={styles.sessionsList}>
                            {course.sessions.slice(0, 3).map((session: any, i: number) => (
                              <div key={i} style={styles.sessionCard}>
                                <div style={styles.sessionRow}>
                                  <span style={styles.sessionLabel}>Section:</span>
                                  <span style={styles.sessionValue}>{session.section}</span>
                                </div>
                                <div style={styles.sessionRow}>
                                  <span style={styles.sessionLabel}>Time:</span>
                                  <span style={styles.sessionValue}>{session.schedule}</span>
                                </div>
                                <div style={styles.sessionRow}>
                                  <span style={styles.sessionLabel}>Instructor:</span>
                                  <span style={styles.sessionValue}>{session.instructor}</span>
                                </div>
                                <div style={styles.sessionRow}>
                                  <span style={styles.sessionLabel}>Location:</span>
                                  <span style={styles.sessionValue}>{session.location}</span>
                                </div>
                                <div style={styles.sessionRow}>
                                  <span style={styles.sessionLabel}>Dates:</span>
                                  <span style={styles.sessionValue}>{session.classDate}</span>
                                </div>
                                <div style={styles.sessionRow}>
                                  <span style={styles.sessionLabel}>Capacity:</span>
                                  <span style={{
                                    ...styles.sessionValue,
                                    ...styles.capacityBadge,
                                    background: session.status === 'Open' ? '#28a745' : '#dc3545'
                                  }}>
                                    {session.enrolled}/{session.capacity} • {session.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {idx < semesters.length - 1 && (
                  <div style={styles.semesterArrow}>↓</div>
                )}
              </div>
            ))}
          </div>

          {notes.length > 0 && (
            <div style={{ marginTop: 16, padding: 12, background: "#f8f9fa", borderRadius: 8, border: "1px solid #e9ecef" }}>
              <strong>Notes:</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (visualization.type === 'course_path') {
      const courses: Course[] = visualization.data.courses || [];

      // Group courses by semester
      const coursesBySemester: Record<string, Course[]> = {};
      courses.forEach(course => {
        if (!coursesBySemester[course.semester]) {
          coursesBySemester[course.semester] = [];
        }
        coursesBySemester[course.semester].push(course);
      });

      const semesters = Object.keys(coursesBySemester);

      return (
        <div style={styles.visualizationContainer}>
          <div style={styles.visualizationHeader}>
            <BookOpen size={24} style={{ marginRight: 10 }} />
            <div>
              <h3 style={styles.visualizationTitle}>Your Academic Pathway</h3>
              <p style={styles.visualizationSubtitle}>
                {courses.length} courses • {courses.reduce((sum, c) => sum + c.credits, 0)} total credits
              </p>
            </div>
            <button
              style={styles.printButton}
              onClick={() => window.print()}
              aria-label="Print plan"
            >
              <Printer size={16} style={{ marginRight: 6 }} /> Print / Save PDF
            </button>
          </div>

          <div style={styles.semesterTimeline}>
            {semesters.map((semester, semIdx) => (
              <div key={semester} style={styles.semesterBlock}>
                <div style={styles.semesterHeader}>
                  <div style={styles.semesterBadge}>
                    📅 {semester}
                  </div>
                  <div style={styles.semesterCredits}>
                    {coursesBySemester[semester].reduce((sum, c) => sum + c.credits, 0)} Credits
                  </div>
                </div>

                <div style={styles.coursesGrid}>
                  {coursesBySemester[semester].map((course, courseIdx) => (
                    <div key={course.id} style={styles.courseCard}>
                      {/* Course Header */}
                      <div style={styles.courseCardHeader}>
                        <div style={styles.courseIdBadge}>{course.id}</div>
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
                        <div style={styles.creditsBadge}>
                          {course.credits} CR
                        </div>
                      </div>

                      {/* Course Name */}
                      <div style={styles.courseName}>{course.name}</div>

                      {/* Description */}
                      {course.description && (
                        <div style={styles.courseDescription}>
                          {course.description.length > 150 && !expandedDescriptions[course.id]
                            ? course.description.substring(0, 150) + "..."
                            : course.description}
                          {course.description.length > 150 && (
                            <button
                              style={styles.moreButton}
                              onClick={() =>
                                setExpandedDescriptions((prev) => ({
                                  ...prev,
                                  [course.id]: !prev[course.id],
                                }))
                              }
                            >
                              {expandedDescriptions[course.id] ? "Less" : "More"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Prerequisites */}
                      {course.prerequisites && course.prerequisites.length > 0 && (
                        <div style={styles.prerequisitesSection}>
                          <strong>📋 Prerequisites:</strong>
                          <div style={styles.prerequisitesList}>
                            {course.prerequisites.map((prereq, idx) => (
                              <span key={idx} style={styles.prerequisiteTag}>
                                {prereq}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sessions/Sections */}
                      {course.sessions && course.sessions.length > 0 && (
                        <div style={styles.sessionsSection}>
                          <div style={styles.sessionsSectionHeader}>
                            🕒 Available Sections ({course.sessions.length})
                          </div>
                          <div style={styles.sessionsList}>
                            {course.sessions.slice(0, 3).map((session, idx) => (
                              <div key={idx} style={styles.sessionCard}>
                                <div style={styles.sessionRow}>
                                  <span style={styles.sessionLabel}>Section:</span>
                                  <span style={styles.sessionValue}>{session.section}</span>
                                </div>
                                <div style={styles.sessionRow}>
                                  <span style={styles.sessionLabel}>Time:</span>
                                  <span style={styles.sessionValue}>{session.schedule}</span>
                                </div>
                                <div style={styles.sessionRow}>
                                  <span style={styles.sessionLabel}>Instructor:</span>
                                  <span style={styles.sessionValue}>{session.instructor}</span>
                                </div>
                                <div style={styles.sessionRow}>
                                  <span style={styles.sessionLabel}>Location:</span>
                                  <span style={styles.sessionValue}>{session.location}</span>
                                </div>
                                <div style={styles.sessionRow}>
                                  <span style={styles.sessionLabel}>Dates:</span>
                                  <span style={styles.sessionValue}>{session.classDate}</span>
                                </div>
                                <div style={styles.sessionRow}>
                                  <span style={styles.sessionLabel}>Capacity:</span>
                                  <span style={{
                                    ...styles.sessionValue,
                                    ...styles.capacityBadge,
                                    background: session.status === 'Open' ? '#28a745' : '#dc3545'
                                  }}>
                                    {session.enrolled}/{session.capacity} • {session.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {course.sessions.length > 3 && (
                              <div style={styles.moreSessionsText}>
                                + {course.sessions.length - 3} more sections available
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Arrow between semesters */}
                {semIdx < semesters.length - 1 && (
                  <div style={styles.semesterArrow}>↓</div>
                )}
              </div>
            ))}
          </div>

          {/* Summary Footer */}
          <div style={styles.visualizationFooter}>
            <div style={styles.footerStat}>
              <Award size={20} style={{ marginRight: 5 }} />
              <span>Total Credits: {courses.reduce((sum, c) => sum + c.credits, 0)}</span>
            </div>
            <div style={styles.footerStat}>
              <BookOpen size={20} style={{ marginRight: 5 }} />
              <span>Total Courses: {courses.length}</span>
            </div>
            <div style={styles.footerStat}>
              <span>📚</span>
              <span>Semesters: {semesters.length}</span>
            </div>
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

        <select style={styles.universityDropdown} value={userProfile?.college || ""} disabled>
          <option value="">{userProfile?.college || "Select Your University"}</option>
        </select>
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
                  value={userProfile?.name || ""}
                  readOnly
                />
                <input
                  style={styles.sidebarInput}
                  placeholder="Your College"
                  value={userProfile?.college || ""}
                  readOnly
                />
                <input
                  style={styles.sidebarInput}
                  placeholder="Your Major"
                  value={userProfile?.major || ""}
                  readOnly
                />
                <input
                  style={styles.sidebarInput}
                  placeholder="College Year"
                  value={userProfile?.collegeYear || ""}
                  readOnly
                />
                <input
                  style={styles.sidebarInput}
                  placeholder="Graduation Year"
                  value={userProfile?.graduationYear || ""}
                  readOnly
                />
                <Link
                  href="/onboarding"
                  style={styles.editProfileButton}
                  onClick={() => {
                    localStorage.removeItem("onboarding_completed");
                  }}
                >
                  ✏️ Edit Profile
                </Link>
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


      {/* Chat Window */}
      <div style={styles.mainContent}>
        <div style={styles.chatWindow}>
          {chat.length === 0 ? (
            <p style={styles.placeholder}>
              {userProfile ? `Welcome back, ${userProfile.name}! 👋` : "AI-Powered Advisor for University Students"}
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
        <div style={styles.graphWindow}>
          <p>graph will go here</p>
        </div>
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
  },
  editProfileButton: {
    display: "block",
    padding: "15px 20px",
    background: "rgba(255, 255, 255, 0.2)",
    color: "#ffffff",
    textDecoration: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    transition: "all 0.3s ease",
    textAlign: "center",
    marginTop: "20px",
    border: "2px solid rgba(255, 255, 255, 0.4)",
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
    flex: 1,
    padding: "15px",
    paddingLeft: "0px",
    maxWidth: "1100px",
    overflowY: "auto",
    scrollBehavior: "smooth",
    paddingBottom: "90px",
    paddingTop: "100px",
  },
  graphWindow: {
    flex: 1,
    borderLeft: '1px solid #dedede',
    padding: '15px'
  },
  mainContent: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    color: 'black',
    height: 'max-content',
  },
  chatBar: {
    position: "fixed",
    bottom: 70,
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
    zIndex: 1000,
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
    color: "#333",
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
  // Enhanced Visualization Styles
  visualizationContainer: {
    background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
    borderRadius: "16px",
    padding: "25px",
    marginTop: "20px",
    border: "3px solid #004aad",
    boxShadow: "0 4px 20px rgba(0, 74, 173, 0.15)",
  },
  visualizationHeader: {
    display: "flex",
    alignItems: "center",
    color: "#004aad",
    marginBottom: "25px",
    paddingBottom: "15px",
    borderBottom: "3px solid #004aad",
    gap: "10px",
  },
  visualizationTitle: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: "bold",
  },
  visualizationSubtitle: {
    margin: "5px 0 0 0",
    fontSize: "0.9rem",
    color: "#666",
    fontWeight: "normal",
  },
  printButton: {
    marginLeft: "auto",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    background: "#0b6efd",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(11, 110, 253, 0.25)",
  },
  semesterTimeline: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  semesterBlock: {
    marginBottom: "10px",
  },
  semesterHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    padding: "12px 20px",
    background: "linear-gradient(to right, #004aad, #0066cc)",
    borderRadius: "10px",
  },
  semesterBadge: {
    fontSize: "1.1rem",
    fontWeight: "bold",
    color: "#ffffff",
  },
  semesterCredits: {
    fontSize: "0.9rem",
    color: "#ffffff",
    background: "rgba(255, 255, 255, 0.2)",
    padding: "5px 15px",
    borderRadius: "20px",
  },
  coursesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
    gap: "15px",
    marginBottom: "15px",
  },
  courseCard: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 3px 12px rgba(0,0,0,0.12)",
    border: "2px solid #e9ecef",
    transition: "all 0.3s ease",
    position: "relative",
  },
  courseCardHeader: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  courseIdBadge: {
    fontSize: "15px",
    fontWeight: "bold",
    color: "#004aad",
    background: "#e3f2fd",
    padding: "6px 14px",
    borderRadius: "6px",
  },
  difficultyBadge: {
    fontSize: "11px",
    color: "#ffffff",
    padding: "4px 10px",
    borderRadius: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  creditsBadge: {
    fontSize: "12px",
    color: "#004aad",
    background: "#f0f6ff",
    padding: "4px 10px",
    borderRadius: "12px",
    fontWeight: "600",
  },
  courseName: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#222",
    marginBottom: "12px",
    lineHeight: "1.4",
  },
  courseDescription: {
    fontSize: "13px",
    color: "#555",
    lineHeight: "1.5",
    marginBottom: "12px",
    padding: "10px",
    background: "#f8f9fa",
    borderRadius: "6px",
    borderLeft: "3px solid #004aad",
  },
  prerequisitesSection: {
    marginTop: "12px",
    padding: "10px",
    background: "#fff3cd",
    borderRadius: "6px",
    fontSize: "13px",
    borderLeft: "3px solid #ffc107",
  },
  prerequisitesList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "8px",
  },
  prerequisiteTag: {
    background: "#ffffff",
    color: "#856404",
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "500",
    border: "1px solid #ffc107",
  },
  moreButton: {
    marginLeft: 8,
    background: "transparent",
    border: "none",
    color: "#0b6efd",
    cursor: "pointer",
    fontWeight: 600,
  },
  sessionsSection: {
    marginTop: "15px",
    padding: "12px",
    background: "#f0f6ff",
    borderRadius: "8px",
    border: "1px solid #004aad",
  },
  sessionsSectionHeader: {
    fontSize: "13px",
    fontWeight: "bold",
    color: "#004aad",
    marginBottom: "10px",
  },
  sessionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  sessionCard: {
    background: "#ffffff",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #dee2e6",
    fontSize: "12px",
  },
  sessionRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
  },
  sessionLabel: {
    fontWeight: "600",
    color: "#666",
  },
  sessionValue: {
    color: "#333",
    textAlign: "right",
  },
  capacityBadge: {
    color: "#ffffff",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "600",
  },
  moreSessionsText: {
    fontSize: "12px",
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    padding: "8px",
  },
  semesterArrow: {
    textAlign: "center",
    fontSize: "32px",
    color: "#004aad",
    margin: "15px 0",
    fontWeight: "bold",
  },
  visualizationFooter: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: "20px",
    paddingTop: "20px",
    borderTop: "3px solid #dee2e6",
    flexWrap: "wrap",
    gap: "15px",
  },
  footerStat: {
    display: "flex",
    alignItems: "center",
    color: "#004aad",
    fontWeight: "bold",
    fontSize: "15px",
    background: "#ffffff",
    padding: "10px 20px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
};
