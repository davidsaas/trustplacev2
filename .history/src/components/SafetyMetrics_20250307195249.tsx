import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SafetyMetricType } from '@/lib/safety-insights/processor';
import { 
  AlertCircle, 
  Car, 
  Moon, 
  Baby, 
  Bus, 
  UserRound, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SafetyScore {
  score: number;
  color: string;
}

interface SafetyMetric {
  type: SafetyMetricType;
  title: string;
  description: string;
  score: SafetyScore;
}

interface DistrictSafetyMetrics {
  district: string;
  city: string;
  metrics: SafetyMetric[];
  lastUpdated: string;
  latitude?: number;
  longitude?: number;
}

interface SafetyMetricsProps {
  latitude: number;
  longitude: number;
  radius?: number;
}

const getIcon = (type: SafetyMetricType) => {
  switch (type) {
    case SafetyMetricType.NIGHT_SAFETY:
      return <Moon className="h-5 w-5" />;
    case SafetyMetricType.VEHICLE_SAFETY:
      return <Car className="h-5 w-5" />;
    case SafetyMetricType.CHILD_SAFETY:
      return <Baby className="h-5 w-5" />;
    case SafetyMetricType.TRANSIT_SAFETY:
      return <Bus className="h-5 w-5" />;
    case SafetyMetricType.WOMEN_SAFETY:
      return <UserRound className="h-5 w-5" />;
    default:
      return <AlertCircle className="h-5 w-5" />;
  }
};

const SafetyMetricCard = ({ metric }: { metric: SafetyMetric }) => {
  const [expanded, setExpanded] = useState(false);
  
  const handleToggle = () => {
    setExpanded(!expanded);
  };
  
  // Convert number score to text representation
  const getScoreText = (score: number) => {
    if (score >= 8) return "Very Safe";
    if (score >= 6) return "Safe";
    if (score >= 5) return "Moderate";
    if (score >= 3) return "Concerning";
    return "Use Caution";
  };
  
  return (
    <Card className="overflow-hidden transition-all duration-200">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={handleToggle}
        onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
        tabIndex={0}
        aria-label={`${metric.title} - Safety score: ${metric.score.score}/10`}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-full"
            style={{ backgroundColor: `${metric.score.color}25` }}
          >
            {getIcon(metric.type)}
          </div>
          <div>
            <h3 className="font-medium">{metric.title}</h3>
            {!expanded && (
              <Badge 
                variant="outline" 
                className="mt-1 font-medium"
                style={{ 
                  color: metric.score.color, 
                  borderColor: metric.score.color,
                  backgroundColor: `${metric.score.color}15`
                }}
              >
                {getScoreText(metric.score.score)} ({metric.score.score}/10)
              </Badge>
            )}
          </div>
        </div>
        {expanded ? 
          <ChevronUp className="h-5 w-5 text-slate-400" /> : 
          <ChevronDown className="h-5 w-5 text-slate-400" />
        }
      </div>
      
      {expanded && (
        <CardContent className="pt-0 pb-4 px-4 border-t">
          <div className="flex items-center mb-3 mt-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full" 
                style={{ 
                  width: `${metric.score.score * 10}%`, 
                  backgroundColor: metric.score.color 
                }}
              />
            </div>
            <span 
              className="ml-3 font-semibold" 
              style={{ color: metric.score.color }}
            >
              {metric.score.score}/10
            </span>
          </div>
          <p className="text-sm text-slate-600">{metric.description}</p>
        </CardContent>
      )}
    </Card>
  );
};

export default function SafetyMetrics({ latitude, longitude, radius = 2 }: SafetyMetricsProps) {
  const [metrics, setMetrics] = useState<DistrictSafetyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!latitude || !longitude) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/safety-metrics?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch safety metrics');
        }
        
        const data = await response.json();
        
        if (data.success && data.metrics) {
          setMetrics(data.metrics);
        } else {
          throw new Error(data.message || 'No metrics found for this location');
        }
      } catch (err) {
        console.error('Error fetching safety metrics:', err);
        setError('Failed to load safety metrics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, [latitude, longitude, radius]);
  
  // Format the last updated date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4 rounded" />
        <Skeleton className="h-24 w-full rounded" />
        <Skeleton className="h-24 w-full rounded" />
        <Skeleton className="h-24 w-full rounded" />
        <Skeleton className="h-24 w-full rounded" />
        <Skeleton className="h-24 w-full rounded" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
        <p className="text-rose-700">{error}</p>
      </div>
    );
  }
  
  if (!metrics) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-500 text-center">No safety metrics available for this location.</p>
      </div>
    );
  }
  
  // Calculate overall safety score (average of all metrics)
  const overallScore = metrics.metrics.reduce((sum, metric) => sum + metric.score.score, 0) / metrics.metrics.length;
  
  // Get color for overall score
  const getOverallScoreColor = (score: number) => {
    if (score >= 8) return "#22c55e"; // Green
    if (score >= 6) return "#84cc16"; // Light green
    if (score >= 5) return "#facc15"; // Yellow
    if (score >= 3) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };
  
  const overallScoreColor = getOverallScoreColor(overallScore);
  
  return (
    <div className="space-y-4">
      <Card className="bg-slate-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex justify-between items-center">
            <span>Safety Metrics for {metrics.district}</span>
            <Badge 
              variant="outline" 
              className="font-medium text-sm"
              style={{ 
                color: overallScoreColor, 
                borderColor: overallScoreColor,
                backgroundColor: `${overallScoreColor}15`
              }}
            >
              {Math.round(overallScore * 10) / 10}/10
            </Badge>
          </CardTitle>
          <CardDescription>
            Based on official police data, last updated {formatDate(metrics.lastUpdated)}
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="space-y-3">
        {metrics.metrics.map((metric) => (
          <SafetyMetricCard key={metric.type} metric={metric} />
        ))}
      </div>
      
      <p className="text-xs text-slate-500 text-center mt-2">
        Safety metrics are calculated based on police incident data from the past 12 months.
      </p>
    </div>
  );
} 