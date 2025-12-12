/**
 * NewsTimeline Component
 * Displays adverse events in a timeline format
 * Requirements: 6.1, 6.3 - Adverse event monitoring and risk assessment
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Newspaper,
  Scale,
  TrendingDown,
  UserMinus,
  FileWarning,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calendar,
  Shield,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../common/Card';
import type { AdverseEvent } from '../../types';

interface NewsTimelineProps {
  events: AdverseEvent[];
  maxItems?: number;
  showRiskScore?: boolean;
  onEventClick?: (event: AdverseEvent) => void;
}

const EVENT_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  news: { icon: Newspaper, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  regulatory: { icon: Scale, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  credit_rating_downgrade: { icon: TrendingDown, color: 'text-red-600', bgColor: 'bg-red-100' },
  executive_change: { icon: UserMinus, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  litigation: { icon: FileWarning, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  other: { icon: AlertTriangle, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

const getRiskColor = (score: number): string => {
  if (score >= 8) return 'bg-red-500';
  if (score >= 6) return 'bg-orange-500';
  if (score >= 4) return 'bg-yellow-500';
  return 'bg-green-500';
};

const getRiskLabel = (score: number): string => {
  if (score >= 8) return 'Critical';
  if (score >= 6) return 'High';
  if (score >= 4) return 'Medium';
  return 'Low';
};

interface TimelineItemProps {
  event: AdverseEvent;
  showRiskScore: boolean;
  isLast: boolean;
  onClick?: () => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ event, showRiskScore, isLast, onClick }) => {
  const [expanded, setExpanded] = useState(false);
  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.other;
  const Icon = config.icon;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="relative pl-8 pb-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" />
      )}

      {/* Timeline dot */}
      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center`}>
        <Icon className={`h-3 w-3 ${config.color}`} />
      </div>

      {/* Content */}
      <div
        className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${
          onClick ? 'cursor-pointer' : ''
        }`}
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                {event.event_type.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(event.event_date)}
              </span>
              {event.gemini_analyzed && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  AI Analyzed
                </span>
              )}
            </div>
            <h4 className="mt-2 font-medium text-gray-900 line-clamp-2">{event.headline}</h4>
          </div>

          {showRiskScore && event.risk_score !== undefined && (
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full ${getRiskColor(event.risk_score)} flex items-center justify-center`}>
                <span className="text-white font-bold text-sm">{event.risk_score}</span>
              </div>
              <span className="text-xs text-gray-500 mt-1">{getRiskLabel(event.risk_score)}</span>
            </div>
          )}
        </div>

        {/* Description (expandable) */}
        {event.description && (
          <div className="mt-3">
            <p className={`text-sm text-gray-600 ${expanded ? '' : 'line-clamp-2'}`}>
              {event.description}
            </p>
            {event.description.length > 150 && (
              <button
                className="mt-1 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Read more
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Source link */}
        {event.source_url && (
          <a
            href={event.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            View source
          </a>
        )}
      </div>
    </div>
  );
};

const NewsTimeline: React.FC<NewsTimelineProps> = ({
  events,
  maxItems = 10,
  showRiskScore = true,
  onEventClick,
}) => {
  const [showAll, setShowAll] = useState(false);

  // Sort events by date (most recent first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );

  const displayedEvents = showAll ? sortedEvents : sortedEvents.slice(0, maxItems);
  const hasMore = sortedEvents.length > maxItems;

  // Calculate risk summary
  const riskSummary = React.useMemo(() => {
    if (events.length === 0) return null;

    const scores = events.map((e) => e.risk_score || 0);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highRiskCount = scores.filter((s) => s >= 7).length;

    return {
      avgScore: avgScore.toFixed(1),
      highRiskCount,
      totalEvents: events.length,
    };
  }, [events]);

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">News & Events Timeline</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Newspaper className="h-12 w-12 mb-3 text-gray-300" />
            <p>No adverse events recorded</p>
            <p className="text-sm text-gray-400 mt-1">Events will appear here when detected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">News & Events Timeline</h3>
        </div>
        {riskSummary && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              {riskSummary.totalEvents} events
            </span>
            {riskSummary.highRiskCount > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                {riskSummary.highRiskCount} high risk
              </span>
            )}
            <span className="text-gray-500">
              Avg: <span className="font-medium">{riskSummary.avgScore}/10</span>
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative">
          {displayedEvents.map((event, index) => (
            <TimelineItem
              key={event.id}
              event={event}
              showRiskScore={showRiskScore}
              isLast={index === displayedEvents.length - 1}
              onClick={onEventClick ? () => onEventClick(event) : undefined}
            />
          ))}
        </div>

        {hasMore && (
          <div className="text-center pt-4 border-t border-gray-100">
            <button
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mx-auto"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show all {sortedEvents.length} events
                </>
              )}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsTimeline;
