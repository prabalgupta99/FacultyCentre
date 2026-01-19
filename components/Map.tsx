
import React, { useEffect, useRef, useState } from 'react';
import { College } from '../types';

interface MapProps {
    colleges: College[];
    selectedCollegeId: string | null;
    onSelectCollege: (id: string) => void;
    onClusterClick: (clusterColleges: College[]) => void;
    onMapReady?: (map: any) => void;
    onBoundsChange?: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void;
    autoZoomOnSelect?: boolean;
}

const MapComponent: React.FC<MapProps> = ({
    colleges,
    selectedCollegeId,
    onSelectCollege,
    onClusterClick,
    onMapReady,
    onBoundsChange,
    autoZoomOnSelect = true
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const clusterGroupRef = useRef<any>(null);
    const markersRef = useRef<{ [key: string]: any }>({});
    const debounceRef = useRef<NodeJS.Timeout>();

    // Track zoom level to update marker content
    const [currentZoom, setCurrentZoom] = useState<number>(5);

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const L = (window as any).L;
        if (!L) return;

        // Define bounds to restrict vertical panning
        const southWest = L.latLng(-85, -Infinity);
        const northEast = L.latLng(85, Infinity);
        const bounds = L.latLngBounds(southWest, northEast);

        const map = L.map(mapContainerRef.current, {
            zoomControl: false, // We will use custom zoom controls in App.tsx
            attributionControl: false,
            zoomAnimation: true,
            fadeAnimation: true,
            markerZoomAnimation: true,
            minZoom: 3,
            maxBounds: bounds,
            maxBoundsViscosity: 1.0,
            worldCopyJump: true,
            wheelPxPerZoom: 30, // Faster zooming (default 60)
            zoomDelta: 1,
            zoomSnap: 0.5
        }).setView([21.7679, 78.8718], 5); // Center of India

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            noWrap: false
        }).addTo(map);

        // Map Move/Zoom Listener (Debounced)
        const handleMapMove = () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                if (onBoundsChange) {
                    const bounds = map.getBounds();
                    onBoundsChange({
                        minLat: bounds.getSouth(),
                        maxLat: bounds.getNorth(),
                        minLng: bounds.getWest(),
                        maxLng: bounds.getEast()
                    });
                }
            }, 500); // Debounce 500ms
        };

        map.on('moveend', handleMapMove);

        // Zoom listener
        map.on('zoomend', () => {
            setCurrentZoom(map.getZoom());
        });

        // Close drawers on map click
        map.on('click', () => {
            onClusterClick([]);
        });

        // Initialize Cluster Group
        const markers = L.markerClusterGroup({
            showCoverageOnHover: false,
            zoomToBoundsOnClick: false,
            spiderfyOnMaxZoom: true,
            removeOutsideVisibleBounds: true,
            animate: true,
            maxClusterRadius: 80, // Increased from 50 to reduce clutter
            iconCreateFunction: function (cluster: any) {
                const childCount = cluster.getChildCount();

                // Check if any child has hiring status
                const children = cluster.getAllChildMarkers();
                let hasHiring = false;
                for (let i = 0; i < children.length; i++) {
                    if (children[i].options.collegeData && (children[i].options.collegeData.isHiring || children[i].options.collegeData.openings.length > 0)) {
                        hasHiring = true;
                        break;
                    }
                }

                // Hiring notification dot (Success 500)
                const notificationHtml = hasHiring
                    ? `<div class="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white" style="background-color: var(--colors_success_500);"></div>`
                    : '';

                // Add styling class if hiring
                const hiringClass = hasHiring ? 'hiring-cluster' : '';

                return L.divIcon({
                    html: `<div class="custom-cluster relative ${hiringClass}"><span>${childCount}</span>${notificationHtml}</div>`,
                    className: 'custom-cluster-icon',
                    iconSize: L.point(32, 32)
                });
            }
        });

        // Cluster Click Listener
        markers.on('clusterclick', (a: any) => {
            const childMarkers = a.layer.getAllChildMarkers();
            const clusterData = childMarkers.map((m: any) => m.options.collegeData);

            // Open drawer immediately
            onClusterClick(clusterData);

            if (a.layer) {
                const bounds = a.layer.getBounds();
                const isDesktop = window.innerWidth >= 768;

                // USE FLYTO for smoother "swoop" effect matching individual markers
                // 1. Calculate safe zoom level
                // We pad bounds by 0.2 (20%) to ensure comfortable spacing
                let targetZoom = map.getBoundsZoom(bounds.pad(0.2));
                targetZoom = Math.min(targetZoom, 15); // Cap max zoom

                // 2. Calculate center with offset for drawer
                const center = bounds.getCenter();
                let targetLatLng = center;

                if (isDesktop) {
                    const sidebarWidth = 480;
                    // Shift center to the right by half the sidebar width
                    const offsetX = sidebarWidth / 2;
                    const point = map.project(center, targetZoom);
                    const newPoint = point.add([offsetX, 0]);
                    targetLatLng = map.unproject(newPoint, targetZoom);
                } else {
                    // Mobile: Drawer is at the bottom (approx 50-60% height)
                    // We want the cluster centered in the visible top area.
                    // Shift center DOWN (positive Y) so map moves up.
                    const offsetY = window.innerHeight * 0.25;
                    const point = map.project(center, targetZoom);
                    const newPoint = point.add([0, offsetY]);
                    targetLatLng = map.unproject(newPoint, targetZoom);
                }

                map.flyTo(targetLatLng, targetZoom, {
                    animate: true,
                    duration: 1.5,
                    easeLinearity: 0.25
                });
            }

            L.DomEvent.stopPropagation(a);
        });

        map.addLayer(markers);
        clusterGroupRef.current = markers;
        mapInstanceRef.current = map;

        // Expose map instance to parent
        if (onMapReady) {
            onMapReady(map);
        }

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Update Markers
    useEffect(() => {
        const map = mapInstanceRef.current;
        const clusterGroup = clusterGroupRef.current;
        if (!map || !clusterGroup) return;

        const L = (window as any).L;

        const getMarkerHtml = (college: College, zoom: number, isSelected: boolean) => {
            const isHiring = college.isHiring || college.openings.length > 0;
            const isGovt = college.type === 'Govt.';

            // Colors using CSS variables (will be interpreted by browser)
            // Default: Neutral Gray (Gray 400 - Lighter shade as requested)
            // Hiring: Success Green
            const pinColor = isHiring
                ? 'var(--colors_text_text_success_primary_600_)'
                : 'var(--colors_gray_light_mode_400)';

            // SVG Pin Icon
            const pinSvg = `
                <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.15));">
                    <path d="M12 0C5.37258 0 0 5.37258 0 12C0 20 12 32 12 32C12 32 24 20 24 12C24 5.37258 18.6274 0 12 0Z" fill="${pinColor}"/>
                    <circle cx="12" cy="12" r="6" fill="white"/>
                </svg>
            `;

            // Simplified logic for reduced clutter at low zoom
            // User Request: Show small Pin (8x11px) instead of full size
            if (zoom < 10) {
                const smallPinSvg = `
                    <svg width="15" height="20" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 1px 1px rgba(0,0,0,0.15));">
                        <path d="M12 0C5.37258 0 0 5.37258 0 12C0 20 12 32 12 32C12 32 24 20 24 12C24 5.37258 18.6274 0 12 0Z" fill="${pinColor}"/>
                        <circle cx="12" cy="12" r="6" fill="white"/>
                    </svg>
                `;
                return `
                    <div class="flex items-center justify-center group ${isSelected ? 'scale-110 z-50' : 'z-10'} transition-transform duration-200">
                         <div class="relative flex-shrink-0">
                            ${smallPinSvg}
                         </div>
                    </div>
                `;
            }

            // High Zoom: Pin + Text

            const name = college.name;

            // Updated Text Style with CSS Class
            // Layout (width, clamping) is kept inline for specific behavior, appearance moved to CSS
            const layoutStyle = `
                width: 140px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                white-space: normal;
                margin-left: 6px;
            `;

            return `
                <div class="flex items-center group ${isSelected ? 'scale-110 z-50' : 'z-10'} transition-transform duration-200">
                    <div class="relative flex-shrink-0">
                        ${pinSvg}
                    </div>
                    <span style="${layoutStyle}" class="marker-text pointer-events-auto group-hover:z-50">${name}</span>
                </div>
            `;
        };

        clusterGroup.clearLayers();
        markersRef.current = {};

        const markerLayers: any[] = [];

        colleges.forEach((college) => {
            const isSelected = selectedCollegeId === college.id;

            // Adjust anchor based on zoom (Pin vs Dot)
            // But since iconCreateFunction is static in loop, we rely on the div centering
            // For Pin (24x32), anchor at [12, 32] (Tip)
            // For Dot (10x10), anchor at [5, 5] (Center)
            // We can check currentZoom here since we re-run this effect on zoom change? 
            // Yes, [colleges, selectedCollegeId, currentZoom...] is dep array.

            let anchor: [number, number] = [12, 32]; // Default for Pin
            if (currentZoom < 10) {
                anchor = [7.5, 20]; // For small Pin (15x20)
            }

            const icon = L.divIcon({
                className: 'custom-div-icon', // Use custom class defined in index.html
                html: getMarkerHtml(college, currentZoom, isSelected),
                iconSize: [0, 0], // CSS handles size
                iconAnchor: anchor
            });

            const marker = L.marker(college.coordinates, {
                icon,
                collegeId: college.id,
                collegeData: college
            });

            marker.on('click', (e: any) => {
                // Stop propagation so the map click handler doesn't fire (which would deselect the college)
                if (e.originalEvent) {
                    L.DomEvent.stopPropagation(e.originalEvent);
                }
                onSelectCollege(college.id);
                // Removed onClusterClick([]) to prevent immediate clearing of selection by parent handler
            });

            markersRef.current[college.id] = marker;
            markerLayers.push(marker);
        });

        clusterGroup.addLayers(markerLayers);

    }, [colleges, selectedCollegeId, currentZoom, onSelectCollege, onClusterClick]);

    // Handle Selection
    useEffect(() => {
        const map = mapInstanceRef.current;
        const clusterGroup = clusterGroupRef.current;
        if (!map || !selectedCollegeId) return;

        // Skip auto-zoom if disabled
        if (!autoZoomOnSelect) return;

        const L = (window as any).L;

        const college = colleges.find(c => c.id === selectedCollegeId);
        if (college) {

            const marker = markersRef.current[selectedCollegeId];
            if (marker) {
                const visibleParent = clusterGroup.getVisibleParent(marker);
                if (visibleParent && visibleParent !== marker) {
                    visibleParent.spiderfy();
                }
            }

            const targetZoom = 13;
            const isDesktop = window.innerWidth >= 768; // Matches md: breakpoint
            let targetLatLng = L.latLng(college.coordinates);

            if (isDesktop) {
                const sidebarWidth = 480;
                const offsetX = sidebarWidth / 2; // 240px shift

                const targetPoint = map.project(college.coordinates, targetZoom);
                const newTargetPoint = targetPoint.add([offsetX, 0]);
                targetLatLng = map.unproject(newTargetPoint, targetZoom);
            } else {
                // Mobile: Drawer is at the bottom (approx 75% height for job details)
                // We want the marker centered in the small visible top area (25%).
                // Shift center DOWN significantly.
                const offsetY = window.innerHeight * 0.25; // Shifts center down, pushing content up
                const targetPoint = map.project(college.coordinates, targetZoom);
                const newTargetPoint = targetPoint.add([0, offsetY]);
                targetLatLng = map.unproject(newTargetPoint, targetZoom);
            }

            map.flyTo(targetLatLng, targetZoom, {
                animate: true,
                duration: 2.5,
                easeLinearity: 0.25
            });
        }
    }, [selectedCollegeId, colleges]);

    return (
        <div className="w-full h-full relative" style={{ backgroundColor: 'var(--colors_background_bg_tertiary)' }}>
            <div ref={mapContainerRef} className="w-full h-full outline-none z-0" />
            {/* Night Overlay (controlled by CSS variables) */}
            <div className="map-night-overlay" />
        </div>
    );
};

export default MapComponent;
