import React, { useState } from 'react';
import { 
  DistrictSafetyMetrics, 
  SafetyMetrics as SafetyMetricsType,
  getSafetyScoreColor,
  isSafetyDataStale
} from '@/lib/safety-insights/safety-metrics';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { formatDistanceToNow } from 'date-fns';

interface SafetyMetricsProps {
  districtMetrics: DistrictSafetyMetrics | null;
  isLoading?: boolean;
}

const SafetyMetrics: React.FC<SafetyMetricsProps> = ({ 
  districtMetrics, 
  isLoading = false 
}) => {
  const [defaultOpen, setDefaultOpen] = useState<string[]>(['night_safety']);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Safety Metrics</CardTitle>
          <CardDescription>Loading safety information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!districtMetrics) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Safety Metrics</CardTitle>
          <CardDescription>Safety information not available for this location</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">
            We currently don't have safety data for this area. Try searching for a location in Los Angeles.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { metrics, district, city, lastUpdated } = districtMetrics;
  const isStale = isSafetyDataStale(lastUpdated);
  const lastUpdatedText = formatDistanceToNow(new Date(lastUpdated), { addSuffix: true });

  // Sort metrics by score in descending order (safest first)
  const sortedMetrics = Object.entries(metrics)
    .sort(([, a], [, b]) => b.score - a.score);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">Safety Metrics</CardTitle>
            <CardDescription>
              {district}, {city}
            </CardDescription>
          </div>
          {isStale && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <InfoCircledIcon className="h-3 w-3 mr-1" />
              Data may be outdated
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Last updated: {lastUpdatedText}
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
          {sortedMetrics.map(([key, metric]) => (
            <SafetyMetricItem 
              key={key} 
              id={key} 
              metric={metric} 
              onOpenChange={(isOpen) => {
                if (isOpen && !defaultOpen.includes(key)) {
                  setDefaultOpen([...defaultOpen, key]);
                }
              }}
            />
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

interface SafetyMetricItemProps {
  id: string;
  metric: SafetyMetricsType[keyof SafetyMetricsType];
  onOpenChange?: (isOpen: boolean) => void;
}

const SafetyMetricItem: React.FC<SafetyMetricItemProps> = ({ 
  id, 
  metric,
  onOpenChange 
}) => {
  const scoreColor = getSafetyScoreColor(metric.score);
  
  return (
    <AccordionItem value={id} className="border-b">
      <AccordionTrigger 
        className="py-4 hover:no-underline" 
        onOpenChange={onOpenChange}
      >
        <div className="flex flex-row items-center justify-between w-full pr-4">
          <span className="font-medium text-left">{metric.title}</span>
          <span className={`font-bold text-lg ${scoreColor}`}>
            {metric.score.toFixed(1)}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 pt-1">
        <p className="text-gray-700">{metric.description}</p>
        
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
      </AccordionContent>
    </AccordionItem>
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