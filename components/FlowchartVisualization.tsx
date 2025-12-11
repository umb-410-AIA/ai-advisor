//Vraj Soni
import React, { useState } from 'react';
import { X } from 'lucide-react';

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
  semesterIndex?: number;
  credits: number;
  difficulty?: string;
  prerequisites: string[];
  description?: string;
  sessions?: CourseSession[];
}

interface FlowchartVisualizationProps {
  courses: Course[];
  title?: string;
  subtitle?: string;
}

// Implemented by Vraj Soni - Dec 5
// State: expandedSemester, selectedCourse, isDetailsOpen, hoveredSemester, isDescExpanded
// Functions: toggleSemester, handleCourseClick, groupedBySemester reducer, sortedSemesters sorter
const FlowchartVisualization: React.FC<FlowchartVisualizationProps> = ({
  courses,
  title,
  subtitle,
}) => {
  // State to track which semester is currently expanded (null = all collapsed)
  const [expandedSemester, setExpandedSemester] = useState<string | null>(null);
  // State to track selected course for detail panel
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [hoveredSemester, setHoveredSemester] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Group courses by semester
  const groupedBySemester = courses.reduce((acc, course) => {
    const semester = course.semester || 'Unknown';
    if (!acc[semester]) {
      acc[semester] = [];
    }
    acc[semester].push(course);
    return acc;
  }, {} as Record<string, Course[]>);

  // Sort semesters by semesterIndex if available
  const sortedSemesters = Object.entries(groupedBySemester).sort((a, b) => {
    const indexA = a[1][0]?.semesterIndex ?? 999;
    const indexB = b[1][0]?.semesterIndex ?? 999;
    return indexA - indexB;
  });

  // Toggle semester expansion - close if already open, open if closed
  // Implemented by Vraj Soni - Dec 5
  const toggleSemester = (semester: string) => {
    setExpandedSemester(expandedSemester === semester ? null : semester);
  };

  // Handle course click to open detail panel
  // Implemented by Vraj Soni - Dec 5
  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setIsDetailsOpen(true);
    setIsDescExpanded(false); 
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      {title && (
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        </div>
      )}

      {/* Flowchart */}
      <div style={styles.flowchart}>
        {sortedSemesters.map(([semester, semesterCourses], semesterIndex) => {
          const isExpanded = expandedSemester === semester;
          
          return (
            <React.Fragment key={semester}>
              {/* Semester Block */}
              <div style={styles.semesterBlock}>
                {/* Semester Header - Clickable */}
                <div
                  style={{
                    ...styles.semesterBox,
                    cursor: 'pointer',
                    position: 'relative',
                    transform: isExpanded ? 'scale(1.02)' : hoveredSemester === semester ? 'scale(1.01)' : 'scale(1)',
                    boxShadow: isExpanded 
                      ? '0 8px 24px rgba(0, 74, 173, 0.5)' 
                      : hoveredSemester === semester 
                        ? '0 6px 20px rgba(0, 74, 173, 0.4)'
                        : '0 6px 20px rgba(0, 74, 173, 0.3)',
                  }}
                  onClick={() => toggleSemester(semester)}
                  onMouseEnter={() => setHoveredSemester(semester)}
                  onMouseLeave={() => setHoveredSemester(null)}
                >
                  {/* Dropdown arrow - absolutely positioned on right, vertically centered */}
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1rem',
                    color: '#ffffff',
                  }}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  
                  <div style={styles.semesterHeader}>
                    {semester}
                  </div>
                  <div style={styles.semesterInfo}>
                    {semesterCourses.length} course{semesterCourses.length !== 1 ? 's' : ''} •{' '}
                    {semesterCourses.reduce((sum, c) => sum + c.credits, 0)} credits
                  </div>
                </div>

                {/* Courses in this semester - Only show if expanded */}
                {isExpanded && semesterCourses.length > 0 && (
                  <div style={styles.coursesContainer}>
                    {semesterCourses.map((course, courseIndex) => (
                      <div key={course.id} style={styles.courseWrapper}>
                        {/* Connector line from semester to course */}
                        {courseIndex === 0 && <div style={styles.connector} />}

                        {/* Course Box */}
                        <div
                          style={styles.courseBox}
                          onClick={() => handleCourseClick(course)}
                        >
                          <div style={styles.courseId}>{course.id}</div>
                          <div style={styles.courseName}>{course.name}</div>
                          {course.credits && (
                            <div style={styles.courseCredits}>{course.credits} credits</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Connector between semesters */}
              {semesterIndex < sortedSemesters.length - 1 && (
                <div style={styles.semesterConnector} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Sliding Detail Panel - Implemented Dec 5 2025 */}
      {/* Displays: course ID, difficulty badge (color-coded), credits, semester info, description, prerequisites, session availability */}
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
              <div style={styles.courseHeader}>
                <div style={styles.courseIdBadge}>{selectedCourse.id}</div>
                {selectedCourse.difficulty && (
                  <div
                    style={{
                      ...styles.difficultyBadge,
                      background: getDifficultyColor(selectedCourse.difficulty),
                    }}
                  >
                    {selectedCourse.difficulty}
                  </div>
                )}
                <div style={styles.creditsBadge}>
                  {selectedCourse.credits} CR
                </div>
              </div>

              <h4 style={styles.courseNameDetail}>{selectedCourse.name}</h4>

              <div style={styles.courseInfo}>
                <div style={styles.infoItem}>
                  <strong>Semester:</strong> {selectedCourse.semester || 'N/A'}
                </div>
                <div style={styles.infoItem}>
                  <strong>Credits:</strong> {selectedCourse.credits}
                </div>
              </div>

              {selectedCourse.description && (
                <div style={styles.description}>
                  {selectedCourse.description.length > 150 ? (
                    <p style={{ marginTop: '0', lineHeight: '1.6' }}>
                      {isDescExpanded
                        ? selectedCourse.description
                        : `${selectedCourse.description.slice(0, 150)}... `}
                      <span
                        style={styles.readMoreLink}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDescExpanded(!isDescExpanded);
                        }}
                      >
                        {isDescExpanded ? 'Less' : 'More'}
                      </span>
                    </p>
                  ) : (
                    <p style={{ marginTop: '0', lineHeight: '1.6' }}>
                      {selectedCourse.description}
                    </p>
                  )}
                </div>
              )}

              {selectedCourse.prerequisites && selectedCourse.prerequisites.length > 0 && (
                <div style={styles.prerequisitesSection}>
                  <strong>📋 Prerequisites:</strong>
                  <div style={styles.prerequisitesList}>
                    {selectedCourse.prerequisites.map((prereq, idx) => (
                      <span key={idx} style={styles.prerequisiteTag}>
                        {prereq}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedCourse.sessions && selectedCourse.sessions.length > 0 && (
                <div style={styles.sessionsSection}>
                  <div style={styles.sessionsSectionHeader}>
                    🕒 Available Sections ({selectedCourse.sessions.length})
                  </div>
                  <div style={styles.sessionsList}>
                    {selectedCourse.sessions.map((session, idx) => (
                      <div key={idx} style={styles.sessionCard}>
                        <div style={styles.sessionRow}>
                          <span style={styles.sessionLabel}>Section:</span>
                          <span style={styles.sessionValue}>
                            {session.section}
                          </span>
                        </div>
                        <div style={styles.sessionRow}>
                          <span style={styles.sessionLabel}>Time:</span>
                          <span style={styles.sessionValue}>
                            {session.schedule}
                          </span>
                        </div>
                        <div style={styles.sessionRow}>
                          <span style={styles.sessionLabel}>Instructor:</span>
                          <span style={styles.sessionValue}>
                            {session.instructor}
                          </span>
                        </div>
                        <div style={styles.sessionRow}>
                          <span style={styles.sessionLabel}>Location:</span>
                          <span style={styles.sessionValue}>
                            {session.location}
                          </span>
                        </div>
                        <div style={styles.sessionRow}>
                          <span style={styles.sessionLabel}>Dates:</span>
                          <span style={styles.sessionValue}>
                            {session.classDate}
                          </span>
                        </div>
                        <div style={styles.sessionRow}>
                          <span style={styles.sessionLabel}>Capacity:</span>
                          <span
                            style={{
                              ...styles.sessionValue,
                              ...styles.capacityBadge,
                              background:
                                session.status === 'Open'
                                  ? '#28a745'
                                  : '#dc3545',
                            }}
                          >
                            {session.enrolled}/{session.capacity} •{' '}
                            {session.status}
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

// Helper function to get difficulty color
// Maps difficulty levels to visual colors: Easy=Green, Medium=Yellow, Hard=Red, Default=Gray
// Implemented by Vraj Soni - Dec 5
const getDifficultyColor = (difficulty: string): string => {
  const lowerDiff = difficulty.toLowerCase();
  if (lowerDiff.includes('easy') || lowerDiff.includes('beginner')) {
    return '#28a745';
  } else if (lowerDiff.includes('medium') || lowerDiff.includes('intermediate')) {
    return '#ffc107';
  } else if (lowerDiff.includes('hard') || lowerDiff.includes('advanced')) {
    return '#dc3545';
  }
  return '#6c757d';
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    borderRadius: '16px',
    padding: '30px',
    marginTop: '20px',
    border: '3px solid #004aad',
    boxShadow: '0 8px 24px rgba(0, 74, 173, 0.2)',
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center',
    borderBottom: '3px solid #004aad',
    paddingBottom: '15px',
  },
  title: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#004aad',
    marginBottom: '8px',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#666',
    fontWeight: '500',
  },
  flowchart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0',
  },
  semesterBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  semesterBox: {
    background: 'linear-gradient(135deg, #004aad 0%, #0066cc 100%)',
    border: '2px solid #003580',
    borderRadius: '8px',
    padding: '12px 24px',
    width: '260px',
    height: '70px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0, 74, 173, 0.3)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    userSelect: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  } as React.CSSProperties,
  semesterHeader: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  semesterInfo: {
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginTop: '2px',
  },
  connector: {
    width: '4px',
    height: '40px',
    background: 'linear-gradient(to bottom, #004aad, #0066cc)',
    margin: '0 auto',
  },
  semesterConnector: {
    width: '4px',
    height: '50px',
    background: 'linear-gradient(to bottom, #004aad, #0066cc)',
    margin: '0 auto',
  },
  coursesContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  courseWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '10px',
  },
  courseBox: {
    background: '#ffffff',
    border: '1.5px solid #0066cc',
    borderRadius: '6px',
    padding: '8px 12px',
    width: '160px',
    height: '65px',
    boxShadow: '0 2px 8px rgba(0, 102, 204, 0.15)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  } as React.CSSProperties,
  courseId: {
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: '#004aad',
    marginBottom: '2px',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
  },
  courseName: {
    fontSize: '0.7rem',
    color: '#333',
    marginBottom: '4px',
    fontWeight: '600',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    lineHeight: '1.2',
    flex: 1,
  },
  courseCredits: {
    fontSize: '0.65rem',
    color: '#666',
  },
  difficultyBadge: {
    fontSize: '11px',
    color: '#ffffff',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  } as React.CSSProperties,
  // Detail panel styles
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
    animation: 'slideInRight 0.3s ease-out',
  } as React.CSSProperties,
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e9ecef',
    background: 'linear-gradient(135deg, #004aad 0%, #0066cc 100%)',
    color: '#ffffff',
    flexShrink: 0,
  } as React.CSSProperties,
  detailsTitle: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.2)',
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
  courseHeader: {
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
  courseInfo: {
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
  description: {
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
  prerequisitesList: {
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
  sessionsSection: {
    padding: '12px',
    background: '#f0f6ff',
    borderRadius: '8px',
    border: '1px solid #004aad',
  },
  sessionsSectionHeader: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#004aad',
    marginBottom: '10px',
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
  readMoreLink: {
    color: '#004aad',
    fontWeight: 'bold',
    cursor: 'pointer',
    textDecoration: 'none',
    marginLeft: '5px',
  },
};

export default FlowchartVisualization;
