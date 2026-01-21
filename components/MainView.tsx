
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchColleges, fetchCollegesInBounds } from '../services/collegeService';
import { CollegeType, College } from '../types';
import MapComponent from './Map';
import CollegeList from './CollegeList';
import JobDetailsSheet from './JobDetailsSheet';
import CollegeDetailsManager from './CollegeDetailsManager';
import ClusterDrawer from './ClusterDrawer';
import ThemeToggle from './ThemeToggle';
import { Search, Map as MapIcon, List as ListIcon, X, AlertTriangle, ChevronDown, Plus, Minus, Compass, ArrowUp } from 'lucide-react';

const DEFAULT_CENTER: [number, number] = [21.7679, 78.8718];
const DEFAULT_ZOOM = 5;

const MainView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialize Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('faculty-centre-theme') as 'light' | 'dark' | null;
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
    localStorage.setItem('faculty-centre-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // State for Data
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [dbStatus, setDbStatus] = useState<{ error: string | null }>({ error: null });
  const [mapBounds, setMapBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);

  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(null);
  const [clusterColleges, setClusterColleges] = useState<College[]>([]);

  // UI State
  const [isListViewOpen, setIsListViewOpen] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isClusterDrawerOpen, setIsClusterDrawerOpen] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<CollegeType | 'ALL'>('ALL');
  const [hiringFilter, setHiringFilter] = useState<'all' | 'yes' | 'no'>('yes');

  // Map Instance
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [showRecenter, setShowRecenter] = useState(false);

  // Data Fetching Logic (Google Maps Style)
  useEffect(() => {
    const fetchWithBounds = async () => {
      setLoading(true);

      // Default to India bounds if map isn't ready
      const bounds = mapBounds || {
        minLat: 6.0,
        maxLat: 38.0,
        minLng: 68.0,
        maxLng: 98.0
      };

      const filterOptions = {
        // search: searchQuery, // Removed to use client-side filtering (better for multi-word + university search)
        isHiring: hiringFilter === 'yes' ? true : undefined
      };

      const { data, error } = await fetchCollegesInBounds(bounds, filterOptions);

      if (error) {
        setDbStatus({ error });
        // Fallback to mock/all if needed, but for now just show error
      } else {
        setColleges(data);
      }
      setLoading(false);
      setIsInitialLoad(false);
    };

    // Debounce fetching to avoid flickering
    const timer = setTimeout(() => {
      fetchWithBounds();
    }, 300);

    return () => clearTimeout(timer);
  }, [mapBounds, hiringFilter]); // Re-fetch when map moves or filters change (removed searchQuery)

  // Map Bounds Handler
  const handleBoundsChange = (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => {
    setMapBounds(bounds);
  };

  // Filter Refresh Simulation
  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => {
      setIsFiltering(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filterType, hiringFilter]);

  // Map Move Listener (Optimization: handleBoundsChange handles fetch)
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

      // Multi-word search logic (Ported from Hiring Management System)
      // 1. Split query into words
      const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);

      // 2. Start true, then check if EVERY word matches at least one field
      const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => {
        const nameMatch = college.name.toLowerCase().includes(term);
        const locationMatch = college.location.toLowerCase().includes(term);
        const universityMatch = college.affiliatingUniversity ? college.affiliatingUniversity.toLowerCase().includes(term) : false;

        return nameMatch || locationMatch || universityMatch;
      });

      const matchesType = filterType === 'ALL' || college.type === filterType;

      let matchesHiring = true;
      const hasManualPosts = college.manualHiringPosts && college.manualHiringPosts.length > 0;
      if (hiringFilter === 'yes') {
        matchesHiring = college.isHiring || college.openings.length > 0 || hasManualPosts;
      } else if (hiringFilter === 'no') {
        matchesHiring = !college.isHiring && college.openings.length === 0 && !hasManualPosts;
      }

      return matchesSearch && matchesType && matchesHiring;
    }).sort((a, b) => {
      // Helper to get the most recent relevant date for a college
      const getEffectiveDate = (college: College) => {
        // 1. Manual Hiring Posts (Highest Priority)
        if (college.manualHiringPosts && college.manualHiringPosts.length > 0) {
          // Find the most recent manual post date
          return college.manualHiringPosts.reduce((max, post) => {
            return post.postingDate > max ? post.postingDate : max;
          }, '');
        }

        // 2. Scraped Openings (Secondary Priority)
        // Only consider if no manual posts exist (as per "Manual uses manual date" rule)
        if (college.openings && college.openings.length > 0) {
          // Find the most recent scraped post date (if available)
          return college.openings.reduce((max, job) => {
            // Check if job.postedDate exists and is valid
            return job.postedDate && job.postedDate > max ? job.postedDate : max;
          }, '');
        }

        return ''; // No date available
      };

      const dateA = getEffectiveDate(a);
      const dateB = getEffectiveDate(b);

      // Primary Sort: Date (Descending - Newest First)
      if (dateA && dateB) {
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
      } else if (dateA) {
        return -1; // A has date, B does not -> A first
      } else if (dateB) {
        return 1; // B has date, A does not -> B first
      }

      // Secondary Sort: Alphabetical by Name
      return a.name.localeCompare(b.name);
    });
  }, [colleges, searchQuery, filterType, hiringFilter]);

  // Temporary Verification Logging
  useEffect(() => {
    if (filteredColleges.length > 0) {
      console.log('--- Sorting Logic Verification (Top 10) ---');
      const debugData = filteredColleges.slice(0, 10).map(c => {
        let effectiveDate = '';
        let source = 'None';

        if (c.manualHiringPosts && c.manualHiringPosts.length > 0) {
          effectiveDate = c.manualHiringPosts.reduce((max, p) => p.postingDate > max ? p.postingDate : max, '');
          source = 'Manual';
        } else if (c.openings && c.openings.length > 0) {
          effectiveDate = c.openings.reduce((max, j) => j.postedDate && j.postedDate > max ? j.postedDate : max, '');
          if (effectiveDate) source = 'Scraped';
        }

        return {
          Name: c.name,
          'Effective Date': effectiveDate,
          Source: source,
          'Has Manual': c.manualHiringPosts?.length || 0,
          'Has Scraped': c.openings?.length || 0
        };
      });
      console.table(debugData);
    }
  }, [filteredColleges]);



  // Sync URL params to State
  useEffect(() => {
    if (slug) {
      // Find college by slug
      // Only set if colleges are loaded
      if (colleges.length > 0) {
        const college = colleges.find(c => c.slug === slug);
        if (college) {
          setSelectedCollegeId(college.id);
          // Ensure drawer is closed if we have a selected college
          setIsClusterDrawerOpen(false);
        } else {
          console.warn("College not found for slug:", slug);
          // Optional: navigate home or show 404, but keeping quiet is safer
          setSelectedCollegeId(null);
        }
      }
    } else {
      setSelectedCollegeId(null);
    }
  }, [slug, colleges]);


  const handleCollegeSelect = (id: string) => {
    // Navigate to the new URL
    const college = colleges.find(c => c.id === id);
    if (!college) return;

    navigate(`/college/${college.slug}`);

    // Only close cluster drawer if the selected college is NOT in the current cluster list.

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

  if (loading && isInitialLoad) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-colors_background_bg_primary relative overflow-hidden">
        {/* Ambient Background Gradient (Subtle) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-colors_background_bg_brand_solid_subtle/30 via-transparent to-colors_background_bg_brand_solid_subtle/30 animate-pulse pointer-events-none" />

        <div className="flex flex-col items-center justify-center z-10 p-spacing_2xl">
          {/* Logo Container */}
          <div className="relative mb-spacing_4xl group">
            {/* Outer Glow Ring */}
            <div className="absolute -inset-4 bg-gradient-to-r from-colors_background_bg_brand_solid to-colors_background_bg_brand_section rounded-full opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-1000 animate-pulse" />

            {/* Icon Container - Using Valid Semantic Tokens */}
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-colors_background_bg_brand_solid to-colors_background_bg_brand_section shadow-shadow_floating flex items-center justify-center transform transition-transform duration-700 hover:scale-105 hover:rotate-3">
              {/* Inner Shine */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/20 to-transparent opacity-50 pointer-events-none" />

              {/* Material Symbol Icon */}
              <div className="text-white drop-shadow-md flex items-center justify-center w-full h-full">
                <span className="material-symbols-rounded text-[48px] leading-none animate-[breathe_2s_ease-in-out_infinite]">
                  work
                </span>
              </div>
            </div>

            {/* Decor elements */}
            <div className="absolute -right-2 -top-2 w-5 h-5 bg-colors_background_bg_success_primary rounded-full border-2 border-white shadow-sm animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
          </div>

          {/* Typography */}
          <div className="space-y-spacing_xs text-center">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-colors_text_text_brand_primary_900_ to-colors_background_bg_brand_solid tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-700">
              Faculty Centre
            </h1>
            <div className="flex items-center gap-2 justify-center mt-spacing_lg">
              <div className="w-2 h-2 rounded-full bg-colors_background_bg_brand_solid animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 rounded-full bg-colors_background_bg_brand_solid animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 rounded-full bg-colors_background_bg_brand_solid animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden relative transition-colors duration-300 bg-colors_background_bg_primary text-colors_text_text_primary_900_">

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
            placeholder="Search Faculty Centre..."
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
      <div className={`fixed bottom-spacing_xl left-1/2 transform -translate-x-1/2 z-[400] transition-opacity duration-300 ${showRecenter && !isListViewOpen && controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} hidden md:block`}>
        <button
          onClick={handleRecenter}
          className="flex items-center gap-spacing_md px-spacing_xl h-spacing_5xl rounded-radius_full shadow-shadow_floating text-text-sm-medium transition-transform hover:scale-105 active:scale-95 border border-colors_border_border_secondary bg-colors_background_bg_secondary text-colors_text_text_primary_900_ whitespace-nowrap"
        >
          <Compass size={16} />
          Recentre
        </button>
      </div>

      {/* 3. List/Map Toggle Button */}
      <div className={`fixed bottom-spacing_xl left-spacing_xl z-[501] transition-opacity duration-300 ${controlsOpacityClass}`}>
        <button
          onClick={() => {
            setIsListViewOpen(!isListViewOpen);
            if (!isListViewOpen) setIsClusterDrawerOpen(false); // Close cluster drawer if opening main list
          }}
          className="h-spacing_5xl px-spacing_lg rounded-radius_full shadow-shadow_floating hover:scale-105 transition-transform font-semibold text-text-sm-semibold flex items-center gap-spacing_md border border-colors_border_border_secondary bg-colors_background_bg_secondary text-colors_text_text_primary_900_ whitespace-nowrap"
        >
          {isListViewOpen ? <><MapIcon size={16} /> See on map</> : <><ListIcon size={16} /> See as list</>}
        </button>
      </div>

      {/* Loading Indicator for Map Updates */}
      {loading && !isInitialLoad && (
        <div className="absolute top-spacing_10xl md:top-spacing_xl left-1/2 transform -translate-x-1/2 z-[500] bg-colors_background_bg_primary px-spacing_lg py-spacing_xs rounded-radius_full shadow-shadow_floating border border-colors_border_border_secondary flex items-center gap-spacing_sm">
          <div className="w-4 h-4 border-2 border-colors_border_border_brand_solid border-t-transparent rounded-full animate-spin"></div>
          <span className="text-text-xs-medium text-colors_text_text_secondary_700_">Updating area...</span>
        </div>
      )}

      {/* 4. Bottom Right Controls Group */}
      <div className={`fixed bottom-spacing_xl right-spacing_xl z-[400] flex flex-col items-center transition-all duration-300 ease-in-out ${controlsOpacityClass}`}>
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
        <div className={`transition-all duration-300 ease-in-out overflow-hidden p-spacing_xs ${/* Always visible now */ 'max-h-[60px] opacity-100 mb-spacing_xs'}`}>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>

        {/* Zoom Control */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden origin-bottom p-spacing_xs ${!isListViewOpen ? 'max-h-[120px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex flex-col h-fit rounded-radius_full shadow-shadow_card overflow-hidden border border-colors_border_border_secondary bg-colors_background_bg_secondary">
            <button
              onClick={() => mapInstance?.zoomIn(2)}
              className="w-spacing_5xl h-spacing_5xl flex items-center justify-center hover:opacity-80 transition-colors active:scale-95 text-colors_text_text_primary_900_"
              title="Zoom In"
            >
              <Plus size={16} strokeWidth={2} />
            </button>
            <div className="h-[1px] w-full bg-colors_border_border_secondary" />
            <button
              onClick={() => mapInstance?.zoomOut(2)}
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
          onBoundsChange={handleBoundsChange}
          autoZoomOnSelect={!isListViewOpen}
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
              hiringFilter={hiringFilter}
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

      {/* Job Details Manager (Handles Caching) */}
      <CollegeDetailsManager
        colleges={colleges}
        selectedCollegeId={selectedCollegeId}
        onClose={() => {
          // Navigate back to home (clear selection)
          navigate('/');
        }}
      />

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

export default MainView;
