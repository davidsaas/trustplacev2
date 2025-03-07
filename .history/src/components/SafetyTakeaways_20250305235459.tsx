import React from 'react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

export interface SafetyTakeawaysProps {
  takeaways: {
    positive_takeaway: string | null;
    negative_takeaway: string | null;
    neutral_takeaway: string | null;
  } | null;
  isLoading: boolean;
}

export default function SafetyTakeaways({ takeaways, isLoading }: SafetyTakeawaysProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }
  
  if (!takeaways || (!takeaways.positive_takeaway && !takeaways.negative_takeaway && !takeaways.neutral_takeaway)) {
    return null;
  }
  
  // Count how many takeaways we have to adjust the grid
  const takeawayCount = [
    takeaways.positive_takeaway, 
    takeaways.negative_takeaway, 
    takeaways.neutral_takeaway
  ].filter(Boolean).length;
  
  // Determine grid columns based on takeaway count
  const gridClass = takeawayCount === 1 
    ? "grid grid-cols-1" 
    : takeawayCount === 2 
      ? "grid grid-cols-1 md:grid-cols-2" 
      : "grid grid-cols-1 md:grid-cols-3";
  
  return (
    <div className={`${gridClass} gap-4 mb-6`}>
      {takeaways.positive_takeaway && (
        <Card className="p-4 border-l-4 border-l-emerald-500 bg-emerald-50 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-emerald-800 mb-1">Positive Takeaway</h4>
              <p className="text-emerald-700 text-sm">{takeaways.positive_takeaway}</p>
            </div>
          </div>
        </Card>
      )}
      
      {takeaways.negative_takeaway && (
        <Card className="p-4 border-l-4 border-l-rose-500 bg-rose-50 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-rose-800 mb-1">Safety Concern</h4>
              <p className="text-rose-700 text-sm">{takeaways.negative_takeaway}</p>
            </div>
          </div>
        </Card>
      )}
      
      {takeaways.neutral_takeaway && (
        <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-800 mb-1">Balanced View</h4>
              <p className="text-amber-700 text-sm">{takeaways.neutral_takeaway}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
} 