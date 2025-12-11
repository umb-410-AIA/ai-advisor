// Vraj Soni — Test Course Recommendations
// Implemented: Dec 8, 2025
// Purpose: Local test page to exercise the CourseRecommendation component.
import CourseRecommendation from '@/components/CourseRecommendation';
import Head from 'next/head';

// CourseRecommendation: Renders the search UI and sliding detail panel for courses.
// Head: Next.js helper to set the page <title> for this test page.

export default function TestRecommendations() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '20px' }}>
      {/* Page wrapper: full-height background and centered content area */}
      <Head>
        <title>Test Course Recommendations</title>
      </Head>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '40px', color: '#004aad' }}>
          Course Recommendation Test Page
        </h1>
        
        <div style={{
          background: '#fff3cd',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          border: '1px solid #ffc107'
        }}>
          <strong>Setup Instructions:</strong>
          {/* Setup instructions: paste the `localStorage.setItem('user_profile', ...)` snippet below into the browser console
              to simulate a logged-in user. Then refresh the page so the test component reads that profile. */}
          <ol style={{ marginTop: '8px', paddingLeft: '20px' }}>
            <li>Open browser DevTools (F12)</li>
            <li>Go to Console tab</li>
            <li>Run this command to set your user profile:
              <pre style={{ 
                background: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '4px', 
                marginTop: '8px',
                fontSize: '0.85rem',
                overflowX: 'auto'
              }}>
{`localStorage.setItem('user_profile', JSON.stringify({
  "name": "Max",
  "college": "UMass Boston",
  "major": {"name": "Computer Science", "id": 1},
  "collegeYear": "Freshman",
  "graduationYear": "Fall 2025"
}));`}
              </pre>
            </li>
            <li>Refresh this page</li>
            <li>Try searching for courses!</li>
          </ol>
        </div>

        {/* Mount the CourseRecommendation component. It reads `user_profile` from localStorage to personalize results. */}
        <CourseRecommendation />

        {/* Example queries: use these phrases in the search box to verify expected recommendation outputs. */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          background: '#e3f2fd',
          borderRadius: '12px',
          border: '2px solid #004aad'
        }}>
          <h3 style={{ color: '#004aad', marginTop: 0 }}>Test Queries to Try:</h3>
          <ul style={{ lineHeight: '2' }}>
            <li><code style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px' }}>database courses</code> - Should return CS430, CS436, CS437</li>
            <li><code style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px' }}>machine learning</code> - Should return CS438, CS435, CS441</li>
            <li><code style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px' }}>security and cryptography</code> - Should return CS449, CS413, CS442</li>
            <li><code style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px' }}>intro programming</code> - Should return CS110, CS105</li>
            <li><code style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px' }}>cloud computing</code> - Should return CS449, CS470</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
