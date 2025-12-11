# Project User Guide

This guide explains how to run the project, update data using the Python script, and use the application features.

Copy the project from this GitHub repo from the branch vraj23: https://github.com/umb-410-AIA/ai-advisor.git

For the access key, contact the developer. Keys are not stored in the repository.

## 1. Running the Project

To start the main web application:

1.  Open a terminal in the project root directory.
2.  Run the following command:
    npm install
    ```
    npm run dev
    ```
3.  Open your browser and navigate to `http://localhost:3000`.


## 2. Updating Data with `main.py` (Only for the developer not necessary)

You run `main.py` when you want to **scrape fresh course data** from the university website. This ensures the application has the latest course catalog.

### How to Run:
1.  Navigate to the `python_file` directory:
    ```bash
    cd python_file
    ```
2.  Run the script:
    ```bash
    python main.py
    ```
    *Note: Ensure you have the required Python libraries installed (`requests`, `beautifulsoup4`).*

### Handling `newData.json`:
The script generates a file named `newData.json`.
*   **Where to put it:** You must move this file to the application's data directory so the app can read it.
*   **Destination:** `pages/api/data/newData.json`

**Automatic Move Command (Windows Powershell):**
```powershell
Move-Item -Force newData.json ../pages/api/data/newData.json
```

## 3. Login Process

1. When you open the app, you will see the login screen.
2. Enter the password provided to you privately by the developer.


## 4. Onboarding (Registration)

1.  After logging in, you will go through the Profile Setup process.
2.  **Select Major:** Choose **Computer Science**.
    *   *Reason:* Currently, the application only has data for the Computer Science curriculum.

## 5. Using the Application

Once you are on the dashboard (Chat Interface), you can use the following features:

### A. Roadmap Visualization
**Prompt:**
> "Show me the roadmap for CS Courses as per Degree Requirements"

*   **What happens:** The AI will display the interactive Roadmap Visualization.
*   **Feature:** You can click on any term or subject on the right side to view detailed data about that specific course.

### B. Course Recommendations
**Prompt:**
> "Show me the best courses for cloud engineer"

*   **What happens:**
    *   The AI will search the `newData.json` for courses relevant to "cloud engineer".
    *   It will display a list of recommended courses with their details (credits, description, etc.) tailored to that career path.
