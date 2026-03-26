// Shared TypeScript interfaces for the KidsAcademy application

export interface User {
    id: number;
    username: string;
    role: 'teacher' | 'student';
    name?: string;
    avatar?: string;
}

export interface AuthUser extends User {
    token: string;
}

export interface Quiz {
    question: string;
    options: string[];
    correctOptionIndex?: number;
    correctOptionIndices?: number[];
    isMultiSelect?: boolean;
}

export interface ProjectSegment {
    id?: number;
    projectId?: number;
    title?: string;
    content: string;
    quizzes: Quiz[] | string;
    isPublished: boolean | number;
    isLocked: boolean | number;
    orderIndex: number;
}

export interface Project {
    id: number;
    buildingId: number;
    title: string;
    description: string;
    scratchFileUrl: string;
    scratchProjectId: string;
    coverImage: string;
    isLocked: boolean | number;
    orderIndex: number;
    segments?: ProjectSegment[];
    buildingName?: string;
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

export interface StudentCoinInfo {
    coins: number;
    rank: Rank | null;
    nextRank: Rank | null;
    progress: number;
}
