
import React, { useEffect, useRef, useState } from 'react';
import { College } from '../types';

interface MapProps {
    colleges: College[];
    selectedCollegeId: string | null;
    onSelectCollege: (id: string) => void;
    onClusterClick: (clusterColleges: College[]) => void;
    onMapReady?: (map: any) => void;
}

const MapComponent: React.FC<MapProps> = ({ colleges, selectedCollegeId, onSelectCollege, onClusterClick, onMapReady }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const clusterGroupRef = useRef<any>(null);
    const markersRef = useRef<{ [key: string]: any }>({});

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
            worldCopyJump: true
        }).setView([21.7679, 78.8718], 5); // Center of India

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            noWrap: false
        }).addTo(map);

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
                return L.divIcon({
                    html: `<div class="custom-cluster"><span>${childCount}</span></div>`,
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
            const isHiring = college.openings.length > 0;
            let content = '';

            // Simplified logic for reduced clutter
            if (zoom < 10) {
                // Low zoom: Show simple colored dots only
                // Green for Govt, Purple for Private (matches existing theme)
                const colorClass = college.type === 'Govt.'
                    ? 'bg-[var(--colors_background_bg_success_primary)]'
                    : 'bg-[var(--colors_text_text_brand_primary_900_)]';

                content = `<div class="w-2.5 h-2.5 rounded-full ${colorClass} border border-white shadow-sm"></div>`;

                // Return stricter HTML for low zoom - no pill container
                return `
                <div class="flex items-center justify-center ${isSelected ? 'scale-150' : ''} transition-transform duration-300">
                    ${content}
                    ${isHiring ? '<div class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-white"></div>' : ''}
                </div>
            `;
            }

            // High zoom: Show full pill with text
            if (zoom < 13) {
                const shortName = college.name.length > 15 ? college.name.substring(0, 12) + '...' : college.name;
                content = `<span>${shortName}</span>`;
            } else {
                const fullName = college.name.length > 25 ? college.name.substring(0, 25) + '...' : college.name;
                content = `<span>${fullName}</span>`;
            }

            // Use semantic class for the badge
            const hiringBadge = isHiring
                ? `<div class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border" style="background-color: var(--colors_background_bg_success_primary); border-color: var(--colors_background_bg_secondary);"></div>`
                : '';

            return `
            <div class="map-marker-pill ${isSelected ? 'active' : ''} ${isHiring ? 'hiring' : ''}">
                ${content}
                ${hiringBadge}
            </div>
        `;
        };

        clusterGroup.clearLayers();
        markersRef.current = {};

        const markerLayers: any[] = [];

        colleges.forEach((college) => {
            const isSelected = selectedCollegeId === college.id;

            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: getMarkerHtml(college, currentZoom, isSelected),
                iconSize: [null, null],
                iconAnchor: [40, 30]
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
