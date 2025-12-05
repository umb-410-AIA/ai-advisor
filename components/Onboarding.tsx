import { useState, useEffect } from "react";

interface OnboardingData {
  university: string;
  major: string;
  year: string;
}

interface OnboardingProps {
  token: string;
  onComplete: (profile: OnboardingData) => void;
}

export default function Onboarding({ token, onComplete }: OnboardingProps) {
  const steps = ["university", "major", "year"];
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ university: "", major: "", year: "" });
  const [botMessage, setBotMessage] = useState("");

  useEffect(() => {
    setBotMessage(`Welcome! Let's get started with your ${steps[step]}.`);
  }, [step]);

  const handleNext = async (value: string) => {
    const key = steps[step];
    setData((prev) => ({ ...prev, [key]: value }));

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // submit onboarding
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      onComplete(result.profile);
    }
  };

  return (
    <div>
      <div className="bot-bubble">{botMessage}</div>
      <input
        placeholder={`Enter your ${steps[step]}...`}
        onKeyDown={(e) => e.key === "Enter" && handleNext(e.currentTarget.value)}
      />
    </div>
  );
}
