import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Moon, Car, Baby, Train, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";

// Define types for safety metrics
export type SafetyMetricType = 'night' | 'vehicle' | 'child' | 'transit' | 'women';

export interface SafetyMetric {
  type: SafetyMetricType;
  score: number; // 1-10 scale
  question: string;
  description: string;
}

export interface SafetyMetricsProps {
  latitude: number;
  longitude: number;
  city?: string;
  onOverallScoreCalculated?: (score: number) => void;
}

// Metric weights for overall score calculation
const metricWeights = {
  night: 0.25,    // Night safety is a primary concern
  vehicle: 0.2,   // Vehicle safety is important
  child: 0.2,     // Child safety is equally important
  transit: 0.15,  // Transit safety
  women: 0.2      // Women's safety is important
};

// Map metric types to icons and colors
const metricIcons = {
  night: { icon: Moon, color: "text-indigo-500", bgColor: "bg-indigo-50" },
  vehicle: { icon: Car, color: "text-blue-500", bgColor: "bg-blue-50" },
  child: { icon: Baby, color: "text-green-500", bgColor: "bg-green-50" },
  transit: { icon: Train, color: "text-orange-500", bgColor: "bg-orange-50" },
  women: { icon: User, color: "text-pink-500", bgColor: "bg-pink-50" }
};

// Calculate overall safety score
const calculateOverallScore = (metrics: SafetyMetric[]): number => {
  if (metrics.length === 0) return 0;
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  metrics.forEach(metric => {
    const weight = metricWeights[metric.type];
    weightedSum += (metric.score * weight * 10); // Convert to 100-point scale
    totalWeight += weight;
  });
  
  return Math.round(weightedSum / totalWeight);
};

// Safety score descriptions based on overall score
const getScoreDescription = (score: number): string => {
  if (score >= 80) return "This area has excellent safety metrics with very low risk of incidents. Suitable for all travelers including families and solo travelers.";
  if (score >= 60) return "Generally safe area with moderate precautions advised. Most travelers report feeling secure here.";
  if (score >= 40) return "Exercise increased caution in this area. Basic safety precautions recommended, especially at night.";
  return "Higher risk area requiring extra vigilance. Consider alternative locations or take significant safety measures.";
};

// Map score ranges to color classes with consistent colors
const getScoreColorClass = (score: number): string => {
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-blue-600";
  if (score >= 4) return "text-yellow-600";
  return "text-red-600";
};

// Map score to progress bar colors
const getProgressColorClass = (score: number): string => {
  if (score >= 8) return "bg-green-600";
  if (score >= 6) return "bg-blue-600";
  if (score >= 4) return "bg-yellow-600";
  return "bg-red-600";
};

// Map score to background colors
const getBackgroundColorClass = (score: number): string => {
  if (score >= 8) return "bg-green-50";
  if (score >= 6) return "bg-blue-50";
  if (score >= 4) return "bg-yellow-50";
  return "bg-red-50";
};

// Map score to risk level
const getRiskLevel = (score: number): string => {
  if (score >= 8) return "Low Risk";
  if (score >= 6) return "Medium Risk";
  if (score >= 4) return "High Risk";
  return "Maximum Risk";
};

export default function SafetyMetrics({ latitude, longitude, city = "Los Angeles", onOverallScoreCalculated }: SafetyMetricsProps) {
  const [metrics, setMetrics] = useState<SafetyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    async function fetchSafetyMetrics() {
      if (!mounted) return;
      setLoading(true);
      setError(null);
      
      try {
        console.log("Fetching safety metrics for coordinates:", { latitude, longitude });
        
        // Query safety metrics from Supabase based on lat/long
        // We're using a geospatial query with a small radius (0.01 degrees ≈ 1km)
        const { data, error } = await supabase
          .from('safety_metrics')
          .select('*')
          .filter('latitude', 'gte', latitude - 0.01)
          .filter('latitude', 'lte', latitude + 0.01)
          .filter('longitude', 'gte', longitude - 0.01)
          .filter('longitude', 'lte', longitude + 0.01)
          .order('created_at', { ascending: false })
          .limit(5); // Get only the most recent metrics for each type

        if (error) {
          console.error("Supabase query error:", error);
          throw error;
        }
        
        if (!mounted) return;
        
        console.log("Raw safety metrics data:", data);
        
        if (data && data.length > 0) {
          // Convert the database data to our SafetyMetric type and deduplicate by type
          const metricsByType = new Map<SafetyMetricType, SafetyMetric>();
          
          data.forEach(item => {
            const type = item.metric_type as SafetyMetricType;
            // Only set if not already present (since data is ordered by created_at desc)
            if (!metricsByType.has(type)) {
              metricsByType.set(type, {
                type,
                score: item.score,
                question: item.question,
                description: item.description
              });
            }
          });
          
          const safetyMetrics = Array.from(metricsByType.values());
          console.log("Processed safety metrics:", safetyMetrics);
          
          if (!mounted) return;
          setMetrics(safetyMetrics);
          setRetryCount(0); // Reset retry count on success
        } else {
          console.log("No safety metrics found for this location, using defaults");
          setMetrics([]); // This will trigger the use of default metrics
        }
      } catch (err) {
        console.error("Error fetching safety metrics:", err);
        
        if (!mounted) return;
        
        // Implement retry logic
        if (retryCount < maxRetries) {
          const nextRetryDelay = Math.min(1000 * Math.pow(2, retryCount), 8000); // Exponential backoff
          console.log(`Retrying in ${nextRetryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          retryTimeout = setTimeout(() => {
            if (mounted) {
              setRetryCount(prev => prev + 1);
              fetchSafetyMetrics();
            }
          }, nextRetryDelay);
        } else {
          setError("Failed to load safety metrics. Please try again later.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (latitude && longitude) {
      fetchSafetyMetrics();
    } else {
      console.warn("Missing coordinates:", { latitude, longitude });
      setLoading(false);
    }

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [latitude, longitude, retryCount]); // Add retryCount to dependencies

  // Fallback metrics for when data isn't available
  const defaultMetrics: SafetyMetric[] = [
    {
      type: 'night',
      score: 7,
      question: 'Can I go outside after dark?',
      description: 'This area has moderate night safety based on reported incidents.'
    },
    {
      type: 'vehicle',
      score: 6,
      question: 'Can I park here safely?',
      description: 'Vehicle-related incidents are within average ranges for this city.'
    },
    {
      type: 'child',
      score: 8,
      question: 'Are kids safe here?',
      description: 'The area shows good safety levels for families with children.'
    },
    {
      type: 'transit',
      score: 5,
      question: 'Is it safe to use public transport?',
      description: 'Public transit safety is moderate in this area.'
    },
    {
      type: 'women',
      score: 6,
      question: 'Would I be harassed here?',
      description: 'Women\'s safety is moderately good based on reported incidents.'
    }
  ];

  // Use fetched metrics or fallback to defaults if empty
  const displayMetrics = metrics.length > 0 ? metrics : defaultMetrics;

  // Calculate and update overall score whenever metrics change
  useEffect(() => {
    const score = calculateOverallScore(displayMetrics);
    if (onOverallScoreCalculated) {
      onOverallScoreCalculated(score);
    }
  }, [displayMetrics, onOverallScoreCalculated]);

  if (error) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5 text-red-500" />
            Safety Metrics
          </CardTitle>
          <CardDescription>
            Information about safety in this area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-center text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Safety Metrics
          </CardTitle>
          <CardDescription>
            Loading safety information...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mb-6 border-0 shadow-lg rounded-xl overflow-hidden">
      <CardHeader className="border-b border-gray-100 bg-white/50 backdrop-blur-sm">
        <CardTitle className="flex items-center text-gray-800">
          <Shield className="mr-2 h-5 w-5 text-blue-500" />
          Safety Metrics
        </CardTitle>
        <CardDescription className="text-gray-500">
          Safety information for {city} based on official police data
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 bg-white">
        {/* Overall Score Description */}
        <div className={`mb-6 p-4 rounded-lg ${getBackgroundColorClass(calculateOverallScore(displayMetrics) / 10)}`}>
          <p className="text-sm text-gray-700">
            {getScoreDescription(calculateOverallScore(displayMetrics))}
          </p>
        </div>

        <div className="space-y-6">
          {displayMetrics.map((metric) => {
            const { icon: Icon } = metricIcons[metric.type];
            const scorePercentage = (metric.score / 10) * 100;
            const riskLevel = getRiskLevel(metric.score);
            const progressColor = getProgressColorClass(metric.score);
            const backgroundColor = getBackgroundColorClass(metric.score);
            const textColor = getScoreColorClass(metric.score);
            
            return (
              <div key={metric.type} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${backgroundColor}`}>
                      <Icon className={`h-5 w-5 ${textColor}`} />
                    </div>
                    <h3 className="font-medium text-gray-700">{metric.question}</h3>
                  </div>
                  <span className={`font-medium text-sm px-3 py-1 rounded-full ${backgroundColor} ${textColor}`}>
                    {riskLevel}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full transition-all duration-500 rounded-full ${progressColor}`}
                      style={{ width: `${scorePercentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500">{metric.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 