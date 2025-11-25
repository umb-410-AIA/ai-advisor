import React, { useState, useMemo } from 'react';
import { BookOpen, Award, Printer, X } from 'lucide-react';
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
  semesterIndex?: number;
}

interface TreeNode {
  name: string;
  attributes?: {
    courseId?: string;
    credits?: string;
    difficulty?: string;
    isTerm?: boolean;
    isYear?: boolean;
    termName?: string;
    semesterIndex?: number;
    prerequisites?: string[];
  };
  children?: TreeNode[];
}

interface CourseTreeProps {
  courses: Course[];
  title?: string;
  subtitle?: string;
}

function normalizeCourseId(courseId: string): string {
  return courseId.toUpperCase().replace(/\s+/g, '').trim();
}

const renderCustomNode = ({ nodeDatum, onNodeClick, toggleNode, expandedCourses }: any) => {
  // Extract node attributes
  const isTerm = nodeDatum.attributes?.isTerm;
  const isYear = nodeDatum.attributes?.isYear;
  const courseId = nodeDatum.attributes?.courseId || nodeDatum.name;
  const termName = nodeDatum.attributes?.termName || nodeDatum.name;
  const credits = nodeDatum.attributes?.credits || '0';
  const difficulty = nodeDatum.attributes?.difficulty;
  const hasPrerequisites = nodeDatum.attributes?.prerequisites && nodeDatum.attributes.prerequisites.length > 0;

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return '#28a745';
      case 'medium': return '#ffc107';
      case 'hard': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Calculate rectangle dimensions based on text length
  // Different sizes for years, terms, and courses
  const displayText = isYear ? nodeDatum.name : (isTerm ? termName : courseId);
  const textWidth = displayText.length * 7 + 20; // Approximate width: 7px per character + padding
  const rectWidth = Math.max(textWidth, isYear ? 180 : (isTerm ? 150 : 80));
  const rectHeight = isYear ? 50 : (isTerm ? 50 : 40);

  /**
   * Handles click events on tree nodes
   * Years/Terms: Toggle collapse/expand
   * Courses: Expand prerequisites and open details panel
   */
  const handleClick = (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    if (isYear || isTerm) {
      // Toggle year/term collapse/expand
      if (toggleNode) {
        toggleNode();
      }
    } else {
      // Handle course click - expand prerequisites and open details
      // Note: Course nodes don't collapse, they only expand to show prerequisites
      if (onNodeClick) {
        onNodeClick(courseId, nodeDatum);
      }
    }
  };

  // Check if this course is currently expanded (showing prerequisites)
  const isExpanded = courseId && expandedCourses && expandedCourses.has(courseId.toUpperCase().replace(/\s+/g, ''));

  return (
    <g onClick={handleClick} style={{ cursor: 'pointer' }}>
      {/* Rectangle background */}
      <rect
        x={-rectWidth / 2}
        y={-rectHeight / 2}
        width={rectWidth}
        height={rectHeight}
        rx={6}
        fill={isYear ? "#003080" : (isTerm ? "#004aad" : "#ffffff")}
        stroke={isYear ? "#002050" : (isTerm ? "#003080" : "#004aad")}
        strokeWidth={isYear ? 3 : (isTerm ? 3 : 2)}
      />
      {/* Text */}
      <text
        fill={isYear || isTerm ? "#ffffff" : "#004aad"}
        strokeWidth="0"
        x={0}
        y={isYear || isTerm ? 8 : 5}
        textAnchor="middle"
        fontSize={isYear ? "15" : (isTerm ? "14" : "12")}
        fontWeight="bold"
      >
        {displayText.length > (isYear ? 25 : (isTerm ? 20 : 12)) 
          ? displayText.substring(0, isYear ? 25 : (isTerm ? 20 : 12)) + "..." 
          : displayText}
      </text>
      {/* Prerequisites indicator for courses */}
      {!isTerm && !isYear && hasPrerequisites && (
        <circle
          r={4}
          fill={isExpanded ? "#28a745" : "#ffc107"}
          cx={rectWidth / 2 - 8}
          cy={-rectHeight / 2 + 8}
        />
      )}
      {/* Difficulty indicator for courses */}
      {!isTerm && !isYear && difficulty && (
        <circle
          r={4}
          fill={getDifficultyColor(difficulty)}
          cx={rectWidth / 2 - 8}
          cy={rectHeight / 2 - 8}
        />
      )}
    </g>
  );
};

export default function CourseTree({ courses, title, subtitle }: CourseTreeProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const limitedCourses = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    
  // Filter out courses that should be hidden
  // Hide courses that don't match common major prefixes (CS, MATH, etc.)
  // or are general education courses that clutter the tree
  const filteredCourses = courses.filter(course => {
    const courseId = normalizeCourseId(course.id);
    
    // Hide courses with these exact prefixes (AFRSTY but NOT AF which is Accounting)
    const hiddenPrefixes = [
      'AFRSTY',
      'AFRS',
      'GENED',
      'ELECTIVE',
      'GENERALEDUCATION',
      'AMST',
    ];
    
    // Check if course should be hidden by prefix
    const shouldHide = hiddenPrefixes.some(prefix => 
      courseId.startsWith(prefix)
    );
    
    if (shouldHide) {
      return false; // Hide courses with unwanted prefixes
    }
    
    // For CS Degree Roadmap, only show CS, MATH, PHYS, and AF (Accounting) courses
    const isCSRoadmap = title?.includes('CS') || title?.includes('Computer Science');
    if (isCSRoadmap) {
      const relevantPrefixes = ['CS', 'MATH', 'PHYS', 'PHYSICS', 'AF']; // Keep AF (Accounting)
      const isRelevant = relevantPrefixes.some(prefix => courseId.startsWith(prefix));
      return isRelevant; // Only show relevant courses for CS roadmap
    }
    
    // For other roadmaps, show all courses (except hidden ones)
    return true;
  });
    
    // Sort courses by semester index to maintain sequence
    const sortedCourses = [...filteredCourses].sort((a, b) => {
      if (a.semesterIndex !== undefined && b.semesterIndex !== undefined) {
        return a.semesterIndex - b.semesterIndex;
      }
      return 0;
    });
    
    // Return all filtered courses (organized by terms in tree structure)
    return sortedCourses;
  }, [courses, title]);

  /**
   * Extracts the academic year from a semester/term name
   * Looks for keywords like "freshman", "sophomore", etc.
   * 
   * term - The semester/term name (e.g., "Freshman Fall", "Sophomore Spring")
   * The extracted year name or "Other" if not found
   */
  const extractYear = (term: string): string => {
    const termLower = term.toLowerCase();
    if (termLower.includes('freshman')) return 'Freshman Year';
    if (termLower.includes('sophomore')) return 'Sophomore Year';
    if (termLower.includes('junior')) return 'Junior Year';
    if (termLower.includes('senior')) return 'Senior Year';
    return 'Other';
  };

  /**
   * Extracts the term (Fall/Spring/Summer) from a semester/term name
   * 
   * term - The semester/term name (e.g., "Freshman Fall", "Spring 2024")
   * The extracted term name or the original term if not found
   */
  const extractTerm = (term: string): string => {
    const termLower = term.toLowerCase();
    if (termLower.includes('fall')) return 'Fall';
    if (termLower.includes('spring')) return 'Spring';
    if (termLower.includes('summer')) return 'Summer';
    return term;
  };

  /**
   * Builds the tree data structure organized as: Years → Terms → Courses → Prerequisites
   * 
   * Structure:
   * - Root: "Course"
   *   - Year nodes (Freshman, Sophomore, etc.)
   *     - Term nodes (Fall, Spring, Summer)
   *       - Course nodes
   *         - Prerequisite nodes (added on expand)
   * 
   * Root TreeNode with hierarchical structure, or null if no courses
   */
  const treeData = useMemo(() => {
    if (!limitedCourses || limitedCourses.length === 0) return null;
    
    // Group courses by year, then by term
    // Structure: { "Freshman Year": { "Fall": [courses...], "Spring": [courses...] }, ... }
    const coursesByYearAndTerm: Record<string, Record<string, Course[]>> = {};
    limitedCourses.forEach(course => {
      const term = course.semester || 'Other';
      const year = extractYear(term);
      const termName = extractTerm(term);
      
      if (!coursesByYearAndTerm[year]) {
        coursesByYearAndTerm[year] = {};
      }
      if (!coursesByYearAndTerm[year][termName]) {
        coursesByYearAndTerm[year][termName] = [];
      }
      coursesByYearAndTerm[year][termName].push(course);
    });

    // Year order
    const yearOrder = ['Freshman Year', 'Sophomore Year', 'Junior Year', 'Senior Year', 'Other'];
    const termOrder = ['Fall', 'Spring', 'Summer'];

    // Create tree structure
    const yearNodes: TreeNode[] = [];
    
    yearOrder.forEach(year => {
      if (!coursesByYearAndTerm[year]) return;
      
      const termNodes: TreeNode[] = [];
      const terms = Object.keys(coursesByYearAndTerm[year]);
      
      // Sort terms
      const sortedTerms = terms.sort((a, b) => {
        const aIndex = termOrder.indexOf(a);
        const bIndex = termOrder.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });

      sortedTerms.forEach(termName => {
        const termCourses = coursesByYearAndTerm[year][termName];
        // Sort courses by semester index
        const sortedCourses = [...termCourses].sort((a, b) => {
          const aIndex = a.semesterIndex ?? 999;
          const bIndex = b.semesterIndex ?? 999;
          return aIndex - bIndex;
        });

        const courseNodes: TreeNode[] = sortedCourses.map(course => ({
          name: course.id,
          attributes: {
            courseId: course.id,
            credits: course.credits.toString(),
            difficulty: course.difficulty,
            prerequisites: course.prerequisites || [],
          },
          // Initially no children, prerequisites will be added on expand
          children: undefined,
        }));

        termNodes.push({
          name: termName,
          attributes: {
            isTerm: true,
            termName: termName,
          },
          children: courseNodes,
        });
      });

      yearNodes.push({
        name: year,
        attributes: {
          isYear: true,
        },
        children: termNodes,
      });
    });

    // Wrap in a root node
    return {
      name: 'Course',
      children: yearNodes,
    };
  }, [limitedCourses]);

  const selectedCourse = useMemo(() => {
    if (!selectedCourseId) return null;
    const normalizedSelected = normalizeCourseId(selectedCourseId);
    // Search in both limited and full courses list
    return courses.find(c => 
      normalizeCourseId(c.id) === normalizedSelected
    ) || limitedCourses.find(c => 
      normalizeCourseId(c.id) === normalizedSelected
    );
  }, [selectedCourseId, courses, limitedCourses]);

  // State to track expanded courses (to show prerequisites)
  // Uses a Set to efficiently track which courses have their prerequisites visible
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  /**
   * Handles clicks on tree nodes
   * - Course nodes: Expands prerequisites and opens details panel
   * - Year/Term nodes: Handled by react-d3-tree's toggleNode
   * 
   * @param courseId - The ID of the clicked course
   * @param nodeDatum - The node data from react-d3-tree
   */
  const handleNodeClick = (courseId: string, nodeDatum: any) => {
    // If it's a course node (not a year or term), expand prerequisites and show details
    if (nodeDatum.attributes?.courseId && !nodeDatum.attributes?.isTerm && !nodeDatum.attributes?.isYear) {
      const normalizedId = normalizeCourseId(courseId);
      // Always expand to show prerequisites when clicked (don't toggle/collapse)
      setExpandedCourses(prev => {
        const newSet = new Set(prev);
        newSet.add(normalizedId); // Always add, never remove on click
        return newSet;
      });
      // Open details panel
      setSelectedCourseId(courseId);
      setIsDetailsOpen(true);
    } else if (nodeDatum.attributes?.courseId) {
      // Just open details for course (fallback case)
      setSelectedCourseId(courseId);
      setIsDetailsOpen(true);
    }
  };

  /**
   * Builds the tree structure with prerequisites added for expanded courses
   * Recursively traverses the tree and adds prerequisite children to expanded course nodes
   * 
   * @returns Updated tree data with prerequisites visible for expanded courses
   */
  const buildTreeWithPrereqs = useMemo(() => {
    if (!treeData) return null;

    /**
     * Recursively adds prerequisite nodes to expanded courses
     * @param node - Current tree node to process
     * @returns Updated node with prerequisites added if expanded
     */
    const addPrerequisites = (node: TreeNode): TreeNode => {
      // If this is a course node (not a year or term)
      if (node.attributes?.courseId && !node.attributes?.isTerm && !node.attributes?.isYear) {
        const normalizedId = normalizeCourseId(node.attributes.courseId);
        const isExpanded = expandedCourses.has(normalizedId);
        const prerequisites = node.attributes.prerequisites || [];
        
        // If the course is expanded and has prerequisites, add them as children
        if (isExpanded && prerequisites.length > 0) {
          // Find the course to get full prerequisite info
          const course = courses.find(c => 
            normalizeCourseId(c.id) === normalizedId
          ) || limitedCourses.find(c => 
            normalizeCourseId(c.id) === normalizedId
          );
          
          // Create child nodes for each prerequisite
          if (course && course.prerequisites) {
            const prereqNodes: TreeNode[] = course.prerequisites.map(prereq => ({
              name: prereq,
              attributes: {
                courseId: prereq,
              },
            }));
            return {
              ...node,
              children: prereqNodes,
            };
          }
        }
        // If not expanded or no prerequisites, ensure no children
        return { ...node, children: undefined };
      }
      
      // Recursively process child nodes (years, terms, etc.)
      if (node.children) {
        return {
          ...node,
          children: node.children.map(addPrerequisites),
        };
      }
      return node;
    };

    return addPrerequisites(treeData);
  }, [treeData, expandedCourses, courses, limitedCourses]);

  // Dynamic import for react-d3-tree to avoid SSR (Server-Side Rendering) issues
  // react-d3-tree uses browser-only APIs and cannot run on the server
  const [Tree, setTree] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  /**
   * Dynamically imports react-d3-tree only on the client side
   * This prevents SSR errors since react-d3-tree requires browser APIs
   */
  React.useEffect(() => {
    setIsClient(true);
    import('react-d3-tree').then((mod) => {
      setTree(() => mod.default);
    }).catch((err) => {
      console.error('Failed to load react-d3-tree:', err);
    });
  }, []);

  // Show loading state while react-d3-tree is being imported or if no data
  if (!isClient || !treeData || !Tree) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <BookOpen size={24} style={{ marginRight: 10 }} />
            <div>
              <h3 style={styles.title}>Course Prerequisites Tree</h3>
              <p style={styles.subtitle}>
                {courses.length} courses • {courses.reduce((sum, c) => sum + c.credits, 0)} total credits
              </p>
            </div>
          </div>
        </div>
        <div style={styles.loadingContainer}>
          <div>Loading tree visualization...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <BookOpen size={24} style={{ marginRight: 10 }} />
          <div>
            <h3 style={styles.title}>{title || 'Course Prerequisites Tree'}</h3>
            <p style={styles.subtitle}>
              {subtitle || `${limitedCourses.length} of ${courses.length} courses shown • ${limitedCourses.reduce((sum, c) => sum + c.credits, 0)} credits`}
            </p>
          </div>
        </div>
        <button
          style={styles.printButton}
          onClick={() => window.print()}
          aria-label="Print plan"
        >
          <Printer size={16} style={{ marginRight: 6 }} /> Print / Save PDF
        </button>
      </div>

      {/* Main tree visualization container */}
      <div style={styles.content}>
        <div style={styles.treeContainer} id="tree-container">
          <Tree
            data={buildTreeWithPrereqs || treeData}  // Use tree with prerequisites if available
            orientation="vertical"                    // Tree grows top to bottom
            pathFunc="diagonal"                       // Diagonal lines connecting nodes
            translate={{ x: 300, y: 50 }}            // Initial position offset
            zoom={0.7}                                // Initial zoom level (70%)
            nodeSize={{ x: 250, y: 150 }}            // Spacing between nodes
            renderCustomNodeElement={(rd3tProps: any) => {
              // Prevent course nodes from being collapsible (only years/terms can collapse)
              const isCourseNode = rd3tProps.nodeDatum.attributes?.courseId && 
                                   !rd3tProps.nodeDatum.attributes?.isTerm && 
                                   !rd3tProps.nodeDatum.attributes?.isYear;
              
              return renderCustomNode({ 
                ...rd3tProps, 
                onNodeClick: handleNodeClick,
                toggleNode: isCourseNode ? undefined : rd3tProps.toggleNode, // Don't allow course nodes to toggle
                expandedCourses: expandedCourses
              });
            }}
            styles={{
              links: {
                stroke: '#004aad',    // Blue color for tree connections
                strokeWidth: 2,
              },
            }}
            svgClassName="course-tree-svg"
            collapsible={true}                        // Allow collapsing years/terms
            initialDepth={2}                          // Initially show 2 levels deep (root + years)
            shouldCollapseNeighborNodes={false}      // Don't auto-collapse siblings
          />
        </div>
      </div>

      {isDetailsOpen && selectedCourse && (
        <div style={styles.detailsPanelOverlay} onClick={() => setIsDetailsOpen(false)}>
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
                <div style={styles.creditsBadge}>{selectedCourse.credits} CR</div>
              </div>

              <h4 style={styles.courseName}>{selectedCourse.name}</h4>

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
                  <strong>Description:</strong>
                  <p style={{ marginTop: '8px', lineHeight: '1.6' }}>{selectedCourse.description}</p>
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
                          <span
                            style={{
                              ...styles.sessionValue,
                              ...styles.capacityBadge,
                              background: session.status === 'Open' ? '#28a745' : '#dc3545',
                            }}
                          >
                            {session.enrolled}/{session.capacity} • {session.status}
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

      {!isDetailsOpen && (
        <div style={styles.hint}>
          💡 Click on any course node to view details
        </div>
      )}
    </div>
  );
}

const getDifficultyColor = (difficulty?: string) => {
  switch (difficulty?.toLowerCase()) {
    case 'easy': return '#28a745';
    case 'medium': return '#ffc107';
    case 'hard': return '#dc3545';
    default: return '#6c757d';
  }
};

/**
 * Style definitions for the CourseTree component
 * Contains all inline styles for the component and its sub-elements
 * Uses a consistent color scheme with #004aad (blue) as the primary color
 */
const styles: Record<string, any> = {
  container: {
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    borderRadius: '16px',
    padding: '25px',
    marginTop: '20px',
    border: '3px solid #004aad',
    boxShadow: '0 4px 20px rgba(0, 74, 173, 0.15)',
  },
  loadingContainer: {
    padding: '40px',
    textAlign: 'center',
    color: '#666',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#004aad',
    marginBottom: '25px',
    paddingBottom: '15px',
    borderBottom: '3px solid #004aad',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  subtitle: {
    margin: '5px 0 0 0',
    fontSize: '0.9rem',
    color: '#666',
    fontWeight: 'normal',
  },
  printButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: '#0b6efd',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(11, 110, 253, 0.25)',
  },
  content: {
    display: 'flex',
    gap: '20px',
    minHeight: '500px',
  },
  treeContainer: {
    flex: 1,
    background: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    overflow: 'auto',
    overflowX: 'auto',
    overflowY: 'auto',
    border: '2px solid #e9ecef',
    minHeight: '500px',
    position: 'relative',
    width: '100%',
  },
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
  },
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
  },
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
  },
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
  },
  detailsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  courseHeader: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  courseIdBadge: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#004aad',
    background: '#e3f2fd',
    padding: '6px 14px',
    borderRadius: '6px',
  },
  difficultyBadge: {
    fontSize: '11px',
    color: '#ffffff',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  creditsBadge: {
    fontSize: '12px',
    color: '#004aad',
    background: '#f0f6ff',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: '600',
  },
  courseName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#222',
    marginTop: '10px',
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
  },
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
  },
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
  },
  sessionLabel: {
    fontWeight: '600',
    color: '#666',
  },
  sessionValue: {
    color: '#333',
    textAlign: 'right',
  },
  capacityBadge: {
    color: '#ffffff',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  courseInfo: {
    display: 'flex',
    flexDirection: 'row',
    gap: '20px',
    padding: '12px',
    background: '#f0f6ff',
    borderRadius: '8px',
    border: '1px solid #004aad',
  },
  infoItem: {
    fontSize: '14px',
    color: '#004aad',
    fontWeight: '500',
  },
  hint: {
    marginTop: '15px',
    padding: '10px',
    background: '#e3f2fd',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#004aad',
    fontSize: '14px',
  },
};

