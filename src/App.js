import React, { useState, useRef, useEffect } from 'react';

const PatternDigitizer = () => {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // State management
  const [currentImage, setCurrentImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [points, setPoints] = useState([]);
  const [currentTool, setCurrentTool] = useState('trace');
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState([]);
  const [knownDistance, setKnownDistance] = useState(1);
  const [patternName, setPatternName] = useState('Pattern 1');

  // Canvas drawing functions
  const drawGrid = (ctx, width, height) => {
    const gridSize = 20;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (!currentImage) {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#f8fafc');
      gradient.addColorStop(1, '#f1f5f9');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawGrid(ctx, canvas.width, canvas.height);
    } else {
      ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    }

    // Draw calibration line
    if (calibrationPoints.length === 2) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(calibrationPoints[0].x, calibrationPoints[0].y);
      ctx.lineTo(calibrationPoints[1].x, calibrationPoints[1].y);
      ctx.stroke();
      
      const midX = (calibrationPoints[0].x + calibrationPoints[1].x) / 2;
      const midY = (calibrationPoints[0].y + calibrationPoints[1].y) / 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(midX - 20, midY - 20, 40, 20);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(midX - 20, midY - 20, 40, 20);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${knownDistance}"`, midX, midY - 6);
    }

    // Draw traced points and lines
    if (points.length > 0) {
      const tracePoints = points.filter(p => p.type === 'trace');
      if (tracePoints.length > 0) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(tracePoints[0].x, tracePoints[0].y);
        for (let i = 1; i < tracePoints.length; i++) {
          ctx.lineTo(tracePoints[i].x, tracePoints[i].y);
        }
        ctx.stroke();
      }

      // Draw points
      points.forEach((point, index) => {
        if (point.type === 'trace') {
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (point.type === 'notch') {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();
          
          // Enhanced notch labels
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(point.x + 12, point.y - 20, 28, 16);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1;
          ctx.strokeRect(point.x + 12, point.y - 20, 28, 16);
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`N${index + 1}`, point.x + 26, point.y - 8);
        }
      });
    }
  };

  // Effect to redraw canvas when state changes
  useEffect(() => {
    redrawCanvas();
  }, [currentImage, points, calibrationPoints, knownDistance]);

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Event handlers
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setCurrentImage(img);
          setPoints([]);
          setCalibrationPoints([]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSetScale = () => {
    setCalibrationMode(true);
    setCalibrationPoints([]);
  };

  const handleCanvasClick = (e) => {
    const coords = getCanvasCoordinates(e);

    if (calibrationMode) {
      if (calibrationPoints.length < 2) {
        const newPoints = [...calibrationPoints, coords];
        setCalibrationPoints(newPoints);
        
        if (newPoints.length === 2) {
          const p1 = newPoints[0];
          const p2 = newPoints[1];
          const pixelDistance = Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
          );
          setScale(pixelDistance / knownDistance);
          setCalibrationMode(false);
        }
      }
      return;
    }

    const newPoint = { ...coords, type: currentTool };
    setPoints([...points, newPoint]);
  };

  const exportSVG = () => {
    if (points.length === 0) {
      alert('Please add some points to the pattern before exporting');
      return;
    }

    try {
      let svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
          <title>${patternName}</title>
          <defs>
              <style>
                  .trace-path { fill: none; stroke: #3b82f6; stroke-width: 3; }
                  .notch-circle { fill: #f59e0b; }
                  .notch-text { font-family: Arial, sans-serif; font-size: 12px; fill: #f59e0b; }
              </style>
          </defs>
          <g id="pattern">`;

      const tracePoints = points.filter(p => p.type === 'trace');
      if (tracePoints.length > 0) {
        let pathData = `M ${tracePoints[0].x.toFixed(2)} ${tracePoints[0].y.toFixed(2)}`;
        for (let i = 1; i < tracePoints.length; i++) {
          pathData += ` L ${tracePoints[i].x.toFixed(2)} ${tracePoints[i].y.toFixed(2)}`;
        }
        svg += `<path d="${pathData}" class="trace-path"/>`;
      }

      const notchPoints = points.filter(p => p.type === 'notch');
      notchPoints.forEach((notch, index) => {
        svg += `<circle cx="${notch.x.toFixed(2)}" cy="${notch.y.toFixed(2)}" r="8" class="notch-circle"/>
                 <text x="${(notch.x + 15).toFixed(2)}" y="${(notch.y - 10).toFixed(2)}" class="notch-text">N${index + 1}</text>`;
      });

      svg += `</g></svg>`;

      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${patternName.replace(/[^a-z0-9]/gi, '_')}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting SVG:', error);
      alert('Error exporting SVG. Check console for details.');
    }
  };

  const exportPDF = () => {
    if (points.length === 0) {
      alert('Please add some points to the pattern before exporting');
      return;
    }
    
    try {
      const canvas = canvasRef.current;
      const dataURL = canvas.toDataURL('image/png', 1.0);
      
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        alert('Pop-up blocked. Please allow pop-ups for this site to export PDF.');
        return;
      }
      
      const htmlContent = `<!DOCTYPE html>
      <html>
          <head>
              <title>${patternName}</title>
              <meta charset="utf-8">
              <style>
                  * { box-sizing: border-box; margin: 0; padding: 0; }
                  body { 
                      font-family: Arial, sans-serif; 
                      padding: 20px; 
                      background: white;
                  }
                  .header { 
                      text-align: center; 
                      margin-bottom: 20px; 
                      border-bottom: 2px solid #ccc;
                      padding-bottom: 15px;
                  }
                  .header h1 { 
                      color: #333; 
                      margin-bottom: 10px; 
                  }
                  .info { 
                      font-size: 14px; 
                      color: #666; 
                  }
                  .pattern-container {
                      text-align: center;
                      margin-top: 20px;
                  }
                  .pattern-image { 
                      max-width: 100%; 
                      height: auto; 
                      border: 1px solid #ddd;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  }
                  @media print {
                      body { padding: 10px; }
                      .header { page-break-inside: avoid; }
                  }
              </style>
          </head>
          <body>
              <div class="header">
                  <h1>${patternName}</h1>
                  <div class="info">
                      Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                      ${scale > 0 ? ` | Scale: ${scale.toFixed(1)} px/inch` : ''}
                      | Total Points: ${points.length}
                      | Trace Points: ${points.filter(p => p.type === 'trace').length}
                      | Notches: ${points.filter(p => p.type === 'notch').length}
                  </div>
              </div>
              <div class="pattern-container">
                  <img src="${dataURL}" alt="${patternName}" class="pattern-image" />
              </div>
              <script>
                  window.onload = function() {
                      setTimeout(function() {
                          window.print();
                      }, 1000);
                  };
              <\/script>
          </body>
      </html>`;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error creating PDF. Check console for details.');
    }
  };

  const clearAll = () => {
    setPoints([]);
    setCalibrationPoints([]);
  };

  // Computed values
  const tracePointsCount = points.filter(p => p.type === 'trace').length;
  const notchPointsCount = points.filter(p => p.type === 'notch').length;
  const hasPoints = points.length > 0;

  const getStatusMessage = () => {
    if (calibrationMode) {
      return null;
    }
    
    if (!currentImage) {
      return "Upload an image to begin digitizing your pattern";
    } else if (currentTool === 'trace') {
      return "Click to trace the pattern outline";
    } else if (currentTool === 'notch') {
      return "Click to add construction notches";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
  <img 
    src="/logo_patto.png" 
    alt="Patto Logo" 
    className="mx-auto mb-4"
    width="150" 
    height="150" 
  />
</div>
        <div className="flex gap-8">
          {/* Left Panel - Controls */}
          <div className="w-80 space-y-6">
            {/* Pattern Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Pattern Details</h3>
              <input
                type="text"
                value={patternName}
                onChange={(e) => setPatternName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter pattern name"
              />
            </div>

            {/* Image Upload */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Upload Image</h3>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer transition-all hover:bg-slate-50 hover:border-blue-500"
              >
                <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span className="text-sm font-medium text-slate-600">Choose pattern image</span>
                <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</span>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  className="hidden" 
                />
              </div>
            </div>

            {/* Calibration */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Scale Calibration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Known Distance (inches)</label>
                  <input
                    type="number"
                    value={knownDistance}
                    onChange={(e) => setKnownDistance(parseFloat(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                    min="0.1"
                  />
                </div>
                <button 
                  onClick={handleSetScale}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-medium transition-all hover:bg-blue-600"
                >
                  Set Scale Reference
                </button>
                {scale > 1 && (
                  <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
                    ✓ Scale set: {scale.toFixed(1)} px/inch
                  </div>
                )}
              </div>
            </div>

            {/* Tools */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Drawing Tools</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setCurrentTool('trace')}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    currentTool === 'trace' 
                      ? 'bg-blue-500 text-white shadow-lg' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                  </svg>
                  Trace Outline
                </button>
                <button 
                  onClick={() => setCurrentTool('notch')}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    currentTool === 'notch' 
                      ? 'bg-amber-500 text-white shadow-lg' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  Add Notches
                </button>
              </div>
            </div>

            {/* Export & Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Export & Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={exportSVG}
                  disabled={!hasPoints}
                  className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-medium transition-all hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Export SVG
                </button>
                <button 
                  onClick={exportPDF}
                  disabled={!hasPoints}
                  className="w-full px-4 py-3 bg-indigo-500 text-white rounded-lg font-medium transition-all hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Print PDF
                </button>
                <button 
                  onClick={clearAll}
                  className="w-full px-4 py-3 bg-red-500 text-white rounded-lg font-medium transition-all hover:bg-red-600"
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  Clear All
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Active Tool:</span>
                  <span className="font-medium text-slate-800 capitalize">{currentTool}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Points:</span>
                  <span className="font-medium text-slate-800">{points.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Notches:</span>
                  <span className="font-medium text-slate-800">{notchPointsCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Canvas */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-4">
                {getStatusMessage() && (
                  <div className="text-slate-600">
                    {getStatusMessage()}
                  </div>
                )}
                {calibrationMode && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-4 rounded-lg flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                    <span className="font-medium">
                      Click two points {knownDistance}" apart to set scale
                    </span>
                  </div>
                )}
              </div>
              
              <div className="border-2 border-slate-200 rounded-lg overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  width="800"
                  height="600"
                  onClick={handleCanvasClick}
                  className="w-full h-auto cursor-crosshair bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return <PatternDigitizer />;
}

export default App;

