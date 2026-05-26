export const POLLUTANTS = {
  pm25: { name: 'PM2.5', unit: 'μg/m³', category: 'particulates', ranges: [[0,5],[6,15],[16,22],[23,30],[31,37],[38,999]] },
  pm10: { name: 'PM10',  unit: 'μg/m³', category: 'particulates', ranges: [[0,15],[16,45],[46,67],[68,90],[91,112],[113,999]] },
  no2:  { name: 'NO₂',   unit: 'μg/m³', category: 'gaseous',      ranges: [[0,10],[11,25],[26,37],[38,50],[51,62],[63,999]] },
  o3:   { name: 'O₃',    unit: 'μg/m³', category: 'gaseous',      ranges: [[0,60],[61,100],[101,150],[151,200],[201,250],[251,999]] },
  so2:  { name: 'SO₂',   unit: 'μg/m³', category: 'gaseous',      ranges: [[0,20],[21,40],[41,60],[61,80],[81,100],[101,999]] },
  co:   { name: 'CO',    unit: 'mg/m³', category: 'systemic',     ranges: [[0,2.0],[2.1,4.0],[4.1,6.0],[6.1,8.0],[8.1,10.0],[10.1,999]] },
  nh3:  { name: 'NH₃',   unit: 'μg/m³', category: 'systemic',     ranges: [[0,10],[11,20],[21,50],[51,100],[101,200],[201,999]] },
  c6h6: { name: 'C₆H₆',  unit: 'μg/m³', category: 'systemic',     ranges: [[0,0.8],[0.9,1.7],[1.8,2.5],[2.6,3.4],[3.5,4.2],[4.3,999]] },
};
