import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SafetyMetrics, METRIC_DETAILS } from '@/lib/safety-insights/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SafetyMetricsProps {
    district: string;
    city: string;
}

const SafetyMetricsCard = ({ district, city }: SafetyMetricsProps) => {
    const [metrics, setMetrics] = useState<SafetyMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const { data, error } = await supabase
                    .from('safety_metrics')
                    .select('*')
                    .eq('district', district)
                    .eq('city', city)
                    .single();

                if (error) throw error;
                setMetrics(data);
            } catch (error) {
                console.error('Error fetching safety metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [district, city]);

    const getScoreColor = (score: number) => {
        if (score >= 7) return 'bg-green-500';
        if (score >= 4) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    if (loading) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">
                        <Skeleton className="h-6 w-48" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="mb-4">
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-2 w-full" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (!metrics) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Safety Metrics Unavailable</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">
                        Safety metrics are currently unavailable for this location.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Safety Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.entries(METRIC_DETAILS).map(([key, details]) => {
                    const score = metrics[key as keyof SafetyMetrics] as number;
                    return (
                        <div key={key} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <h3 className="font-medium">{details.title}</h3>
                                <span className="text-sm font-semibold">{score.toFixed(1)}/10</span>
                            </div>
                            <Progress 
                                value={score * 10} 
                                className={`h-2 ${getScoreColor(score)}`}
                            />
                            <p className="text-sm text-gray-500">{details.description}</p>
                        </div>
                    );
                })}
                <p className="text-xs text-gray-400 mt-4">
                    Last updated: {new Date(metrics.updated_at).toLocaleDateString()}
                </p>
            </CardContent>
        </Card>
    );
};

export default SafetyMetricsCard; 