Intelligent Academic Path Planner – Prototype Implementation (Shrey's Project)

This project is a working prototype of the Intelligent Academic Path Planner, built using Next.js, React, and deployed on Vercel.
It implements the first two core features described in the project vision document and forms the foundation for future full advising automation.
(Reference: Project Vision Document)  ￼

⸻

🚀 Implemented Features (ClassProj3)

1. Curriculum-Aware Path Planning (Flowchart Visualization)

A dynamic top-to-bottom roadmap that displays a student’s CS degree in a clear semester-by-semester layout.

Functional status:
	•	Fully working inside the Next.js + Vercel architecture
	•	Interactive semesters (expand/collapse)
	•	Clickable courses that open the details panel
	•	Triggered via chat prompt:
“show me the roadmap for CS courses”

This completes Core Feature #1 from the project PDF.

⸻

2. Goal-Based Personalization (“Preferred Courses”)

A recommendation engine that suggests relevant CS courses based on goals or interests.

Functional status:
	•	Uses keyword-based prompts like:
“give me preferred courses”
“best courses for cloud engineer”
	•	Pulls data from the processed newData.json
	•	Results appear inside the Chat Window
	•	Clicking a recommended course opens the same detail panel

This fulfills Core Feature #2 (Personalization) from the project PDF.

⸻

🧩 System Components Developed

Frontend (Next.js + React)
	•	FlowchartVisualization.tsx — top-to-bottom CS roadmap
	•	CourseRecommendation.tsx — recommended courses UI
	•	onboarding.tsx — profile setup flow
	•	Chat Window + ChatBar design
	•	UMass-Boston color theme (applied through global CSS)
	•	Integrated into Next.js pages and components

Backend / API (Next.js API Routes)
	•	pages/api/chat.ts:
	•	Keyword routing (roadmap / preferred courses)
	•	Selects correct component type for rendering
	•	newData.json: Updated dataset for CS courses
	•	Component rendering handled in pages/index.tsx

Deployment
	•	Supports Vercel Deployment out of the box
	•	Uses Next.js file-based routing and API endpoints
	•	No server config needed

⸻

🧪 Testing Summary (Proj3)

Flowchart Visualization
	•	Verified correct semester ordering
	•	Checked expand/collapse logic
	•	Confirmed detail panel accuracy
	•	Tested roadmap prompts within Chat Window

Preferred Courses
	•	Tested keyword prompts (“preferred courses”, “best courses for…”)
	•	Cross-checked results with dataset
	•	Verified detail panel compatibility

Keyword Routing (chat.ts)
	•	Tried variations like “degree plan”, “roadmap”, “recommend courses”
	•	Ensured correct component selection for each prompt

Chat Window + ChatBar
	•	Verified message sending, rendering, and response order
	•	Confirmed smooth embedding of roadmap + recommendation components

Onboarding
	•	Completed profile setup multiple times with different inputs
	•	Confirmed proper routing into main chat interface

⸻

📁 Project Setup

1. Install dependencies

npm install

2. Run development server

npm run dev

3. Open the app

http://localhost:3000

4. Environment Variables

.env.local is required (NOT included in repo).
Contact developer for access keys.

⸻

🌐 Tech Stack
	•	Next.js (React Framework)
	•	React Components
	•	Next.js API Routes
	•	Vercel Deployment
	•	CSS Global Styling
	•	OpenAI API (via backend)

⸻

📂 Branch & Artifact Locations
	•	My development branch: vraj23
	•	Important Files:
	•	/components/FlowchartVisualization.tsx
	•	/components/CourseRecommendation.tsx
	•	/pages/api/chat.ts
	•	/pages/onboarding.tsx
	•	/pages/index.tsx
	•	Dataset: pages/api/data/newData.json
	•	Repository:
https://github.com/umb-410-AIA/ai-advisor

⸻

🎯 Current Scope

This prototype implements exactly two core features:
	1.	Curriculum-Aware Path Planning ✔
	2.	Goal-Based Personalization (Preferred Courses) ✔

