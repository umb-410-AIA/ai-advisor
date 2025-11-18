import { useState, useEffect } from "react";
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
  const [chatHistory, setChatHistory] = useState<Array<{ role: "bot" | "user"; text: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Show welcome message when component mounts
    if (step === "welcome") {
      setTimeout(() => {
        addBotMessage("Hello! I'm your personalized AI bot to help you get started with your career. Let's set up your profile together! 🎓");
        setTimeout(() => {
          setStep("name");
        }, 2000);
      }, 500);
    }
  }, []);

  useEffect(() => {
    // Handle step transitions and bot messages
    if (step === "name") {
      addBotMessage("First, what's your name? I'd love to know what to call you! 😊");
    } else if (step === "college") {
      addBotMessage(`Great to meet you, ${profile.name}! Which college or university are you attending?`);
    } else if (step === "major") {
      addBotMessage("What's your preferred major or field of study?");
    } else if (step === "year") {
      addBotMessage("What year are you currently in? (Freshman, Sophomore, Junior, or Senior)");
    } else if (step === "graduation") {
      addBotMessage("Finally, what's your expected graduation year?");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userInput = input.trim();
    addUserMessage(userInput);
    setInput("");

    // Process the input based on current step
    switch (step) {
      case "name":
        setProfile(prev => ({ ...prev, name: userInput }));
        setTimeout(() => setStep("college"), 1000);
        break;
      case "college":
        setProfile(prev => ({ ...prev, college: userInput }));
        setTimeout(() => setStep("major"), 1000);
        break;
      case "major":
        setProfile(prev => ({ ...prev, major: userInput }));
        setTimeout(() => setStep("year"), 1000);
        break;
      case "year":
        const normalizedYear = userInput.toLowerCase();
        const validYears = ["freshman", "sophomore", "junior", "senior"];
        if (validYears.some(y => normalizedYear.includes(y))) {
          setProfile(prev => ({ ...prev, collegeYear: userInput }));
          setTimeout(() => setStep("graduation"), 1000);
        } else {
          addBotMessage("Please enter one of: Freshman, Sophomore, Junior, or Senior");
        }
        break;
      case "graduation":
        const year = parseInt(userInput);
        if (year >= 2024 && year <= 2030) {
          const updatedProfile = { ...profile, graduationYear: userInput };
          setProfile(updatedProfile);
          setStep("complete");
          
          // Save profile to backend
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
            
            // Store onboarding completion in localStorage
            localStorage.setItem("onboarding_completed", "true");
            localStorage.setItem("user_profile", JSON.stringify(updatedProfile));
            
            setTimeout(() => {
              router.push("/");
            }, 3000);
          } catch (error) {
            console.error("Error saving profile:", error);
            addBotMessage("There was an error saving your profile. Please try again.");
          }
        } else {
          addBotMessage("Please enter a valid graduation year (2024-2030)");
        }
        break;
    }
  };

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
              <div style={styles.messageContent}>
                {msg.role === "bot" && <span style={styles.botIcon}>🤖</span>}
                <span>{msg.text}</span>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div style={{ ...styles.message, ...styles.botMessage }}>
              <div style={styles.messageContent}>
                <span style={styles.botIcon}>🤖</span>
                <span style={styles.typingIndicator}>
                  <span style={styles.dot}>●</span>
                  <span style={styles.dot}>●</span>
                  <span style={styles.dot}>●</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {step !== "welcome" && step !== "complete" && (
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
              style={styles.button}
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
    height: "80vh",
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
  botIcon: {
    fontSize: "20px",
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
  typingIndicator: {
    display: "flex",
    gap: "4px",
  },
  dot: {
    fontSize: "8px",
    animation: "blink 1.4s infinite",
  },
};