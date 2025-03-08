import React, { useState } from 'react';
import { 
  DistrictSafetyMetrics, 
  SafetyMetrics as SafetyMetricsType,
  getSafetyScoreColor
} from '@/lib/safety-insights/safety-metrics';

interface SafetyMetricsProps {
  districtMetrics: DistrictSafetyMetrics | null;
  isLoading?: boolean;
}

const SafetyMetrics: React.FC<SafetyMetricsProps> = ({ 
  districtMetrics, 
  isLoading = false 
}) => {
  const [expandedMetrics, setExpandedMetrics] = useState<string[]>(['night_safety']);

  const toggleMetric = (metricId: string) => {
    setExpandedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId) 
        : [...prev, metricId]
    );
  };

  if (isLoading) {
    return (
      <div className="w-full border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="space-y-2 mb-4">
          <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </div>
        <div className="flex flex-col space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col space-y-2 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!districtMetrics) {
    return (
      <div className="w-full border border-gray-200 rounded-lg p-4 shadow-sm">
        <p className="text-gray-500 text-center py-4">
          Safety information not available for this location.
        </p>
      </div>
    );
  }

  const { metrics, district, city, lastUpdated } = districtMetrics;
  const lastUpdatedDate = new Date(lastUpdated);
  const formattedDate = lastUpdatedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Sort metrics by score in descending order (safest first)
  const sortedMetrics = Object.entries(metrics)
    .sort(([, a], [, b]) => b.score - a.score);

  return (
    <div className="w-full border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Safety Metrics</h2>
        <p className="text-gray-600 text-sm">
          {district}, {city}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Last updated: {formattedDate}
        </p>
      </div>

      <div className="space-y-3">
        {sortedMetrics.map(([key, metric]) => (
          <div 
            key={key} 
            className="border border-gray-200 rounded-md overflow-hidden"
          >
            {/* Header - Always visible */}
            <div 
              className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer"
              onClick={() => toggleMetric(key)}
            >
              <div className="font-medium text-left">{metric.title}</div>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-lg ${getSafetyScoreColor(metric.score)}`}>
                  {metric.score.toFixed(1)}
                </span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className={`transition-transform ${expandedMetrics.includes(key) ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>

            {/* Content - Visible when expanded */}
            {expandedMetrics.includes(key) && (
              <div className="p-3 border-t border-gray-200">
                <p className="text-gray-700 mb-4">{metric.description}</p>
                
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${getProgressBarColor(metric.score)}`} 
                      style={{ width: `${(metric.score / 10) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Less Safe</span>
                    <span>More Safe</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to get the appropriate color for progress bars
const getProgressBarColor = (score: number): string => {
  if (score >= 8) return 'bg-green-500';
  if (score >= 6) return 'bg-emerald-500';
  if (score >= 5) return 'bg-yellow-500';
  if (score >= 3) return 'bg-orange-500';
  return 'bg-red-500';
};

export default SafetyMetrics; 