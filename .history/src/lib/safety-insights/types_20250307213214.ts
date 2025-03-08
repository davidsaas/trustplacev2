export type SafetyScore = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface SafetyMetric {
    score: SafetyScore;
    title: string;
    description: string;
}

export interface SafetyMetrics {
    district: string;
    metrics: {
        night_safety: number;
        vehicle_safety: number;
        child_safety: number;
        transit_safety: number;
        women_safety: number;
    };
    last_updated: string;
}

export const SAFETY_METRIC_QUESTIONS = {
    night_safety: "Can I go outside after dark?",
    vehicle_safety: "Can I park here safely?",
    child_safety: "Are kids safe here?",
    transit_safety: "Is it safe to use public transport?",
    women_safety: "Would I be harassed here?"
} as const;

export const SAFETY_METRIC_DESCRIPTIONS = {
    night_safety: "Safety for pedestrians during evening/night hours",
    vehicle_safety: "Risk of vehicle theft and break-ins",
    child_safety: "Overall safety concerning crimes that could affect children",
    transit_safety: "Safety at and around transit locations",
    women_safety: "Assessment of crimes that disproportionately affect women"
} as const; 