import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import BusMap from './components/BusMap';
import { Bus, RefreshCw, Filter, AlertCircle, CheckCircle, X, Clock, Maximize, Navigation, Locate } from 'lucide-react';

/**
 * Calculates straight-line distance between two lat/lng points in KM.
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
  const p = Math.PI / 180;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 + 
            c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a)); 
};

/**
 * filter component
 */
const RouteCategory = ({ title, routes, selectedRoutes, toggleRoute }) => {
  if (routes.length === 0) return null;
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-50/50 border-y border-gray-100 mb-3">
        {title} ({routes.length})
      </h3>
      <div className="px-4 flex flex-wrap gap-2">
        {routes.map(route => (
          <button
            key={route}
            onClick={() => toggleRoute(route)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
              selectedRoutes.includes(route) 
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {route === '301' ? 'ION' : route}
          </button>
        ))}
      </div>
    </div>
  );
};

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoutes, setSelectedRoutes] = useState([]);
  
  // sidebar visibility states
  const [isRouteSidebarOpen, setIsRouteSidebarOpen] = useState(false);
  const [isAlertSidebarOpen, setIsAlertSidebarOpen] = useState(false);
  
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [ionStatus, setIonStatus] = useState('connecting');
  const [userLocation, setUserLocation] = useState(null);

  const fetchTransitData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5001/api/transit');
      setVehicles(res.data.vehicles || []);
      setAlerts(res.data.alerts || []);
      setIonStatus(res.data.ionStatus);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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

  const handleFindMe = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setFitTrigger(prev => prev + 1);
    });
  };

  const toggleRoute = (routeId) => {
    setSelectedRoutes(prev => 
      prev.includes(routeId) ? prev.filter(r => r !== routeId) : [...prev, routeId]
    );
  };

  const toggleAlertSidebar = () => {
    setIsAlertSidebarOpen(!isAlertSidebarOpen);
    setIsRouteSidebarOpen(false);
  };

  const toggleRouteSidebar = () => {
    setIsRouteSidebarOpen(!isRouteSidebarOpen);
    setIsAlertSidebarOpen(false);
  };

  const uniqueBusRoutes = useMemo(() => {
      return [...new Set(vehicles.map(v => v.routeId))].sort((a, b) => parseInt(a) - parseInt(b));
  }, [vehicles]);

  const routeCategories = useMemo(() => {
    const cats = { "Rapid Transit": [], "iXpress": [], "Local Routes": [], "School / Special": [] };
    uniqueBusRoutes.forEach(id => {
      const num = parseInt(id);
      if (id === '301') cats["Rapid Transit"].push(id);
      else if (num >= 200 && num <= 299) cats["iXpress"].push(id);
      else if (num < 200) cats["Local Routes"].push(id);
      else cats["School / Special"].push(id);
    });
    return cats;
  }, [uniqueBusRoutes]);

  const nearestVehicles = useMemo(() => {
    if (!userLocation) return [];
    return [...vehicles]
      .map(v => ({ ...v, distance: getDistance(userLocation.lat, userLocation.lng, v.latitude, v.longitude) }))
      .sort((a, b) => a.distance - b.distance).slice(0, 5);
  }, [vehicles, userLocation]);

  const filteredVehicles = selectedRoutes.length > 0 ? vehicles.filter(v => selectedRoutes.includes(v.routeId)) : vehicles;

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden text-slate-900 font-sans text-sm">
      
      {/* header */}
      <header className="bg-blue-900 text-white p-4 flex justify-between items-center shadow-lg z-[1000]">
        <div className="flex flex-col">
          <h1 className="flex items-center gap-2 text-xl font-bold leading-none">
            <Bus size={24} /> 
            <span>Real-Time GRT Map</span>
          </h1>
          {/* time last updated */}
          <div className="text-[10px] text-blue-200 uppercase tracking-wider font-bold mt-1.5 flex items-center gap-1.5 leading-none">
            <Clock size={10} />
            <span>Last Updated: {lastUpdated ?? 'Connecting...'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/50 rounded-md text-[10px] uppercase font-semibold border border-blue-800/50`}>
              <div className={`w-2 h-2 rounded-full ${ionStatus === 'live' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
              <span>ION: {ionStatus}</span>
            </div>

            <button onClick={() => setFitTrigger(prev => prev + 1)} className="bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 border border-blue-500/30 transition-all">
              <Maximize size={16} /> <span className="hidden sm:inline">Fit Map</span>
            </button>

            <button onClick={toggleAlertSidebar} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all border border-transparent
                ${isAlertSidebarOpen 
                  ? 'bg-orange-500 text-white shadow-inner' 
                  : 'bg-blue-800 hover:bg-orange-600 text-white'
                } ${alerts.length > 0 && !isAlertSidebarOpen ? 'animate-pulse' : ''}`}>
                <AlertCircle size={16} /> <span>Alerts</span>
            </button>

            <button onClick={toggleRouteSidebar} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all border border-transparent
                ${isRouteSidebarOpen 
                  ? 'bg-blue-400 text-white shadow-inner' 
                  : 'bg-blue-800 hover:bg-blue-500 text-white'
                }`}>
                <Filter size={16} /> <span>Filters</span>
            </button>
        </div>
      </header>
      
      <div className="flex-1 relative overflow-hidden">
        <BusMap vehicles={filteredVehicles} triggerFit={fitTrigger} userLocation={userLocation} />

        {/* nearby busses/ion */}
        {userLocation && (
          <div className="absolute bottom-24 left-6 z-[1002] w-44 bg-white/95 backdrop-blur-md shadow-xl rounded-xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-5">
            <div className="bg-blue-900 px-3 py-1.5 flex items-center justify-between text-white">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Navigation size={11} fill="white" /> Nearby</h3>
              <button onClick={() => setUserLocation(null)}><X size={14} /></button>
            </div>
            <div className="p-2 space-y-1">
              {nearestVehicles.map(v => (
                <div key={v.id} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                  <span className={`w-9 h-5 flex items-center justify-center text-[11px] font-bold rounded text-white ${v.type === 'LRT' ? 'bg-purple-600' : 'bg-blue-600'}`}>{v.routeId}</span>
                  <span className="text-[12px] font-bold text-blue-800 tracking-tight">{v.distance.toFixed(1)} km</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* location button */}
        <button onClick={handleFindMe} className="absolute bottom-6 left-6 z-[1005] bg-white text-blue-600 p-4 rounded-full shadow-2xl border border-gray-100 hover:scale-110 hover:bg-blue-50 transition-all shadow-blue-200/50">
          <Locate size={24} className={userLocation ? "fill-blue-600" : ""} />
        </button>

        {/* service alerts */}
        {isAlertSidebarOpen && (
          <aside className="absolute top-4 right-4 bottom-4 w-80 bg-white shadow-2xl z-[1001] flex flex-col rounded-xl border border-gray-200 overflow-hidden animate-in slide-in-from-right-8">
            <div className="p-4 border-b flex items-center justify-between bg-orange-50">
              <h2 className="font-black text-xs uppercase tracking-tighter flex items-center gap-2 text-orange-800"><AlertCircle size={14} /> Service Alerts</h2>
              <button onClick={() => setIsAlertSidebarOpen(false)} className="hover:bg-orange-100 p-1 rounded-full transition-colors"><X size={20} className="text-orange-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {alerts.length > 0 ? alerts.map((alert, idx) => (
                <div key={idx} className="bg-orange-50/50 border border-orange-100 rounded-lg p-3">
                  <h4 className="font-bold text-xs text-orange-900 mb-1 leading-tight">{alert.header}</h4>
                  <p className="text-[11px] text-orange-700 leading-relaxed">{alert.description}</p>
                </div>
              )) : (
                /* default message */
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} className="text-green-500" />
                  </div>
                  <h3 className="text-sm font-bold text-green-800 mb-1">No Service Alerts</h3>
                  <p className="text-xs text-green-600 leading-relaxed">All GRT transit routes are currently running smoothly.</p>
                </div>
              )}
            </div>
            <div className="p-3 bg-gray-50 border-t text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                GRT Live Feed
              </p>
            </div>
          </aside>
        )}

        {/* filters */}
        {isRouteSidebarOpen && (
          <aside className="absolute top-4 right-4 bottom-4 w-80 bg-white shadow-2xl z-[1001] flex flex-col rounded-xl border border-gray-200 overflow-hidden animate-in slide-in-from-right-8">
            <div className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="font-black text-xs uppercase tracking-tighter flex items-center gap-2 text-blue-900"><Filter size={14} /> Filter Routes</h2>
              <button onClick={() => setIsRouteSidebarOpen(false)} className="hover:bg-gray-100 p-1 rounded-full transition-colors"><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 hover-scrollbar">
              {selectedRoutes.length > 0 && (
                <div className="px-4 mb-4"><button onClick={() => setSelectedRoutes([])} className="w-full py-2 text-[10px] font-bold text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all uppercase tracking-widest shadow-sm">Clear All Filters</button></div>
              )}
              {Object.entries(routeCategories).map(([title, routes]) => (
                <RouteCategory key={title} title={title} routes={routes} selectedRoutes={selectedRoutes} toggleRoute={toggleRoute} />
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;