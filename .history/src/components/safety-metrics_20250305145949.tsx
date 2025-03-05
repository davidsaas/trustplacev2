"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calculateSafetyMetrics } from '@/lib/osm';
import { Skeleton } from '@/components/ui/skeleton';

interface SafetyMetricsProps {
  latitude: number;
  longitude: number;
}

export function SafetyMetrics({ latitude, longitude }: SafetyMetricsProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const data = await calculateSafetyMetrics(latitude, longitude);
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching safety metrics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [latitude, longitude]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Area Safety Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-4 w-64" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Area Safety Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(metrics).map(([key, value]: [string, any]) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <span className="text-sm font-medium">{Math.round(value.score)}%</span>
            </div>
            <Progress
              value={value.score}
              className={`h-2 ${getScoreColor(value.score)}`}
            />
            <ul className="text-sm text-muted-foreground list-disc list-inside">
              {value.details.map((detail: string, index: number) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
} 