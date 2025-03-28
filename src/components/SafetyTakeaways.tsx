import React from 'react';
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
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }
  
  if (!takeaways || (!takeaways.positive_takeaway && !takeaways.negative_takeaway && !takeaways.neutral_takeaway)) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      {takeaways.positive_takeaway && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-emerald-800 mb-1">Positive Takeaway</h4>
              <p className="text-emerald-700 text-sm">{takeaways.positive_takeaway}</p>
            </div>
          </div>
        </div>
      )}
      
      {takeaways.negative_takeaway && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-rose-800 mb-1">Safety Concern</h4>
              <p className="text-rose-700 text-sm">{takeaways.negative_takeaway}</p>
            </div>
          </div>
        </div>
      )}
      
      {takeaways.neutral_takeaway && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-800 mb-1">Balanced View</h4>
              <p className="text-amber-700 text-sm">{takeaways.neutral_takeaway}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 