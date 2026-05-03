export const POLLUTANTS = {
  pm25: { name: 'PM2.5', unit: 'μg/m³', category: 'particulates', ranges: [[0,5],[6,15],[16,50],[51,90],[91,140],[141,999]] },
  pm10: { name: 'PM10',  unit: 'μg/m³', category: 'particulates', ranges: [[0,15],[16,45],[46,120],[121,195],[196,270],[271,999]] },
  no2:  { name: 'NO₂',   unit: 'μg/m³', category: 'gaseous',      ranges: [[0,10],[11,25],[26,60],[61,100],[101,150],[151,999]] },
  o3:   { name: 'O₃',    unit: 'μg/m³', category: 'gaseous',      ranges: [[0,60],[61,100],[101,120],[121,160],[161,180],[181,999]] },
  so2:  { name: 'SO₂',   unit: 'μg/m³', category: 'gaseous',      ranges: [[0,20],[21,40],[41,125],[126,190],[191,275],[276,999]] },
  co:   { name: 'CO',    unit: 'mg/m³', category: 'systemic',     ranges: [[0,2.0],[2.1,4.0],[4.1,10.0],[10.1,15.0],[15.1,30.0],[30.1,999]] },
  nh3:  { name: 'NH₃',   unit: 'μg/m³', category: 'systemic',     ranges: [[0,10],[11,20],[21,50],[51,100],[101,200],[201,999]] },
  c6h6: { name: 'C₆H₆',  unit: 'μg/m³', category: 'systemic',     ranges: [[0,1.7],[1.8,3.4],[3.5,5.0],[5.1,10.0],[10.1,20.0],[20.1,999]] },
};
