import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Zap, Grid3X3 } from 'lucide-react';
import { boardLayouts } from './layout-definitions';
import { generateBoardLayout } from './BoardGenerator';

const getLayoutName = (id) => {
    const layout = boardLayouts.find(l => l.id === id);
    return layout ? layout.name : `Layout #${id}`;
};

const LayoutAnalysis = ({ config, onLayoutSelect }) => {
    const { analysis } = useMemo(() => {
        return generateBoardLayout(config);
    }, [config]);

    if (!analysis) {
        return null;
    }

    const topLayouts = analysis.top_layouts || [];

    const handleLayoutClick = (layout) => {
        if (onLayoutSelect) {
            onLayoutSelect(layout);
        }
    };

    const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;
    const formatNumber = (value) => value.toFixed(2);

  return (
        <div className="p-4 space-y-4">
            <h2 className="text-2xl font-bold">Layout Analysis</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5" />
                            Overall Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{formatNumber(analysis.average_balance_score)}</p>
                        <p className="text-sm text-muted-foreground">Average score (out of 100)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="w-5 h-5" />
                            Cost Variance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{formatNumber(analysis.average_cost_variance)}</p>
                        <p className="text-sm text-muted-foreground">Average difference in path costs</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Zap className="w-5 h-5" />
                            Complexity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{formatNumber(analysis.average_complexity_score)}</p>
                        <p className="text-sm text-muted-foreground">Average complexity score</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Grid3X3 className="w-5 h-5" />
                            Path Connection
        </CardTitle>
      </CardHeader>
      <CardContent>
                        <p className="text-3xl font-bold">{formatPercent(analysis.connected_paths_percentage / 100)}</p>
                        <p className="text-sm text-muted-foreground">Of layouts have connected paths</p>
                  </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Top 10 Most Balanced Layouts</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Layout Name</TableHead>
                                <TableHead>Balance Score</TableHead>
                                <TableHead>Cost Variance</TableHead>
                                <TableHead>Complexity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topLayouts.map((layout) => (
                                <TableRow key={layout.id} onClick={() => handleLayoutClick(layout)} className="cursor-pointer hover:bg-muted/50">
                                    <TableCell>{getLayoutName(layout.id)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={layout.analysis.balance_score} className="w-24" />
                                            <span>{formatNumber(layout.analysis.balance_score)}</span>
          </div>
                                    </TableCell>
                                    <TableCell>{formatNumber(layout.analysis.cost_variance)}</TableCell>
                                    <TableCell>{formatNumber(layout.analysis.complexity_score)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
      </CardContent>
    </Card>
        </div>
  );
};

LayoutAnalysis.propTypes = {
    config: PropTypes.object.isRequired,
    onLayoutSelect: PropTypes.func,
};

export default LayoutAnalysis;