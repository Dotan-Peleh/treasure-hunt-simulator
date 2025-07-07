// pathAnalysis.js
// Shortest-path analysis for each entry point. Returns { all_paths } array.

function calculateStepCost(level) {
  return Math.pow(2, level - 1);
}

export function findAllPathsFromEntries(grid, allTiles, maxPathsPerEntry=1000) {
  const rows = grid.length;
  const cols = grid[0].length;
  const tileMap = new Map(allTiles.map(t=>[`${t.row-1},${t.col-1}`, t]));
  let keyPos=null;
  for(let r=0;r<rows && !keyPos;r++){
    for(let c=0;c<cols;c++) if(grid[r][c]==='key'){keyPos={r,c};break;}
  }
  if(!keyPos) return {all_paths:[]};
  const keyStr=`${keyPos.r},${keyPos.c}`;
  const entries=[...tileMap.entries()].filter(([,t])=>t.isEntryPoint).map(([k])=>{
    const [r,c]=k.split(',').map(Number);return{r,c};
  });
  const dirs=[{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];
  const stepCost=(r,c)=>{
    const t=tileMap.get(`${r},${c}`);
    return t&&t.required_item_level?calculateStepCost(t.required_item_level):0;
  };
  const passable=(r,c)=>{
    if(r<0||r>=rows||c<0||c>=cols) return false;
    const t=grid[r][c];
    // Only consider actual path/bridge/key cells—not free/start/generator—to match semi-locked tiles.
    return t.startsWith('path') || t==='bridge' || t==='key';
  };
  const all_paths=[];
  for(const entry of entries){
    const path=[`${entry.r},${entry.c}`];
    const cost=stepCost(entry.r,entry.c);
    const stack=[{r:entry.r,c:entry.c,path,cost}];
    let emitted=0;
    while(stack.length && emitted<maxPathsPerEntry){
      const node=stack.pop();
      if(node.path[node.path.length-1]===keyStr){
        all_paths.push({path:node.path, cost:node.cost});
        emitted++;continue;
      }
      for(const {dr,dc} of dirs){
        const nr=node.r+dr,nc=node.c+dc;
        if(!passable(nr,nc)) continue;
        const coord=`${nr},${nc}`;
        if(node.path.includes(coord)) continue;
        stack.push({r:nr,c:nc,path:[...node.path,coord],cost:node.cost+stepCost(nr,nc)});
      }
    }
  }
  // dedupe
  const uniq=new Map();
  for(const p of all_paths){
    const k=p.path.join('|');
    if(!uniq.has(k)||p.cost<uniq.get(k).cost) uniq.set(k,p);
  }
  return{all_paths:[...uniq.values()]};
} 