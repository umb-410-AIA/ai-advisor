import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { useAuth } from "@/contexts/AuthContext";

type OnboardingStep = 
  | "welcome"
  | "name"
  | "college"
  | "major"
  | "year"
  | "graduation"
  | "complete";

interface UserProfile {
  name: string;
  college: string;
  major: string;
  collegeYear: string;
  graduationYear: string;
}

const COLLEGE_YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];
const GRADUATION_YEARS = ["2025", "2026", "2027", "2028", "2029", "2030"];
const GRADUATION_SEMESTERS = ["Spring", "Summer", "Fall", "Winter"];
const MAJORS = ["Computer Science", "Biology", "Mathematics", "Physics"];

export default function Onboarding() {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    college: "",
    major: "",
    collegeYear: "",
    graduationYear: "",
  });
  const [input, setInput] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "bot" | "user"; text: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const hasShownMessage = useRef<Record<string, boolean>>({});
  
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Initial welcome message
  useEffect(() => {
    if (step === "welcome" && !hasShownMessage.current["welcome"]) {
      hasShownMessage.current["welcome"] = true;
      setTimeout(() => {
        addBotMessage("Hello! I'm your personalized AI bot to help you get started with your career. Let's set up your profile together! 🎓");
        setTimeout(() => {
          setStep("name");
        }, 2000);
      }, 500);
    }
  }, [step]);

  // Handle step messages
  useEffect(() => {
    if (hasShownMessage.current[step]) return;
    
    hasShownMessage.current[step] = true;
    
    if (step === "name") {
      addBotMessage("First, what's your name? I'd love to know what to call you! 😊");
    } else if (step === "college") {
      addBotMessage(`Great to meet you, ${profile.name}! Which university are you attending?`);
    } else if (step === "major") {
      addBotMessage("What's your preferred major or field of study?");
    } else if (step === "year") {
      addBotMessage("What year are you currently in?");
    } else if (step === "graduation") {
      addBotMessage("Finally, when do you expect to graduate? Select the semester and year.");
    }
  }, [step, profile.name]);

  const addBotMessage = (text: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setChatHistory(prev => [...prev, { role: "bot", text }]);
      setIsTyping(false);
    }, 800);
  };

  const addUserMessage = (text: string) => {
    setChatHistory(prev => [...prev, { role: "user", text }]);
  };

  const handleOptionClick = async (value: string) => {
    addUserMessage(value);

    switch (step) {
      case "college":
        setProfile(prev => ({ ...prev, college: value }));
        setTimeout(() => setStep("major"), 1000);
        break;
      case "major":
        setProfile(prev => ({ ...prev, major: value }));
        setTimeout(() => setStep("year"), 1000);
        break;
      case "year":
        setProfile(prev => ({ ...prev, collegeYear: value }));
        setTimeout(() => setStep("graduation"), 1000);
        break;
    }
  };

  const handleGraduationSubmit = async () => {
    if (!selectedSemester || !selectedYear) return;

    const graduationText = `${selectedSemester} ${selectedYear}`;
    addUserMessage(graduationText);

    const updatedProfile = { 
      ...profile, 
      graduationYear: graduationText 
    };
    setProfile(updatedProfile);
    setStep("complete");
    
    try {
      await fetch("/api/user-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatedProfile),
      });
      
      addBotMessage(`Perfect! Your profile is all set up, ${profile.name}! 🎉 Redirecting you to the dashboard...`);
      
      localStorage.setItem("onboarding_completed", "true");
      localStorage.setItem("user_profile", JSON.stringify(updatedProfile));
      
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      addBotMessage("There was an error saving your profile. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userInput = input.trim();
    addUserMessage(userInput);
    setInput("");

    if (step === "name") {
      setProfile(prev => ({ ...prev, name: userInput }));
      setTimeout(() => setStep("college"), 1000);
    }
  };

  const showTextInput = step === "name";
  const showOptions = step === "college" || step === "major" || step === "year" || step === "graduation";

  return (
    <div style={styles.container}>
      <Head>
        <title>Welcome - Setup Your Profile</title>
      </Head>

      <div style={styles.chatContainer}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>Profile Setup</h1>
          <p style={styles.headerSubtitle}>Let's get to know you better</p>
        </div>

        <div style={styles.chatWindow}>
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              style={{
                ...styles.message,
                ...(msg.role === "bot" ? styles.botMessage : styles.userMessage),
              }}
            >
              <div style={{
                ...styles.messageContent,
                ...(msg.role === "bot" ? styles.botMessageContent : styles.userMessageContent),
              }}>
                {msg.role === "bot" && <span style={styles.botIcon}>🤖</span>}
                <span>{msg.text}</span>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div style={{ ...styles.message, ...styles.botMessage }}>
              <div style={{ ...styles.messageContent, ...styles.botMessageContent }}>
                <span style={styles.botIcon}>🤖</span>
                <span style={styles.typingIndicator}>
                  <span style={styles.dot}>●</span>
                  <span style={styles.dot}>●</span>
                  <span style={styles.dot}>●</span>
                </span>
              </div>
            </div>
          )}

          {/* Option Buttons */}
          {!isTyping && step === "college" && (
            <div style={styles.optionsContainer}>
              <button
                style={styles.optionButton}
                onClick={() => handleOptionClick("UMass Boston")}
              >
                🎓 UMass Boston
              </button>
            </div>
          )}

          {!isTyping && step === "major" && (
            <div style={styles.optionsContainer}>
              {MAJORS.map(major => (
                <button
                  key={major}
                  style={styles.optionButton}
                  onClick={() => handleOptionClick(major)}
                >
                  📖 {major}
                </button>
              ))}
            </div>
          )}

          {!isTyping && step === "year" && (
            <div style={styles.optionsContainer}>
              {COLLEGE_YEARS.map(year => (
                <button
                  key={year}
                  style={styles.optionButton}
                  onClick={() => handleOptionClick(year)}
                >
                  📚 {year}
                </button>
              ))}
            </div>
          )}

          {!isTyping && step === "graduation" && (
            <div style={styles.graduationContainer}>
              <div style={styles.graduationSection}>
                <label style={styles.graduationLabel}>Semester:</label>
                <select 
                  style={styles.dropdown}
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                >
                  <option value="">Select Semester</option>
                  {GRADUATION_SEMESTERS.map(semester => (
                    <option key={semester} value={semester}>{semester}</option>
                  ))}
                </select>
              </div>

              <div style={styles.graduationSection}>
                <label style={styles.graduationLabel}>Year:</label>
                <select 
                  style={styles.dropdown}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="">Select Year</option>
                  {GRADUATION_YEARS.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <button
                style={{
                  ...styles.confirmButton,
                  ...((!selectedSemester || !selectedYear) ? styles.confirmButtonDisabled : {})
                }}
                onClick={handleGraduationSubmit}
                disabled={!selectedSemester || !selectedYear}
              >
                ✓ Confirm Graduation Date
              </button>
            </div>
          )}
        </div>

        {/* Text Input for Name only */}
        {showTextInput && (
          <form onSubmit={handleSubmit} style={styles.inputForm}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer here..."
              style={styles.input}
              disabled={isTyping}
              autoFocus
            />
            <button
              type="submit"
              style={{
                ...styles.button,
                ...(isTyping || !input.trim() ? styles.buttonDisabled : {})
              }}
              disabled={isTyping || !input.trim()}
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  chatContainer: {
    width: "100%",
    maxWidth: "700px",
    height: "85vh",
    background: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    background: "linear-gradient(to right, #004aad, #0066cc)",
    color: "#ffffff",
    padding: "25px 30px",
    textAlign: "center",
  },
  headerTitle: {
    margin: 0,
    fontSize: "1.8rem",
    fontWeight: "bold",
  },
  headerSubtitle: {
    margin: "5px 0 0 0",
    fontSize: "1rem",
    opacity: 0.9,
  },
  chatWindow: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  message: {
    display: "flex",
    marginBottom: "10px",
  },
  botMessage: {
    justifyContent: "flex-start",
  },
  userMessage: {
    justifyContent: "flex-end",
  },
  messageContent: {
    maxWidth: "80%",
    padding: "12px 18px",
    borderRadius: "18px",
    fontSize: "15px",
    lineHeight: "1.4",
    wordWrap: "break-word",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  botMessageContent: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#ffffff",
  },
  userMessageContent: {
    background: "#f1f3f5",
    color: "#333",
  },
  botIcon: {
    fontSize: "20px",
  },
  optionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "10px",
  },
  optionButton: {
    padding: "15px 20px",
    background: "#ffffff",
    border: "2px solid #004aad",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "500",
    color: "#004aad",
    cursor: "pointer",
    transition: "all 0.3s ease",
    textAlign: "left",
  },
  graduationContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    marginTop: "10px",
    padding: "15px",
    background: "#f8f9fa",
    borderRadius: "12px",
  },
  graduationSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  graduationLabel: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "5px",
  },
  dropdown: {
    padding: "12px 15px",
    background: "#ffffff",
    border: "2px solid #dee2e6",
    borderRadius: "8px",
    fontSize: "15px",
    cursor: "pointer",
    outline: "none",
    transition: "all 0.2s ease",
    width: "100%",
  },
  confirmButton: {
    padding: "12px 20px",
    background: "linear-gradient(to right, #004aad, #0066cc)",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  confirmButtonDisabled: {
    background: "#ccc",
    cursor: "not-allowed",
    opacity: 0.6,
  },
  inputForm: {
    display: "flex",
    padding: "20px",
    borderTop: "1px solid #e0e0e0",
    background: "#f8f9fa",
    gap: "10px",
  },
  input: {
    flex: 1,
    padding: "12px 18px",
    border: "2px solid #e0e0e0",
    borderRadius: "25px",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.3s ease",
  },
  button: {
    padding: "12px 30px",
    background: "linear-gradient(to right, #004aad, #0066cc)",
    color: "#ffffff",
    border: "none",
    borderRadius: "25px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  buttonDisabled: {
    background: "#ccc",
    cursor: "not-allowed",
    opacity: 0.6,
  },
  typingIndicator: {
    display: "flex",
    gap: "4px",
  },
  dot: {
    fontSize: "8px",
    animation: "blink 1.4s infinite",
  },
};