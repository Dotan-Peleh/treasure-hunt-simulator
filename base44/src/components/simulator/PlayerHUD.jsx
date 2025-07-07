
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Zap, Target, TrendingUp, TrendingDown, Route, HelpCircle } from 'lucide-react';
import PropTypes from 'prop-types';

export default function PlayerHUD({ playerState, progressData, pathAnalysis, onHintClick, hintActive }) {
  const progressPercentage = progressData?.completion_percentage || 0;
  
  return (
    <div className="space-y-4">
      <Card className="sticky top-4 z-10">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-500" />
              <span className="text-3xl font-bold">{playerState.credits.toLocaleString()}</span>
              <span className="text-sm text-slate-500">Energy</span>
          </div>
          <div className="w-full md:w-1/2 flex items-center gap-3">
              <Target className="w-6 h-6 text-blue-500" />
              <div className="w-full">
                  <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Progress to Goal</span>
                      <span className="text-sm font-bold text-blue-500">{progressPercentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
              </div>
          </div>
          <Button onClick={onHintClick} variant="outline" disabled={hintActive}>
            <HelpCircle className="w-4 h-4 mr-2" />
            Hint (-25)
          </Button>
        </CardContent>
      </Card>

      {pathAnalysis && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Route className="w-5 h-5" />
              Path Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-md">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <div>
                  <div className="font-bold">Easiest Path</div>
                  <div className="text-slate-600">{pathAnalysis.shortest_path.toFixed(0)} energy</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-md">
                <Route className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="font-bold">Average Path</div>
                  <div className="text-slate-600">{pathAnalysis.average_path.toFixed(0)} energy</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-md">
                <TrendingUp className="w-4 h-4 text-red-600" />
                <div>
                  <div className="font-bold">Hardest Path</div>
                  <div className="text-slate-600">{pathAnalysis.longest_path.toFixed(0)} energy</div>
                </div>
              </div>
            </div>
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              <strong>Goal Reward:</strong> 5,000 energy.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

PlayerHUD.propTypes = {
  playerState: PropTypes.shape({
    credits: PropTypes.number.isRequired,
  }).isRequired,
  progressData: PropTypes.shape({
    completion_percentage: PropTypes.number,
  }),
  pathAnalysis: PropTypes.shape({
    shortest_path: PropTypes.number,
    average_path: PropTypes.number,
    longest_path: PropTypes.number,
  }),
  onHintClick: PropTypes.func.isRequired,
  hintActive: PropTypes.bool.isRequired,
};
