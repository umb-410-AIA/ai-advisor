//Vraj Soni
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface Course {
    code: string;
    name: string;
    credits: number;
    description: string;
    prerequisites: string[];
    flags?: string[];
}

interface RecommendationResult {
    course: Course;
    score: number;
    matchedFlags: string[];
    matchReason: string;
}

// Stop words to ignore when extracting keywords
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'for', 'with', 'to', 'from', 'in', 'on', 'at',
    'show', 'me', 'what', 'which', 'is', 'are', 'be', 'can', 'could', 'should', 'would',
    'best', 'good', 'great', 'course', 'courses', 'subject', 'subjects', 'class', 'classes'
]);

// Extract keywords from query
function extractKeywords(query: string): string[] {
    return query
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

// Score a course against keywords
function scoreCourse(course: Course, keywords: string[]): { score: number; matchedFlags: string[] } {
    let score = 0;
    const matchedFlags: string[] = [];

    // Convert course data to lowercase for matching
    const courseName = course.name.toLowerCase();
    const courseDesc = course.description.toLowerCase();
    const courseCode = course.code.toLowerCase();
    const flags = (course.flags || []).map(f => f.toLowerCase());

    keywords.forEach(keyword => {
        // High score: keyword matches a flag (most relevant)
        flags.forEach(flag => {
            if (flag.includes(keyword) || keyword.includes(flag)) {
                score += 10;
                if (!matchedFlags.includes(flag)) {
                    matchedFlags.push(flag);
                }
            }
        });

        // Medium score: keyword in course name
        if (courseName.includes(keyword)) {
            score += 5;
        }

        // Medium score: keyword in course code
        if (courseCode.includes(keyword)) {
            score += 4;
        }

        // Low score: keyword in description
        if (courseDesc.includes(keyword)) {
            score += 2;
        }
    });

    return { score, matchedFlags };
}

// Generate explanation for why course was recommended
function generateMatchReason(course: Course, matchedFlags: string[], keywords: string[]): string {
    const reasons: string[] = [];

    if (matchedFlags.length > 0) {
        reasons.push(`Matches: ${matchedFlags.slice(0, 3).join(', ')}`);
    }

    const nameMatches = keywords.filter(k => course.name.toLowerCase().includes(k));
    if (nameMatches.length > 0) {
        reasons.push(`Found in course name`);
    }

    if (reasons.length === 0) {
        reasons.push('Related to your query');
    }

    return reasons.join(' • ');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { query, userProfile } = req.body;

        if (!query || !query.trim()) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Load course data
        const dataPath = path.join(process.cwd(), 'pages', 'api', 'data', 'newData.json');
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const data = JSON.parse(fileContent);

        // Get user's degree ID (default to 1 for Computer Science if not provided)
        const degreeId = userProfile?.major?.id || 1;

        // Find the user's degree program
        const degree = data.degrees.find((d: any) => d.id === degreeId);
        if (!degree) {
            return res.status(404).json({ error: 'Degree program not found' });
        }

        // Get all subjects for the degree
        const allCourses: Course[] = degree.all_subjects || [];

        // Extract keywords from query
        const keywords = extractKeywords(query);

        if (keywords.length === 0) {
            return res.status(400).json({ error: 'Please provide a more specific query' });
        }

        // Score and rank courses
        const recommendations: RecommendationResult[] = [];

        allCourses.forEach((course: Course) => {
            const { score, matchedFlags } = scoreCourse(course, keywords);

            if (score > 0) {
                const matchReason = generateMatchReason(course, matchedFlags, keywords);
                recommendations.push({
                    course,
                    score,
                    matchedFlags,
                    matchReason,
                });
            }
        });

        // Sort by score (highest first) and take top 10
        recommendations.sort((a, b) => b.score - a.score);
        const topRecommendations = recommendations.slice(0, 10);

        return res.status(200).json({
            query,
            keywords,
            recommendations: topRecommendations,
            totalFound: recommendations.length,
        });

    } catch (error) {
        console.error('Recommendation error:', error);
        return res.status(500).json({ error: 'Failed to process recommendation request' });
    }
}
