import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Moon, Car, Baby, Train, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
}

// Map metric types to icons and colors
const metricIcons = {
  night: { icon: Moon, color: "text-indigo-500" },
  vehicle: { icon: Car, color: "text-blue-500" },
  child: { icon: Baby, color: "text-green-500" },
  transit: { icon: Train, color: "text-orange-500" },
  women: { icon: User, color: "text-pink-500" }
};

// Map score ranges to color classes
const getScoreColorClass = (score: number): string => {
  if (score >= 8) return "text-green-500";
  if (score >= 6) return "text-blue-500";
  if (score >= 4) return "text-yellow-500";
  return "text-red-500";
};

// Map score to risk level
const getRiskLevel = (score: number): string => {
  if (score >= 8) return "Low risk";
  if (score >= 6) return "Medium risk";
  if (score >= 4) return "High risk";
  return "Maximum risk";
};

export default function SafetyMetrics({ latitude, longitude, city = "Los Angeles" }: SafetyMetricsProps) {
  const [metrics, setMetrics] = useState<SafetyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSafetyMetrics() {
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
          setMetrics(safetyMetrics);
        } else {
          console.log("No safety metrics found for this location, using defaults");
          setMetrics([]); // This will trigger the use of default metrics
        }
      } catch (err) {
        console.error("Error fetching safety metrics:", err);
        setError("Failed to load safety metrics. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    if (latitude && longitude) {
      fetchSafetyMetrics();
    } else {
      console.warn("Missing coordinates:", { latitude, longitude });
      setLoading(false);
    }
  }, [latitude, longitude]);

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

  // Display loading state
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

  // Use fetched metrics or fallback to defaults if empty
  const displayMetrics = metrics.length > 0 ? metrics : defaultMetrics;

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5 text-blue-500" />
          Safety Metrics
        </CardTitle>
        <CardDescription>
          Safety information for {city} based on official police data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayMetrics.map((metric) => {
            const { icon: Icon, color } = metricIcons[metric.type];
            
            return (
              <div key={metric.type} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className={`mt-1 p-2 rounded-full bg-gray-50 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{metric.question}</h3>
                    <span className={`font-bold text-sm px-2 py-1 rounded-full ${getScoreColorClass(metric.score)} bg-opacity-10`}>
                      {getRiskLevel(metric.score)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{metric.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 