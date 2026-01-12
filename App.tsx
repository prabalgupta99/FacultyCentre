
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { fetchColleges } from './services/collegeService';
import { CollegeType, College } from './types';
import MapComponent from './components/Map';
import CollegeList from './components/CollegeList';
import JobDetailsSheet from './components/JobDetailsSheet';
import ClusterDrawer from './components/ClusterDrawer';
import ThemeToggle from './components/ThemeToggle';
import { Search, Map as MapIcon, List as ListIcon, X, AlertTriangle, ChevronDown, Plus, Minus, Compass, ArrowUp } from 'lucide-react';

const DEFAULT_CENTER: [number, number] = [21.7679, 78.8718];
const DEFAULT_ZOOM = 5;

const App: React.FC = () => {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialize Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('facultyfinder-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      setTheme('light');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('facultyfinder-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // State for Data
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<{ error: string | null }>({ error: null });

  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(null);
  const [clusterColleges, setClusterColleges] = useState<College[]>([]);

  // UI State
  const [isListViewOpen, setIsListViewOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isClusterDrawerOpen, setIsClusterDrawerOpen] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<CollegeType | 'ALL'>('ALL');
  const [hiringFilter, setHiringFilter] = useState<'all' | 'yes' | 'no'>('all');

  // Map Instance
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [showRecenter, setShowRecenter] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { data, error } = await fetchColleges();
      setColleges(data);
      if (error) {
        setDbStatus({ error });
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // Filter Refresh Simulation
  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => {
      setIsFiltering(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filterType, hiringFilter]);

  // Map Move Listener
  useEffect(() => {
    if (!mapInstance) return;

    const handleMove = () => {
      const center = mapInstance.getCenter();
      const zoom = mapInstance.getZoom();
      const latDiff = Math.abs(center.lat - DEFAULT_CENTER[0]);
      const lngDiff = Math.abs(center.lng - DEFAULT_CENTER[1]);
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

      if (distance > 2 || Math.abs(zoom - DEFAULT_ZOOM) >= 1) {
        setShowRecenter(true);
      } else {
        setShowRecenter(false);
      }
    };

    mapInstance.on('moveend', handleMove);
    mapInstance.on('zoomend', handleMove);

    return () => {
      mapInstance.off('moveend', handleMove);
      mapInstance.off('zoomend', handleMove);
    };
  }, [mapInstance]);

  const handleRecenter = () => {
    if (mapInstance) {
      mapInstance.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true, duration: 1 });
    }
  };

  // Handle Scroll
  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 10) {
      if (!isScrolled) setIsScrolled(true);
    } else {
      if (isScrolled) setIsScrolled(false);
    }
  };

  const scrollToTop = () => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Reset scroll state check when toggling view
  useEffect(() => {
    if (isListViewOpen && listContainerRef.current) {
      setIsScrolled(listContainerRef.current.scrollTop > 10);
    }
  }, [isListViewOpen]);

  // Filter Logic
  const filteredColleges = useMemo(() => {
    return colleges.filter(college => {
      const matchesSearch = college.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        college.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'ALL' || college.type === filterType;

      let matchesHiring = true;
      if (hiringFilter === 'yes') {
        matchesHiring = college.isHiring || college.openings.length > 0;
      } else if (hiringFilter === 'no') {
        matchesHiring = !college.isHiring && college.openings.length === 0;
      }

      return matchesSearch && matchesType && matchesHiring;
    });
  }, [colleges, searchQuery, filterType, hiringFilter]);

  const selectedCollege = useMemo(() =>
    colleges.find(c => c.id === selectedCollegeId),
    [selectedCollegeId, colleges]
  );

  const handleCollegeSelect = (id: string) => {
    setSelectedCollegeId(id);
    setIsListViewOpen(false);

    // Only close cluster drawer if the selected college is NOT in the current cluster list.
    // This preserves the "Back to list" capability by keeping the drawer open in background.
    const isFromCluster = clusterColleges.some(c => c.id === id);
    if (!isFromCluster) {
      setIsClusterDrawerOpen(false);
    }
  };

  const handleClusterSelect = (collegesInCluster: College[]) => {
    if (collegesInCluster.length === 0) {
      setIsClusterDrawerOpen(false);
      // Also close college details if open
      setSelectedCollegeId(null);
      return;
    }
    setClusterColleges(collegesInCluster);
    setSelectedCollegeId(null);
    setIsListViewOpen(false);
    setIsClusterDrawerOpen(true);
  };

  // UI Visibility Logic
  const controlsVisible = !isClusterDrawerOpen && !selectedCollegeId;
  const controlsOpacityClass = controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none';

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-colors_background_bg_primary">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-spacing_4xl w-spacing_4xl rounded-radius_sm mb-spacing_xl bg-colors_background_bg_brand_solid"></div>
          <div className="text-text-sm-medium text-colors_text_text_tertiary_600_">Loading FacultyFinder...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden relative transition-colors duration-300 bg-colors_background_bg_primary text-colors_text_text_primary_900_">

      {/* 
        ---------------------------
        HEADER & CONTROLS
        ---------------------------
      */}

      {/* Header Background Layer */}
      <div
        className={`absolute top-0 left-0 right-0 h-[128px] md:h-[68px] z-[390] transition-all duration-300 pointer-events-none bg-colors_background_bg_primary ${isListViewOpen && isScrolled ? 'opacity-100 border-b border-colors_border_border_secondary' : 'opacity-0'
          }`}
      />

      {/* 1. Search Bar */}
      <div className={`absolute top-spacing_xl left-spacing_xl right-spacing_xl md:right-auto md:w-width_xxs z-[400] transition-opacity duration-300 ${controlsOpacityClass}`}>
        <div
          className={`flex items-center rounded-radius_full overflow-hidden transition-all duration-300 w-full h-spacing_5xl bg-colors_background_bg_secondary border ${isSearchFocused
            ? 'ring-4 ring-colors_background_bg_brand_secondary border-colors_border_border_brand_solid shadow-shadow_floating'
            : 'border-colors_border_border_secondary shadow-shadow_card hover:shadow-shadow_floating'
            }`}
        >
          <div className={`pl-spacing_lg pr-spacing_lg transition-colors ${isSearchFocused ? 'text-colors_text_text_primary_900_' : 'text-colors_text_text_tertiary_600_'}`}>
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search FacultyCentre..."
            className="flex-1 h-full bg-transparent focus:outline-none text-text-xs-regular text-colors_text_text_primary_900_ placeholder-colors_text_text_tertiary_600_"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-spacing_md mr-spacing_xs text-colors_text_text_tertiary_600_ hover:text-colors_text_text_primary_900_">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter Chips */}
      {/* 
          Mobile Layout Calculation:
          Search Top: 16px (spacing_xl)
          Search Height: 40px
          Desired Gap: 16px (spacing_xl)
          Visual Chip Top: 72px
          
          Chip Container Top: 68px
          Chip Container Padding Top: 4px (spacing_xs)
          Actual Content Top: 68 + 4 = 72px (Perfect 16px gap)
      */}
      <div className={`absolute top-[68px] left-spacing_xl right-spacing_xl md:top-spacing_xl md:right-spacing_xl md:left-auto md:w-auto z-[400] flex flex-row gap-spacing_md overflow-x-auto no-scrollbar md:overflow-visible items-center pr-spacing_xl md:pr-0 py-spacing_xs md:py-0 transition-opacity duration-300 ${controlsOpacityClass}`}>
        {/* Type Filter */}
        <div className={`relative rounded-radius_full overflow-hidden transition-all duration-300 flex-shrink-0 bg-colors_background_bg_secondary border border-colors_border_border_secondary shadow-shadow_card hover:shadow-shadow_floating h-spacing_5xl`}>
          <select
            className="appearance-none pl-spacing_lg pr-spacing_5xl py-spacing_sm text-text-xs-medium bg-transparent focus:outline-none cursor-pointer text-colors_text_text_primary_900_ h-full flex items-center min-w-[100px]"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as CollegeType | 'ALL')}
          >
            <option value="ALL">All types</option>
            <option value={CollegeType.GOVT}>Government</option>
            <option value={CollegeType.PRIVATE}>Private</option>
          </select>
          <div className="absolute right-spacing_lg top-1/2 transform -translate-y-1/2 pointer-events-none text-colors_text_text_tertiary_600_">
            <ChevronDown size={14} />
          </div>
        </div>

        {/* Hiring Filter */}
        <div className={`relative rounded-radius_full overflow-hidden transition-all duration-300 flex-shrink-0 bg-colors_background_bg_secondary border border-colors_border_border_secondary shadow-shadow_card hover:shadow-shadow_floating h-spacing_5xl`}>
          <select
            className="appearance-none pl-spacing_lg pr-spacing_5xl py-spacing_sm text-text-xs-medium bg-transparent focus:outline-none cursor-pointer text-colors_text_text_primary_900_ h-full flex items-center min-w-[100px]"
            value={hiringFilter}
            onChange={(e) => setHiringFilter(e.target.value as 'all' | 'yes' | 'no')}
          >
            <option value="all">Show all</option>
            <option value="yes">Hiring</option>
            <option value="no">Not hiring</option>
          </select>
          <div className="absolute right-spacing_lg top-1/2 transform -translate-y-1/2 pointer-events-none text-colors_text_text_tertiary_600_">
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* 2.5 Recentre Button */}
      <div className={`absolute bottom-spacing_xl left-1/2 transform -translate-x-1/2 z-[400] transition-opacity duration-300 ${showRecenter && !isListViewOpen && controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} hidden md:block`}>
        <button
          onClick={handleRecenter}
          className="flex items-center gap-spacing_md px-spacing_xl h-spacing_5xl rounded-radius_full shadow-shadow_floating text-text-sm-medium transition-transform hover:scale-105 active:scale-95 border border-colors_border_border_secondary bg-colors_background_bg_secondary text-colors_text_text_primary_900_ whitespace-nowrap"
        >
          <Compass size={16} />
          Recentre
        </button>
      </div>

      {/* 3. List/Map Toggle Button */}
      <div className={`absolute bottom-spacing_xl left-spacing_xl z-[501] transition-opacity duration-300 ${controlsOpacityClass}`}>
        <button
          onClick={() => {
            setIsListViewOpen(!isListViewOpen);
            if (!isListViewOpen) setIsClusterDrawerOpen(false); // Close cluster drawer if opening main list
          }}
          className="h-spacing_5xl px-spacing_lg rounded-radius_full shadow-shadow_floating hover:scale-105 transition-transform font-semibold text-text-sm-semibold flex items-center gap-spacing_md border border-colors_border_border_secondary bg-colors_background_bg_secondary text-colors_text_text_primary_900_ whitespace-nowrap"
        >
          {isListViewOpen ? <><MapIcon size={16} /> Show map</> : <><ListIcon size={16} /> Show list</>}
        </button>
      </div>

      {/* 4. Bottom Right Controls Group */}
      <div className={`absolute bottom-spacing_xl right-spacing_xl z-[400] flex flex-col items-center transition-all duration-300 ease-in-out ${controlsOpacityClass}`}>
        {/* Back To Top */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden p-spacing_xs ${isScrolled && isListViewOpen ? 'max-h-[60px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <button
            onClick={scrollToTop}
            className="flex items-center justify-center rounded-radius_full border border-colors_border_border_secondary bg-colors_background_bg_secondary text-colors_text_text_primary_900_ shadow-shadow_card hover:opacity-80 focus:outline-none transition-colors w-spacing_5xl h-spacing_5xl"
          >
            <ArrowUp size={16} />
          </button>
        </div>

        {/* Theme Toggle */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden p-spacing_xs ${!isListViewOpen ? 'max-h-[60px] opacity-100 mb-spacing_xs' : 'max-h-0 opacity-0 mb-0'}`}>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>

        {/* Zoom Control */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden origin-bottom p-spacing_xs ${!isListViewOpen ? 'max-h-[120px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex flex-col h-fit rounded-radius_full shadow-shadow_card overflow-hidden border border-colors_border_border_secondary bg-colors_background_bg_secondary">
            <button
              onClick={() => mapInstance?.zoomIn()}
              className="w-spacing_5xl h-spacing_5xl flex items-center justify-center hover:opacity-80 transition-colors active:scale-95 text-colors_text_text_primary_900_"
              title="Zoom In"
            >
              <Plus size={16} strokeWidth={2} />
            </button>
            <div className="h-[1px] w-full bg-colors_border_border_secondary" />
            <button
              onClick={() => mapInstance?.zoomOut()}
              className="w-spacing_5xl h-spacing_5xl flex items-center justify-center hover:opacity-80 transition-colors active:scale-95 text-colors_text_text_primary_900_"
              title="Zoom Out"
            >
              <Minus size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Area */}
      <main className="flex-1 relative h-full w-full z-0 bg-colors_background_bg_tertiary">
        <MapComponent
          colleges={filteredColleges}
          selectedCollegeId={selectedCollegeId}
          onSelectCollege={handleCollegeSelect}
          onClusterClick={handleClusterSelect}
          onMapReady={setMapInstance}
        />
      </main>

      {/* List View Container */}
      <div
        className={`fixed inset-0 z-[350] bg-colors_background_bg_primary transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col`}
        style={{ transform: isListViewOpen ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div
          ref={listContainerRef}
          onScroll={handleListScroll}
          className="flex-1 overflow-y-auto p-spacing_xl pt-spacing_10xl md:pt-spacing_8xl custom-scrollbar"
        >
          <div className="max-w-3xl mx-auto">
            <CollegeList
              colleges={filteredColleges}
              selectedCollegeId={selectedCollegeId}
              onSelectCollege={handleCollegeSelect}
              isFiltering={isFiltering}
            />
          </div>
        </div>
      </div>

      {/* Cluster Drawer */}
      <ClusterDrawer
        colleges={clusterColleges}
        isOpen={isClusterDrawerOpen && clusterColleges.length > 0}
        onClose={() => setIsClusterDrawerOpen(false)}
        onSelectCollege={handleCollegeSelect}
      />

      {/* Job Details Sheet */}
      {selectedCollege && (
        <JobDetailsSheet
          college={selectedCollege}
          onClose={() => setSelectedCollegeId(null)}
        />
      )}

      {/* DB Status Notification */}
      {dbStatus.error && (
        <div className="fixed bottom-spacing_4xl left-spacing_xl md:left-spacing_11xl z-[600] animate-in slide-in-from-bottom duration-500">
          <div className="bg-colors_background_bg_error_primary text-colors_text_text_error_primary_600_ px-spacing_lg py-spacing_md rounded-radius_full shadow-shadow_floating flex items-center gap-spacing_md border border-colors_text_text_error_primary_600_ text-xs">
            <AlertTriangle size={14} className="stroke-2 flex-shrink-0" />
            <span className="font-semibold opacity-95 whitespace-nowrap">Status: Offline / Mock Data</span>
            <button onClick={() => setDbStatus({ error: null })} className="hover:opacity-80 p-spacing_xxs rounded-radius_full transition-colors ml-spacing_xs">
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
