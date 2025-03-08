export type SafetyMetric = {
    score: number;
    title: string;
    description: string;
};

export type SafetyMetrics = {
    district: string;
    city: string;
    night_safety: number;
    vehicle_safety: number;
    child_safety: number;
    transit_safety: number;
    women_safety: number;
    updated_at: string;
};

export const METRIC_DETAILS: Record<keyof Omit<SafetyMetrics, 'district' | 'city' | 'updated_at'>, { title: string; description: string }> = {
    night_safety: {
        title: "Can I go outside after dark?",
        description: "Assessment of safety for pedestrians during evening/night hours"
    },
    vehicle_safety: {
        title: "Can I park here safely?",
        description: "Evaluation of vehicle theft and break-in risks"
    },
    child_safety: {
        title: "Are kids safe here?",
        description: "Overall safety assessment for children in the area"
    },
    transit_safety: {
        title: "Is it safe to use public transport?",
        description: "Safety evaluation of transit locations and surroundings"
    },
    women_safety: {
        title: "Would I be harassed here?",
        description: "Assessment of crimes that disproportionately affect women"
    }
}; 