import { useState } from 'react';
import { SafetyMetrics, SAFETY_METRIC_QUESTIONS, SAFETY_METRIC_DESCRIPTIONS } from '@/lib/safety-insights/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface SafetyMetricsCardProps {
    metrics: SafetyMetrics;
}

const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
};

const SafetyMetricsCard = ({ metrics }: SafetyMetricsCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleToggle = () => setIsExpanded(!isExpanded);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
        }
    };

    return (
        <Card className="w-full bg-white shadow-lg rounded-lg overflow-hidden">
            <CardHeader className="space-y-1 p-6">
                <CardTitle className="text-2xl font-bold text-gray-900">Safety Metrics</CardTitle>
                <CardDescription className="text-gray-500">
                    Last updated: {format(new Date(metrics.last_updated), 'MMM d, yyyy')}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
                {Object.entries(metrics.metrics).map(([key, score], index) => {
                    const metricKey = key as keyof typeof SAFETY_METRIC_QUESTIONS;
                    const question = SAFETY_METRIC_QUESTIONS[metricKey];
                    const description = SAFETY_METRIC_DESCRIPTIONS[metricKey];
                    const scoreColor = getScoreColor(score);

                    return (
                        <div
                            key={key}
                            className={`space-y-2 ${index !== 0 ? 'pt-4 border-t border-gray-100' : ''}`}
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">{question}</h3>
                                <span className={`text-xl font-bold ${scoreColor}`}>
                                    {Math.round(score)}/10
                                </span>
                            </div>
                            {isExpanded && (
                                <p className="text-gray-600">{description}</p>
                            )}
                        </div>
                    );
                })}
                
                <Button
                    variant="ghost"
                    className="w-full mt-4 flex items-center justify-center text-gray-600 hover:text-gray-900"
                    onClick={handleToggle}
                    onKeyDown={handleKeyDown}
                    aria-label={isExpanded ? "Show less safety metrics details" : "Show more safety metrics details"}
                    tabIndex={0}
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Show Less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Show More
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};

export default SafetyMetricsCard; 