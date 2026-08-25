// Shared TypeScript interfaces for the KidsAcademy application

export interface User {
    id: number;
    username: string;
    role: 'teacher' | 'student';
    name?: string;
    avatar?: string;
    coins?: number;
    lastLoginAt?: string | null;
    lastPagePath?: string | null;
    lastPageAt?: string | null;
    lastPageLabel?: string | null;
}

export interface StudentNotification {
    id: number;
    type: string;
    content: string;
    refType?: string | null;
    refId?: string | null;
    isRead: number;
    createdAt: string;
}

export interface AuthUser extends User {
    expiresAt: number;
}

export interface Quiz {
    question: string;
    questionImage?: string;
    options: string[];
    optionImages?: string[];
    correctOptionIndex?: number;
    correctOptionIndices?: number[];
    isMultiSelect?: boolean;
    explanation?: string;
}

export interface ProjectSegment {
    id?: number;
    projectId?: number;
    title?: string;
    titleZh?: string;
    titleDe?: string;
    content: string;
    contentZh?: string;
    contentDe?: string;
    quizzes: Quiz[] | string;
    quizzesZh?: Quiz[] | string;
    quizzesDe?: Quiz[] | string;
    isPublished: boolean | number;
    isLocked: boolean | number;
    orderIndex: number;
}

// ─── Homework (Hausaufgaben) ──────────────────────────────────────────
// A project is either a normal lesson or a homework lesson. For homework the
// student must first upload their own Scratch/code file; the system tests it
// and only then opens the article.

export type ProjectType = 'lesson' | 'homework';

export type HomeworkCheckType =
    | 'minSprites'
    | 'minBlocks'
    | 'minScripts'
    | 'minCostumes'
    | 'minSounds'
    | 'requiredOpcode'
    | 'requiredVariable'
    | 'requiredList'
    | 'requiredExtension'
    | 'containsText'
    | 'notContainsText'
    | 'minLines';

export interface HomeworkCheck {
    type: HomeworkCheckType;
    // Numeric checks use `value` as the minimum; text checks as the needle.
    value: string | number;
    // How often an opcode has to appear (requiredOpcode only). Defaults to 1.
    count?: number;
    // Kid-friendly description shown in the result list. Falls back to an
    // auto-generated German label when empty.
    label?: string;
}

export interface HomeworkCheckResult {
    type: HomeworkCheckType | 'file';
    label: string;
    passed: boolean;
    detail: string;
}

export interface HomeworkSubmission {
    id: number;
    userId: number;
    projectId: number;
    fileName: string;
    fileSize: number;
    // Superseded attempts keep their result but their file is pruned.
    fileAvailable: boolean;
    passed: boolean | number;
    score: number;
    total: number;
    results: HomeworkCheckResult[];
    createdAt: string;
    // Joined columns, only present in the teacher views.
    studentName?: string;
    studentUsername?: string;
    projectTitle?: string;
}

export interface HomeworkStatus {
    projectType: ProjectType;
    // True once the student has handed in at least one file — this is what
    // opens the article, regardless of whether the tests passed.
    submitted: boolean;
    // True once any submission passed all tests (the extra BlockCoin).
    passed: boolean;
    coinAwarded: boolean;
    attempts: number;
    latest: HomeworkSubmission | null;
}

// ─── Assignment (freie Aufgabenabgabe) ────────────────────────────────
// A lightweight, optional hand-in box any project can have: the teacher
// writes instructions, the student answers with a screenshot, a link, or a
// bit of text. Unlike homework, it never gates the article and only ever
// keeps the student's latest attempt.

export type AssignmentSubmissionType = 'image' | 'url' | 'text';

export interface AssignmentSubmission {
    id: number;
    userId: number;
    projectId: number;
    submissionType: AssignmentSubmissionType;
    content: string;
    createdAt: string;
    updatedAt: string;
    // Joined columns, only present in the teacher views.
    studentName?: string;
    studentUsername?: string;
    projectTitle?: string;
}

export interface Project {
    id: number;
    buildingId: number;
    title: string;
    titleZh?: string;
    titleDe?: string;
    description: string;
    descriptionZh?: string;
    descriptionDe?: string;
    scratchFileUrl: string;
    scratchProjectId: string;
    finalScratchFileUrl?: string;
    finalScratchProjectId?: string;
    coverImage: string;
    isLocked: boolean | number;
    orderIndex: number;
    segments?: ProjectSegment[];
    buildingName?: string;
    tags?: string[];
    projectType?: ProjectType;
    homeworkInstructions?: string;
    homeworkChecks?: HomeworkCheck[];
    // Set by the server for students: the article is still hidden because no
    // homework has been handed in yet.
    homeworkLocked?: boolean;
    homeworkStatus?: HomeworkStatus | null;
    assignmentInstructions?: string;
    // Set by the server for students: their own current hand-in, if any.
    assignmentSubmission?: AssignmentSubmission | null;
    // Only on the student's building listing, for the door badge.
    homeworkSubmitted?: boolean;
    homeworkPassed?: boolean;
    // Legacy fields for backward compatibility
    content?: string;
    quizzes?: Quiz[] | string;
}

export interface Building {
    id: number;
    name: string;
    description: string;
    coverImage: string;
    orderIndex: number;
}

export interface BuildingWithVisibility extends Building {
    isVisible: boolean | number;
}

export interface UserProgress {
    userId: number;
    projectId: number;
    state: 'locked' | 'unlocked' | 'in-progress' | 'completed';
}

export interface ProjectWithState extends Project {
    state: 'locked' | 'unlocked' | 'in-progress' | 'completed';
}

export interface StudentProgress {
    projectId: number;
    title: string;
    buildingId: number;
    buildingName: string;
    state: string | null;
}

export interface Rank {
    id: number;
    name: string;
    icon: string;
    threshold: number;
    orderIndex: number;
}

export interface CustomEmoji {
    id: number;
    name: string;
    url: string;
    type: 'image' | 'unicode';
    createdAt: string;
}

export interface StudentCoinInfo {
    coins: number;
    rank: Rank | null;
    nextRank: Rank | null;
    progress: number;
}

export interface Widget {
    id: number;
    name: string;
    description: string;
    entryFile: string;
    coverImage: string;
    createdAt: string;
}
