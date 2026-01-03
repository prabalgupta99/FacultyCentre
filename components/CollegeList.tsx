
import React from 'react';
import { College, CollegeType } from '../types';
import { ExternalLink, Briefcase } from 'lucide-react';

interface CollegeListProps {
  colleges: College[];
  selectedCollegeId: string | null;
  onSelectCollege: (id: string) => void;
  isFiltering: boolean;
}

const CollegeListSkeleton = () => (
  <div className="space-y-spacing_xl">
    {[1, 2, 3, 4].map((i) => (
      <div 
        key={i} 
        className="rounded-radius_md h-spacing_9xl w-full animate-pulse bg-colors_background_bg_secondary opacity-30"
      />
    ))}
  </div>
);

const CollegeList: React.FC<CollegeListProps> = ({ colleges, selectedCollegeId, onSelectCollege, isFiltering }) => {
  return (
    <div className="flex flex-col gap-spacing_xl pb-spacing_9xl pt-spacing_md">
      
      {(isFiltering || colleges.length > 0) && (
          <div className="flex items-center justify-between pl-spacing_xs pb-spacing_md">
             <h2 className="text-text-sm-semibold text-colors_text_text_secondary_700_">
                {isFiltering ? 'Updating results...' : `Showing ${colleges.length} result${colleges.length !== 1 ? 's' : ''}`}
             </h2>
          </div>
      )}

      {isFiltering ? (
        <CollegeListSkeleton />
      ) : (
        <>
          {colleges.map((college) => {
            const isSelected = selectedCollegeId === college.id;
            const jobCount = college.openings.length;

            return (
              <div
                key={college.id}
                id={`card-${college.id}`}
                onClick={() => onSelectCollege(college.id)}
                className={`
                  group relative p-spacing_2xl rounded-radius_md border transition-all duration-300 cursor-pointer bg-colors_background_bg_secondary
                  ${isSelected 
                    ? 'shadow-shadow_floating scale-[1.01] z-10 border-colors_border_border_brand_solid' 
                    : 'hover:shadow-shadow_floating hover:-translate-y-0.5 hover:border-colors_border_border_brand_solid border-colors_border_border_secondary'
                  }
                `}
              >
                <div className="flex justify-between items-start mb-spacing_lg">
                  <div className="flex-1 pr-spacing_lg">
                    {/* 1. Name First */}
                    <h3 className="text-text-md-semibold leading-tight mb-spacing_sm text-colors_text_text_primary_900_ group-hover:text-colors_text_text_brand_primary_900_ transition-colors">
                      {college.name}
                    </h3>
                    
                    {/* 2. Single Metadata Line: Location • Type • Rank */}
                    <div className="flex items-center flex-wrap gap-x-spacing_md text-text-xs-regular text-colors_text_text_secondary_700_">
                      <span className="truncate max-w-[200px]">{college.location}, {college.state}</span>
                      
                      <span className="text-[6px] text-colors_text_text_tertiary_600_ mb-px">●</span>
                      
                      <span className="uppercase tracking-wide text-[10px] font-medium text-colors_text_text_tertiary_600_">{college.type}</span>
                      
                      {college.ranking && (
                        <>
                           <span className="text-[6px] text-colors_text_text_tertiary_600_ mb-px">●</span>
                           <span className="text-colors_text_text_tertiary_600_">Rank #{college.ranking}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Job Count Badge */}
                  <div className={`flex flex-col items-center justify-center min-w-spacing_14 h-[52px] rounded-radius_md transition-colors flex-shrink-0 ml-spacing_md ${
                      jobCount > 0 ? 'bg-component_colors_components_buttons_primary_button_primary_bg text-component_colors_components_buttons_primary_button_primary_fg' : 'bg-colors_background_bg_tertiary text-colors_text_text_tertiary_600_ border border-colors_border_border_secondary'
                  }`}>
                      <span className="text-text-lg-bold leading-none">{jobCount}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider mt-spacing_xxs">Jobs</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-spacing_lg border-t border-colors_border_border_secondary">
                    <a 
                      href={college.website} 
                      target="_blank" 
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-text-xs-medium hover:underline flex items-center gap-spacing_sm text-colors_text_text_secondary_700_"
                    >
                      Visit website <ExternalLink size={12} />
                    </a>
                    
                    {jobCount > 0 && (
                        <span className="text-text-xs-semibold flex items-center gap-spacing_sm text-colors_text_text_success_primary_600_">
                            <Briefcase size={12} /> Hiring
                        </span>
                    )}
                </div>
              </div>
            );
          })}
          
          {colleges.length === 0 && (
            <div className="text-center py-spacing_9xl text-colors_text_text_tertiary_600_">
                <p className="text-text-lg-medium mb-spacing_xs">No colleges found</p>
                <p className="text-text-sm-regular">Try adjusting your filters.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CollegeList;
