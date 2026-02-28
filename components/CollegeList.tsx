
import React from 'react';
import { College, CollegeType, isHiringPostActive } from '../types';
import { ExternalLink, Briefcase } from 'lucide-react';

interface CollegeListProps {
  colleges: College[];
  selectedCollegeId: string | null;
  onSelectCollege: (id: string) => void;
  isFiltering: boolean;
  hiringFilter: 'all' | 'yes' | 'no';
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

const CollegeList: React.FC<CollegeListProps> = ({ colleges, selectedCollegeId, onSelectCollege, isFiltering, hiringFilter }) => {

  const getHeaderText = () => {
    if (isFiltering) return 'Updating results...';

    const count = colleges.length;
    const suffix = count === 1 ? 'college' : 'colleges';

    if (hiringFilter === 'yes') return `${count} ${suffix} are hiring`;
    if (hiringFilter === 'no') return `${count} ${suffix} are not hiring`;
    return `${count} ${suffix} available`;
  };

  return (
    <div className="flex flex-col gap-spacing_xl pb-spacing_9xl pt-spacing_md">

      {(isFiltering || colleges.length > 0) && (
        <div className="flex items-center justify-between pl-spacing_xs pb-spacing_md">
          <h2 className="text-text-sm-semibold text-colors_text_text_secondary_700_">
            {getHeaderText()}
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
                  group relative p-spacing_3xl rounded-radius_md border transition-all duration-300 cursor-pointer bg-colors_background_bg_secondary
                  ${isSelected
                    ? 'shadow-shadow_floating scale-[1.01] z-10 border-colors_border_border_brand_solid'
                    : 'hover:shadow-shadow_floating hover:-translate-y-0.5 hover:border-colors_border_border_brand_solid border-colors_border_border_secondary'
                  }
                `}
              >
                <div className="flex justify-between items-start mb-spacing_2xl">
                  <div className="flex-1 pr-spacing_xl">
                    {/* 1. Name First */}
                    <h3 className="text-text-lg-bold leading-tight mb-spacing_lg text-colors_text_text_primary_900_ group-hover:text-colors_text_text_brand_primary_900_ transition-colors">
                      {college.name}
                    </h3>

                    {/* 2. Single Metadata Line: Type • Rank */}
                    <div className="flex flex-col gap-spacing_md">
                      <span className="flex items-start gap-spacing_sm w-full text-text-sm-regular text-colors_text_text_secondary_700_">
                        <span className="material-symbols-rounded text-[20px] text-colors_text_text_secondary_700_ flex-shrink-0 mt-[2px]">school</span>
                        <span className="text-wrap">Affiliated to {college.affiliatingUniversity}</span>
                      </span>

                      {college.ranking && (
                        <div className="flex items-center gap-x-spacing_md text-text-xs-regular text-colors_text_text_tertiary_600_ pl-[26px]">
                          <span className="text-colors_text_text_tertiary_600_">Rank #{college.ranking}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hiring Status Badge (Replacement for Job Count) */}
                  {(college.isHiring || college.manualHiringPosts?.some(post => isHiringPostActive(post.lastDateToApply))) && (
                    <div className="flex items-center justify-center px-spacing_md py-spacing_xs rounded-radius_sm border border-colors_border_hiring bg-emerald-50 text-emerald-700 flex-shrink-0 ml-spacing_lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider">HIRING</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-start">
                  <button
                    className="flex items-center gap-spacing_sm text-text-sm-semibold text-colors_text_text_brand_action hover:opacity-80 transition-opacity"
                  >
                    View details <ExternalLink size={16} />
                  </button>
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
      )
      }
    </div>
  );
};

export default CollegeList;
