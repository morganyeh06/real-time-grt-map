import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BusMap from './components/BusMap';
import { Bus, RefreshCw, Filter, AlertCircle, Info, CheckCircle, X, Clock } from 'lucide-react';

/**
 * App.jsx
 * ROLE: Main Application Controller
 */
function App() {
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchTransitData = async () => {
    setLoading(true); // Start spinning
    try {
      const res = await axios.get('http://localhost:5001/api/transit');
      setVehicles(res.data.vehicles);
      setAlerts(res.data.alerts || []);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      // Artificial delay or immediate stop? 
      // We'll stop loading immediately on success.
      setLoading(false); 
    } catch (err) {
      console.error("Failed to fetch transit data:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransitData();
    const interval = setInterval(fetchTransitData, 15000);
    return () => clearInterval(interval);
  }, []);

  // computed logic
  const uniqueBusRoutes = [...new Set(vehicles.map(v => v.routeId).filter(r => r !== '301'))]
    .sort((a, b) => parseInt(a) - parseInt(b));
  const filteredVehicles = selectedRoute ? vehicles.filter(v => v.routeId === selectedRoute) : vehicles;
  const filteredAlerts = selectedRoute ? alerts.filter(a => a.affectedRoutes.includes(selectedRoute)) : alerts;

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden text-slate-900 font-sans">
      
      {/* header */}
      <header className="bg-blue-900 text-white p-4 flex justify-between items-center shadow-lg z-[1000]">
        <div className="flex flex-col">
          <h1 className="flex items-center gap-2 text-xl font-bold leading-none">
            <Bus size={24} /> 
            <span>GRT Assistant</span>
          </h1>
          
          {/* "last updated" sub heading */}
          <div className="flex items-center gap-1.5 text-[10px] text-blue-200 mt-1 uppercase tracking-wider font-semibold min-h-[14px]">
            {loading ? (
              <RefreshCw size={10} className="animate-spin text-white" />
            ) : (
              <Clock size={10} />
            )}
            <span>
              {loading ? 'Updating Feed...' : `Last Updated: ${lastUpdated ?? 'Connecting...'}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all shadow-sm ${
                    filteredAlerts.length > 0 
                    ? 'bg-orange-500 hover:bg-orange-400 text-white animate-pulse' 
                    : 'bg-blue-800 hover:bg-blue-700 text-blue-100'
                }`}
            >
                {filteredAlerts.length > 0 ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                {`Service Alerts (${filteredAlerts.length})`}
            </button>
        </div>
      </header>

      {/* filter toolbar */}
      <div className="bg-white border-b p-2 flex items-center gap-2 overflow-x-auto shadow-sm z-[999] hover-scrollbar">
        <div className="flex items-center gap-1 px-3 text-gray-500 border-r border-gray-200 mr-2 shrink-0">
            <Filter size={16} /> 
            <span className="text-sm font-semibold uppercase tracking-wider">Filter</span>
        </div>
        
        <button onClick={() => setSelectedRoute(null)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all shrink-0 ${!selectedRoute ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All</button>
        <button onClick={() => setSelectedRoute('301')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all shrink-0 ${selectedRoute === '301' ? 'bg-purple-700 text-white shadow-md' : 'border border-purple-200 text-purple-700 hover:bg-purple-50'}`}>ION Light Rail</button>
        <div className="h-6 w-px bg-gray-300 mx-1 shrink-0"></div>
        {uniqueBusRoutes.map(route => (
            <button key={route} onClick={() => setSelectedRoute(route)} className={`px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all shrink-0 ${selectedRoute === route ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Route {route}</button>
        ))}
      </div>
      
      {/* main content */}
      <div className="flex-1 relative overflow-hidden">
        <BusMap vehicles={filteredVehicles} />

        {/* service alerts sidebar */}
        {isSidebarOpen && (
          <aside className="absolute top-4 right-4 bottom-4 w-80 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-2xl z-[1001] flex flex-col rounded-xl overflow-hidden transition-all duration-300 animate-in slide-in-from-right-8">
            <div className={`p-4 border-b flex items-center justify-between ${filteredAlerts.length > 0 ? 'bg-orange-50/80' : 'bg-green-50/80'}`}>
              <div className="flex items-center gap-2">
                {filteredAlerts.length > 0 
                  ? <AlertCircle size={18} className="text-orange-600" /> 
                  : <CheckCircle size={18} className="text-green-600" />
                }
                <span className={`font-bold text-sm uppercase tracking-tight ${filteredAlerts.length > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                  {selectedRoute ? `Route ${selectedRoute}` : 'System Status'}
                </span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 hover-scrollbar">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert, idx) => (
                  <div key={idx} className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm hover:border-orange-200 transition-all">
                    <h3 className="font-bold text-xs text-gray-900 mb-1 leading-tight">{alert.header}</h3>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{alert.description}</p>
                    <div className="mt-2 flex items-center gap-1 text-[9px] text-gray-400 font-mono">
                      <Info size={10} />
                      <span>REF: {alert.id.substring(0, 8)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-in fade-in zoom-in duration-500">
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <CheckCircle size={28} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-1">Service Normal</h3>
                    <p className="text-[11px] text-gray-500 leading-normal">
                        All transit lines are currently operating with no active service notices.
                    </p>
                </div>
              )}
            </div>
            
            <div className="p-3 border-t bg-gray-50/50 text-center">
                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold">GRT Live Data Feed</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;