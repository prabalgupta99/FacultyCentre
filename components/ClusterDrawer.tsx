
import React from 'react';
import { College } from '../types';
import { X, ChevronRight } from 'lucide-react';

interface ClusterDrawerProps {
  colleges: College[];
  isOpen: boolean;
  onClose: () => void;
  onSelectCollege: (id: string) => void;
}

const ClusterDrawer: React.FC<ClusterDrawerProps> = ({ colleges, isOpen, onClose, onSelectCollege }) => {
  return (
    <div 
        className={`fixed z-[550] flex flex-col shadow-shadow_floating transition-transform duration-300 cubic-bezier(0.32, 0.72, 0, 1) bg-colors_background_bg_primary border-colors_border_border_secondary
        bottom-0 left-0 right-0 w-full h-[50vh] rounded-t-lg border-t
        transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-width_sm md:h-full md:rounded-none md:border-l md:border-t-0
        md:translate-y-0 ${isOpen ? 'md:translate-x-0' : 'md:translate-x-full'}
        `}
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
    >
      <div className="flex justify-between items-start px-spacing_2xl py-spacing_xl border-b border-colors_border_border_secondary bg-colors_background_bg_primary z-10">
        <div>
            <h3 className="text-text-md-bold text-colors_text_text_primary_900_">
                Institutions in this area
            </h3>
            <p className="text-text-xs-medium mt-spacing_xs text-colors_text_text_secondary_700_">
                Showing {colleges.length} result{colleges.length !== 1 ? 's' : ''}
            </p>
        </div>
        <button onClick={onClose} className="p-spacing_md -mr-spacing_md rounded-radius_full transition-colors text-colors_text_text_secondary_700_ hover:bg-colors_background_bg_secondary">
            <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-spacing_xl space-y-spacing_lg bg-colors_background_bg_tertiary">
        {colleges.map((college) => (
            <div 
                key={college.id}
                onClick={() => onSelectCollege(college.id)}
                className="group p-spacing_xl rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary hover:border-colors_border_border_brand_solid cursor-pointer transition-all duration-200 shadow-shadow_card hover:shadow-shadow_floating"
            >
                <div className="flex justify-between items-start">
                    <div className="flex-1 pr-spacing_md">
                        <h4 className="text-text-sm-semibold text-colors_text_text_primary_900_ group-hover:text-colors_text_text_brand_primary_900_ transition-colors leading-snug">
                            {college.name}
                        </h4>
                        <div className="flex items-center gap-spacing_sm mt-spacing_xs">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-colors_text_text_tertiary_600_ bg-colors_background_bg_secondary px-spacing_sm py-spacing_xxs rounded-radius_sm border border-colors_border_border_secondary">
                                {college.type}
                            </span>
                            <span className="text-text-xs-regular text-colors_text_text_secondary_700_ truncate">
                                {college.location}
                            </span>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-colors_text_text_tertiary_600_ group-hover:text-colors_text_text_brand_primary_900_ transition-colors flex-shrink-0 mt-spacing_xs" />
                </div>

                {college.openings.length > 0 && (
                    <div className="mt-spacing_lg pt-spacing_md border-t border-colors_border_border_secondary flex items-center justify-between">
                        <span className="text-text-xs-medium text-colors_text_text_success_primary_600_ flex items-center gap-spacing_xs">
                           <div className="w-1.5 h-1.5 rounded-full bg-colors_background_bg_success_primary" />
                           {college.openings.length} Opening{college.openings.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] text-colors_text_text_tertiary_600_ font-medium uppercase">View details</span>
                    </div>
                )}
            </div>
        ))}
      </div>
    </div>
  );
};

export default ClusterDrawer;
