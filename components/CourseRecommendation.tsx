//Vraj Soni
import React, { useState } from 'react';
import { Search, Sparkles, BookOpen, X } from 'lucide-react';

interface CourseSection {
  section: string;
  time: string; // Note: newData.json uses 'time', Flowchart uses 'schedule' - we'll map or use 'time'
  instructor: string;
  location: string;
  dates: string; // newData.json uses 'dates', Flowchart uses 'classDate'
  capacity: string;
  status: string;
}

interface Course {
  code: string;
  name: string;
  credits: number;
  description: string;
  prerequisites: string[];
  flags?: string[];
  sections?: CourseSection[];
}

interface RecommendationResult {
  course: Course;
  score: number;
  matchedFlags: string[];
  matchReason: string;
}

interface CourseRecommendationProps {
  onCourseSelect?: (course: Course) => void;
  initialQuery?: string;
}

// Implemented by Vraj Soni - Dec 7
// State: query, loading, recommendations, totalFound, error, hasSearched, selectedCourse, isDetailsOpen
// Functions: handleSearch (API call), handleCourseClick, handleKeyPress, useEffect for initialQuery
const CourseRecommendation: React.FC<CourseRecommendationProps> = ({ onCourseSelect, initialQuery }) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Detail panel state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Implemented by Vraj Soni - Dec 7
  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setIsDetailsOpen(true);
    onCourseSelect?.(course);
  };

  // Implemented by Vraj Soni - Dec 7
  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userProfileStr = localStorage.getItem('user_profile');
      const userProfile = userProfileStr ? JSON.parse(userProfileStr) : null;

      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          userProfile,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setTotalFound(data.totalFound || 0);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  // Implemented by Vraj Soni - Dec 7
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  React.useEffect(() => {
    if (initialQuery && !hasSearched) {
      setHasSearched(true);
      handleSearch();
    }
  }, [initialQuery, hasSearched]);

  return (
    <div style={styles.container}>
      {!initialQuery && (
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <Sparkles size={32} color="#004aad" />
          </div>
          <h2 style={styles.title}>AI Course Recommendations</h2>
          <p style={styles.subtitle}>
            Ask me anything! e.g., "show me database courses"
          </p>
        </div>
      )}

      {!initialQuery && (
        <div style={styles.searchContainer}>
          <div style={styles.searchBox}>
            <Search size={20} color="#666" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Ask about courses..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              style={styles.searchInput}
              disabled={loading}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              style={{
                ...styles.searchButton,
                opacity: loading || !query.trim() ? 0.5 : 1,
                cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && recommendations.length > 0 && (
        <>
          <div style={styles.resultsHeader}>
            <span style={styles.resultsCount}>📚 {totalFound} courses found</span>
          </div>

          <div style={styles.recommendationsList}>
            {recommendations.map((rec, index) => (
              <div
                key={rec.course.code}
                style={{
                  ...styles.courseCard,
                  animationDelay: `${index * 0.05}s`,
                }}
                onClick={() => handleCourseClick(rec.course)}
              >
                <div style={styles.courseHeader}>
                  <div style={styles.courseCodeLarge}>{rec.course.code}</div>
                  <div style={styles.courseNameHeader}>{rec.course.name}</div>
                </div>

                <div style={styles.courseBody}>
                  <p style={styles.courseDescription}>
                    {rec.course.description.length > 120
                      ? rec.course.description.substring(0, 120) + '...'
                      : rec.course.description}
                  </p>

                  <div style={styles.courseFooter}>
                    {rec.course.prerequisites.length > 0 && (
                      <div style={styles.prerequisitesCompact}>
                        <span style={styles.prerequisiteLabel}>📋 Prerequisites:</span>
                        <span style={styles.prerequisiteText}>
                          {rec.course.prerequisites.join(', ')}
                        </span>
                      </div>
                    )}
                    <div style={styles.creditsInfo}>
                      {rec.course.credits} Credits
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && recommendations.length === 0 && query && !error && (
        <div style={styles.noResults}>
          <BookOpen size={48} color="#999" />
          <p style={styles.noResultsText}>No courses found matching your query.</p>
          <p style={styles.noResultsHint}>Try different keywords.</p>
        </div>
      )}

      {!loading && recommendations.length === 0 && !query && !error && (
        <div style={styles.emptyState}>
          <Sparkles size={64} color="#004aad" style={{ opacity: 0.3 }} />
          <p style={styles.emptyStateText}>Start by asking about courses!</p>
          <div style={styles.exampleQueries}>
            <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#004aad' }}>Example queries:</p>
            <div style={styles.exampleButton} onClick={() => setQuery('database courses')}>
              "database courses"
            </div>
            <div style={styles.exampleButton} onClick={() => setQuery('machine learning')}>
              "machine learning"
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel UI - Implemented Dec 7 2025 */}
      {/* Slides in from right overlay, displays course code, credits, description, prerequisites, and session information */}
      {isDetailsOpen && selectedCourse && (
        <div
          style={styles.detailsPanelOverlay}
          onClick={() => setIsDetailsOpen(false)}
        >
          <div style={styles.detailsPanel} onClick={(e) => e.stopPropagation()}>
            <div style={styles.detailsHeader}>
              <h3 style={styles.detailsTitle}>Course Details</h3>
              <button
                style={styles.closeButton}
                onClick={() => setIsDetailsOpen(false)}
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.detailsContent}>
              <div style={styles.courseHeaderDetail}>
                <div style={styles.courseIdBadge}>{selectedCourse.code}</div>
                <div style={styles.creditsBadge}>
                  {selectedCourse.credits} CR
                </div>
              </div>

              <h4 style={styles.courseNameDetail}>{selectedCourse.name}</h4>

              {/* Removed redundant blue box with credits as per user request to match image 2 */}

              {selectedCourse.description && (
                <div style={styles.descriptionSection}>
                  {/* <strong>Description:</strong> */}
                  <p style={{ marginTop: '0px', lineHeight: '1.6' }}>
                    {selectedCourse.description}
                  </p>
                </div>
              )}

              {selectedCourse.prerequisites && selectedCourse.prerequisites.length > 0 && (
                <div style={styles.prerequisitesSection}>
                  <strong>📋 Prerequisites:</strong>
                  <div style={styles.prerequisitesListDetail}>
                    {selectedCourse.prerequisites.map((prereq, idx) => (
                      <span key={idx} style={styles.prerequisiteTag}>
                        {prereq}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Sections - Matches FlowchartVisualization design */}
              {selectedCourse.sections && selectedCourse.sections.length > 0 && (
                <div style={styles.sessionsSection}>
                  <div style={styles.sessionsSectionHeader}>
                    Available Sections ({selectedCourse.sections.length})
                  </div>
                  <div style={styles.sessionsList}>
                    {selectedCourse.sections.map((section, idx) => (
                      <div key={idx} style={styles.sessionCard}>
                         <div style={styles.sessionRow}>
                          <span style={styles.sessionLabel}>Section:</span>
                          <span style={styles.sessionValue}>
                            {section.section}
                          </span>
                        </div>
                        <div style={styles.sessionRow}>
                          <span style={styles.sessionLabel}>Time:</span>
                          <span style={styles.sessionValue}>
                            {section.time}
                          </span>
                        </div>
                        <div style={styles.sessionRow}>
                          <span style={styles.sessionLabel}>Instructor:</span>
                          <span style={styles.sessionValue}>
                            {section.instructor}
                          </span>
                        </div>
                        <div style={styles.sessionRow}>
                          <span style={styles.sessionLabel}>Location:</span>
                          <span style={styles.sessionValue}>
                            {section.location}
                          </span>
                        </div>
                        <div style={styles.sessionRow}>
                          <span style={styles.sessionLabel}>Dates:</span>
                          <span style={styles.sessionValue}>
                            {section.dates}
                          </span>
                        </div>
                        <div style={styles.sessionRow}>
                          <span style={styles.sessionLabel}>Capacity:</span>
                          <span
                            style={{
                              ...styles.sessionValue,
                              ...styles.capacityBadge,
                              background:
                                section.status === 'Open'
                                  ? '#28a745'
                                  : '#dc3545',
                            }}
                          >
                            {section.capacity} - {section.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Comprehensive Styles - Implemented Dec 7 2025
// Includes: container, header, detail panel animations, session cards, prerequisites display
// Features: slideIn animation, responsive design, glassmorphism elements, badge styling
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  headerIcon: {
    display: 'inline-flex',
    padding: '16px',
    background: 'linear-gradient(135deg, #e3f2fd 0%, #f0f6ff 100%)',
    borderRadius: '50%',
    marginBottom: '16px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#004aad',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#666',
    margin: 0,
  },
  searchContainer: {
    marginBottom: '32px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    background: '#ffffff',
    border: '2px solid #004aad',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 74, 173, 0.1)',
  } as React.CSSProperties,
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '1rem',
    color: '#333',
    background: 'transparent',
  } as React.CSSProperties,
  searchButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #004aad 0%, #0066cc 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  errorBox: {
    padding: '16px',
    background: '#fff3cd',
    border: '1px solid #ffc107',
    borderLeft: '4px solid #ffc107',
    borderRadius: '8px',
    color: '#856404',
    marginBottom: '24px',
  },
  resultsHeader: {
    marginBottom: '20px',
  },
  resultsCount: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#333',
  },
  recommendationsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  } as React.CSSProperties,
  courseCard: {
    background: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    animation: 'slideIn 0.3s ease-out forwards',
    border: '1px solid #e0e0e0',
  } as React.CSSProperties,
  courseHeader: {
    background: 'linear-gradient(135deg, #004aad 0%, #0066cc 100%)',
    padding: '20px',
    color: '#ffffff',
  },
  courseCodeLarge: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '8px',
    letterSpacing: '0.5px',
  },
  courseNameHeader: {
    fontSize: '1.05rem',
    fontWeight: '500',
    lineHeight: '1.4',
    opacity: 0.95,
  },
  courseBody: {
    padding: '20px',
  },
  courseDescription: {
    fontSize: '0.9rem',
    color: '#555',
    lineHeight: '1.6',
    margin: '0 0 16px 0',
    minHeight: '60px',
  },
  courseFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  } as React.CSSProperties,
  prerequisitesCompact: {
    padding: '10px 12px',
    background: '#fff8e1',
    borderRadius: '6px',
    borderLeft: '3px solid #ffc107',
  },
  prerequisiteLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#666',
    display: 'block',
    marginBottom: '4px',
  },
  prerequisiteText: {
    fontSize: '0.8rem',
    color: '#333',
    display: 'block',
  },
  creditsInfo: {
    fontSize: '0.85rem',
    color: '#004aad',
    fontWeight: '600',
    padding: '8px 12px',
    background: '#e3f2fd',
    borderRadius: '6px',
    display: 'inline-block',
    alignSelf: 'flex-start',
  },
  noResults: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999',
  },
  noResultsText: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#666',
    margin: '16px 0 8px 0',
  },
  noResultsHint: {
    fontSize: '0.95rem',
    color: '#999',
    margin: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyStateText: {
    fontSize: '1.1rem',
    color: '#666',
    margin: '20px 0',
  },
  exampleQueries: {
    marginTop: '24px',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '12px',
    display: 'inline-block',
  },
  exampleButton: {
    padding: '10px 20px',
    background: '#ffffff',
    border: '2px solid #004aad',
    borderRadius: '8px',
    color: '#004aad',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginBottom: '8px',
  } as React.CSSProperties,
  
  // DETAIL PANEL STYLES - Updated match FlowchartVisualization and User Request
  detailsPanelOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  } as React.CSSProperties,
  detailsPanel: {
    width: '500px',
    maxWidth: '90vw',
    background: '#ffffff',
    borderRadius: '12px 0 0 12px',
    padding: '0',
    boxShadow: '-3px 0 12px rgba(0,0,0,0.2)',
    border: '2px solid #e9ecef',
    borderRight: 'none',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInRight 0.3s ease-in-out',
  } as React.CSSProperties,
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '2px solid #e9ecef',
    background: 'linear-gradient(135deg, #004aad 0%, #0066cc 100%)', // Blue header
    flexShrink: 0,
  } as React.CSSProperties,
  detailsTitle: {
    fontSize: '17px',
    fontWeight: 'bold',
    color: '#ffffff', // White text
    margin: 0,
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.2)', // Semi-transparent button
    border: 'none',
    cursor: 'pointer',
    color: '#ffffff',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  detailsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  } as React.CSSProperties,
  courseHeaderDetail: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  courseIdBadge: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#004aad',
    background: '#e3f2fd',
    padding: '6px 14px',
    borderRadius: '6px',
  },
  creditsBadge: {
    fontSize: '12px',
    color: '#004aad',
    background: '#f0f6ff',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: '600',
  },
  courseNameDetail: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#222',
    marginTop: '10px',
  },
  courseInfoSection: {
    display: 'flex',
    flexDirection: 'row',
    gap: '20px',
    padding: '12px',
    background: '#f0f6ff',
    borderRadius: '8px',
    border: '1px solid #004aad',
  } as React.CSSProperties,
  infoItem: {
    fontSize: '14px',
    color: '#004aad',
    fontWeight: '500',
  },
  descriptionSection: {
    fontSize: '13px',
    color: '#555',
    lineHeight: '1.5',
    padding: '10px',
    background: '#f8f9fa',
    borderRadius: '6px',
    borderLeft: '3px solid #004aad',
  },
  prerequisitesSection: {
    padding: '10px',
    background: '#fff3cd',
    borderRadius: '6px',
    fontSize: '13px',
    borderLeft: '3px solid #ffc107',
  },
  prerequisitesListDetail: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px',
  } as React.CSSProperties,
  prerequisiteTag: {
    background: '#ffffff',
    color: '#856404',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    border: '1px solid #ffc107',
  },
  // Sessions/Sections styles
  sessionsSection: {
    padding: '12px',
    background: '#f0f6ff',
    borderRadius: '8px',
    border: '1px solid #004aad',
    marginTop: '10px',
  },
  sessionsSectionHeader: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#004aad',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  sessionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  } as React.CSSProperties,
  sessionCard: {
    background: '#ffffff',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    fontSize: '12px',
  },
  sessionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  } as React.CSSProperties,
  sessionLabel: {
    fontWeight: '600',
    color: '#666',
  },
  sessionValue: {
    color: '#333',
    textAlign: 'right',
  } as React.CSSProperties,
  capacityBadge: {
    color: '#ffffff',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
};

// Animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
  `;
  document.head.appendChild(style);
}

export default CourseRecommendation;
