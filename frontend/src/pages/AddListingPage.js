import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NavbarPremium } from '../components/NavbarPremium';
import { Footer } from '../components/Footer';
import { Church, User } from 'lucide-react';

const AddListingPage = () => {
  const navigate = useNavigate();

  const handleSelection = (type) => {
    if (type === 'church') {
      navigate('/listing/church/create');
    } else {
      navigate('/listing/pastor/create');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <NavbarPremium variant="light" fixed={false} />

      <main className="flex-grow flex flex-col items-center justify-start px-4 pt-[30px] pb-12">
        <div className="max-w-4xl w-full text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1A1D21] mb-2 tracking-tight">
            Create a listing
          </h1>
          <p className="text-sm md:text-base text-slate-500 font-medium">
            What type of listing would you like to add?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-lg">
          {/* Church Card */}
          <button
            onClick={() => handleSelection('church')}
            className="group relative bg-white p-6 rounded-3xl shadow-sm border border-slate-100 transition-all duration-500 hover:shadow-2xl hover:shadow-brand/20 hover:-translate-y-1 overflow-hidden aspect-[16/9] md:aspect-square md:h-[220px]"
          >
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10 flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-4 group-hover:bg-brand group-hover:text-white transition-all duration-500 shadow-inner">
                <Church className="h-6 w-6 md:h-8 md:w-8 transition-transform duration-500 group-hover:scale-110" />
              </div>
              <span className="text-lg md:text-xl font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                Church
              </span>
              <div className="mt-2 h-1 w-0 bg-brand rounded-full transition-all duration-500 group-hover:w-8"></div>
            </div>
          </button>

          {/* Pastor Card */}
          <button
            onClick={() => handleSelection('pastor')}
            className="group relative bg-white p-6 rounded-3xl shadow-sm border border-slate-100 transition-all duration-500 hover:shadow-2xl hover:shadow-brand/20 hover:-translate-y-1 overflow-hidden aspect-[16/9] md:aspect-square md:h-[220px]"
          >
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative z-10 flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-4 group-hover:bg-brand group-hover:text-white transition-all duration-500 shadow-inner">
                <User className="h-6 w-6 md:h-8 md:w-8 transition-transform duration-500 group-hover:scale-110" />
              </div>
              <span className="text-lg md:text-xl font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                Pastor
              </span>
              <div className="mt-2 h-1 w-0 bg-brand rounded-full transition-all duration-500 group-hover:w-8"></div>
            </div>
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AddListingPage;