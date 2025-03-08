import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Moon, Car, Users, Bus, Heart } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SafetyMetric {
  score: number;
  title: string;
  description: string;
}

interface SafetyMetricsData {
  nightSafety: SafetyMetric;
  vehicleSafety: SafetyMetric;
  childSafety: SafetyMetric;
  transitSafety: SafetyMetric;
  womenSafety: SafetyMetric;
  district: string;
  city: string;
  lastUpdated: string;
}

interface SafetyMetricsProps {
  latitude: number;
  longitude: number;
}

export default function SafetyMetrics({ latitude, longitude }: SafetyMetricsProps) {
  const [metrics, setMetrics] = useState<SafetyMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSafetyMetrics = async () => {
      if (!latitude || !longitude) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/safety-metrics?latitude=${latitude}&longitude=${longitude}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch safety metrics');
        }
        
        const data = await response.json();
        
        if (data.success && data.metrics) {
          setMetrics(data.metrics);
        } else {
          throw new Error(data.error || 'Failed to load safety metrics');
        }
      } catch (err) {
        console.error('Error fetching safety metrics:', err);
        setError('Failed to load safety metrics for this location');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSafetyMetrics();
  }, [latitude, longitude]);

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Helper function to get score color
  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-emerald-500";
    if (score >= 6) return "bg-emerald-400";
    if (score >= 5) return "bg-amber-400";
    if (score >= 3) return "bg-orange-400";
    return "bg-rose-500";
  };

  // Helper function to get score badge color
  const getScoreBadgeColor = (score: number) => {
    if (score >= 8) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 6) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 5) return "bg-amber-50 text-amber-700 border-amber-200";
    if (score >= 3) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  // Helper function to get icon
  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'nightSafety':
        return <Moon className="h-5 w-5" />;
      case 'vehicleSafety':
        return <Car className="h-5 w-5" />;
      case 'childSafety':
        return <Users className="h-5 w-5" />;
      case 'transitSafety':
        return <Bus className="h-5 w-5" />;
      case 'womenSafety':
        return <Heart className="h-5 w-5" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle>Safety Metrics</CardTitle>
          <CardDescription>
            Information about safety in this area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-rose-700">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Safety Metrics</CardTitle>
          <CardDescription>
            Information about safety in this area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-500 text-center">No safety metrics available for this location.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metricTypes = [
    { key: 'nightSafety', label: 'Night Safety' },
    { key: 'vehicleSafety', label: 'Vehicle Safety' },
    { key: 'childSafety', label: 'Child Safety' },
    { key: 'transitSafety', label: 'Transit Safety' },
    { key: 'womenSafety', label: "Women's Safety" }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Safety Metrics</CardTitle>
            <CardDescription>
              {metrics.district}, {metrics.city} • Updated {formatDate(metrics.lastUpdated)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metricTypes.map((type) => {
            const metric = metrics[type.key as keyof SafetyMetricsData] as SafetyMetric;
            return (
              <div key={type.key} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getMetricIcon(type.key)}
                    <h3 className="font-medium">{metric.title}</h3>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getScoreBadgeColor(metric.score)}
                  >
                    {metric.score}/10
                  </Badge>
                </div>
                <Progress 
                  value={metric.score * 10} 
                  className={cn("h-2 mb-2", {
                    "[&>div]:bg-emerald-500": metric.score >= 8,
                    "[&>div]:bg-emerald-400": metric.score >= 6 && metric.score < 8,
                    "[&>div]:bg-amber-400": metric.score >= 5 && metric.score < 6,
                    "[&>div]:bg-orange-400": metric.score >= 3 && metric.score < 5,
                    "[&>div]:bg-rose-500": metric.score < 3,
                  })} 
                />
                <p className="text-sm text-gray-600 mt-2">{metric.description}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 