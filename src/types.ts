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

export interface Project {
    id: number;
    buildingId: number;
    title: string;
    description: string;
    content: string;
    scratchFileUrl: string;
    scratchProjectId: string;
    coverImage: string;
    isLocked: boolean | number;
    orderIndex: number;
    quizzes: Quiz[] | string;
    buildingName?: string;
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
