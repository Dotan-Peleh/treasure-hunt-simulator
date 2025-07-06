import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Target, TrendingUp, Clock } from 'lucide-react';

export default function ProgressTracker({ config, simulationResults }) {
  if (!simulationResults) return null;

  const formatGems = (gems) => `${gems?.toLocaleString()} 💎`;
  const formatPercentage = (value) => `${(value * 100).toFixed(1)}%`;
  const formatHours = (hours) => `${hours}h`;

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Event Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatPercentage(simulationResults.overall_completion_rate)}
              </div>
              <div className="text-sm text-gray-600">Completion Rate</div>
              <div className="text-xs text-gray-500">
                Target: {formatPercentage(config.target_completion_rate)}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatGems(simulationResults.average_gems_earned)}
              </div>
              <div className="text-sm text-gray-600">Avg Gems Earned</div>
              <div className="text-xs text-gray-500">
                Cap: {formatGems(config.daily_gem_cap)}/day
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatPercentage(simulationResults.average_progress)}
              </div>
              <div className="text-sm text-gray-600">Avg Progress</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatHours(config.duration_hours)}
              </div>
              <div className="text-sm text-gray-600">Event Duration</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Segment Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Player Segment Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {simulationResults.player_segments?.map((segment, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={segment.type === 'hardcore' ? 'default' : segment.type === 'regular' ? 'secondary' : 'outline'}>
                      {segment.type} ({formatPercentage(segment.percentage)})
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {formatGems(segment.gems_per_day)}/day
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatPercentage(segment.completion_rate)} complete</div>
                    <div className="text-sm text-gray-600">{formatPercentage(segment.average_progress)} avg</div>
                  </div>
                </div>
                <Progress value={segment.completion_rate * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Daily Progression Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {simulationResults.daily_timeline?.map((day, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Day {day.day}</h4>
                  <Badge variant="outline">{formatGems(day.gems_available)} available</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Casual Progress</div>
                    <div className="font-medium">{formatPercentage(day.casual_progress)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Regular Progress</div>
                    <div className="font-medium">{formatPercentage(day.regular_progress)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Hardcore Progress</div>
                    <div className="font-medium">{formatPercentage(day.hardcore_progress)}</div>
                  </div>
                </div>
                
                <Progress value={day.overall_progress * 100} className="mt-2 h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Economic Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Economic Balance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold">Gem Economy</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Gems Required:</span>
                  <span className="font-medium">{formatGems(config.total_gems_required)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Possible Gems:</span>
                  <span className="font-medium">{formatGems(config.daily_gem_cap * (config.duration_hours / 24))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completion Difficulty:</span>
                  <Badge variant={config.total_gems_required > config.daily_gem_cap * (config.duration_hours / 24) * 0.8 ? 'destructive' : 'default'}>
                    {config.total_gems_required > config.daily_gem_cap * (config.duration_hours / 24) * 0.8 ? 'High' : 'Balanced'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Item Chain Costs</h4>
              <div className="space-y-2 text-sm">
                {config.item_chains.map((chain, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{chain.chain_name}:</span>
                    <span className="font-medium">
                      {formatGems(Array.from({length: chain.levels}, (_, i) => 
                        Math.round(Math.pow(2, i) * chain.base_cost * chain.value_factor)
                      ).reduce((a, b) => a + b, 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}