import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NavbarPremium } from '../../components/NavbarPremium';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { PhoneInputPremium } from '../../components/PhoneInputPremium';
import { pastorAPI, taxonomyAPI, churchAPI, utilityAPI } from '../../lib/api';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandItem,
   CommandList,
   CommandInput
} from "../../components/ui/command";
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "../../components/ui/popover";
import {
   Accordion,
   AccordionContent,
   AccordionItem,
   AccordionTrigger,
} from "../../components/ui/accordion";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
} from "../../components/ui/dialog";
import { cn } from "../../lib/utils";
import {
   ChevronsUpDown,
   Search,
   ChevronLeft,
   ChevronRight,
   Check,
   X,
   MapPin,
   Sparkles,
   User,
   Globe,
   Phone,
   Mail,
   Plus,
   Trash2,
   Info,
   Camera,
   Image as ImageIcon,
   Video,
   AlertCircle,
   GraduationCap,
   Award,
   Briefcase,
   Heart,
   Facebook,
   Instagram,
   Youtube,
   Twitter,
   Linkedin,
   Navigation
} from 'lucide-react';
import { toast } from 'sonner';
import FileUpload from '../../components/FileUpload';

// Brand Colors
const BRAND_COLORS = {
   primary: '#6c1cff',
   primaryHover: '#5b17d6',
   primarySoft: '#F3E8FF',
   textDefault: '#3c4043',
   textSecondary: '#5f6368',
   border: '#dadce0',
   surface: '#ffffff',
   bg: '#f8f9fa'
};

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const STEPS = [
   { id: 1, name: 'Identity', description: 'Essential information' },
   { id: 2, name: 'Profile Details', description: 'Experience & Media' },
];

const MINISTRY_EXPERIENCE_OPTIONS = [
   'Youth Ministry', 'Worship Ministry', 'Outreach Ministry', "Children's Ministry",
   'Prayer Ministry', 'Evangelism / Outreach', 'Missions / Global Outreach',
   'Pastoral Care', 'Church Leadership', 'Men\'s Ministry', 'Women\'s Ministry',
];

const TRAINING_OPTIONS = [
   'Ordination Training', 'Leadership Development Training',
   'Counseling / Pastoral Care Training', 'Missionary Training',
   'Worship Leadership Training', 'Youth Ministry Training',
];

const ROLES_INTERESTED_OPTIONS = [
   'Lead Pastor / Senior Pastor', 'Associate / Assistant Pastor',
   'Youth Pastor / Leader', 'Worship Leader / Music Director',
   'Teaching / Bible Study Leader', 'Missions / Outreach Volunteer',
   'Mentoring / Coaching', 'Church Administrator / Office Staff',
   'Chaplain',
];

const COUNTRY_TIMEZONE_MAP = {
   'IN': 'Asia/Kolkata',
   'US': 'America/New_York',
   'GB': 'Europe/London',
   'CA': 'America/Toronto',
   'AU': 'Australia/Sydney',
   'AE': 'Asia/Dubai',
   'SG': 'Asia/Singapore',
   'FR': 'Europe/Paris',
   'NG': 'Africa/Lagos',
   'JP': 'Asia/Tokyo',
   'DE': 'Europe/Berlin',
   'CH': 'Europe/Zurich',
   'NZ': 'Pacific/Auckland',
   'ZA': 'Africa/Johannesburg',
   'BR': 'America/Sao_Paulo',
   'PH': 'Asia/Manila',
   'MY': 'Asia/Kuala_Lumpur',
   'KR': 'Asia/Seoul',
   'RU': 'Europe/Moscow',
   'IT': 'Europe/Rome',
   'ES': 'Europe/Madrid',
   'NL': 'Europe/Amsterdam',
   'SE': 'Europe/Stockholm',
   'NO': 'Europe/Oslo',
   'IE': 'Europe/Dublin',
};

// --- Internal Helper Components ---

const GMBRow = ({ label, children, className, hint }) => (
   <div className={cn("py-2 flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
         <label className="text-[16px] font-semibold tracking-tight text-gray-800">{label}</label>
         {hint && <span className="text-[11px] text-gray-400 font-normal opacity-80">{hint}</span>}
      </div>
      <div className="flex-1">
         {children}
      </div>
   </div>
);

// --- Main Component ---
const PastorCreationFlow2 = () => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const { id } = useParams();
   const [currentStep, setCurrentStep] = useState(1);
   const [pastorId, setPastorId] = useState(id || null);
   const [taxonomies, setTaxonomies] = useState({});
   const [churches, setChurches] = useState([]);
   const [loading, setLoading] = useState(false);
   const [showQuickChurchDialog, setShowQuickChurchDialog] = useState(false);
   const [churchPopoverOpen, setChurchPopoverOpen] = useState(false);
   const [quickChurch, setQuickChurch] = useState({ 
      name: '', email: '', phone: '', denomination: '',
      latitude: '', longitude: '', timezone: 'Europe/London', google_maps_link: '',
      address_line1: '',
      city: '',
      relationship_to_listing: ''
   });
   const [quickChurchLoading, setQuickChurchLoading] = useState(false);
   const [quickChurchMapViewport, setQuickChurchMapViewport] = useState({
      latitude: 20.5937,
      longitude: 78.9629,
      zoom: 12
   });
   const [quickChurchSearchSuggestions, setQuickChurchSearchSuggestions] = useState([]);
   const [quickChurchSearchLoading, setQuickChurchSearchLoading] = useState(false);
   const [citySuggestions, setCitySuggestions] = useState([]);
   const [cityLoading, setCityLoading] = useState(false);
   const [quickCitySuggestions, setQuickCitySuggestions] = useState([]);
   const [quickCityLoading, setQuickCityLoading] = useState(false);
   const [passionInput, setPassionInput] = useState('');
   const [citiesInput, setCitiesInput] = useState('');

   const handleQuickZipChange = async (zip) => {
      setQuickChurch(prev => ({ ...prev, zip_code: zip }));
      if (zip.length < 5) return;

      try {
         const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&format=json&addressdetails=1`);
         const data = await res.json();
         if (data && data.length > 0) {
            const result = data[0].address;
            const city = result.city || result.town || result.village || result.suburb || result.city_district || "";
            const state = result.state || result.region || result.province || "";
            const country = result.country || "";
            if (city || state || country) {
               setQuickChurch(prev => ({
                  ...prev,
                  city: city || prev.city,
                  state: state || prev.state,
                  country: country || prev.country
               }));
               toast.success(`Located: ${city}, ${country}`);
            }
         }
      } catch (e) { }
   };

   const safeParse = (val, fallback) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? fallback : parsed;
   };

   const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      address_line1: '',
      city: '',
      state: '',
      country: '',
      zip_code: '',
      google_maps_link: '',
      latitude: null,
      longitude: null,
      timezone: 'Europe/London',
      profile_picture: '',
      current_designation: '',
      church_associated_to: [],
      denomination: '',
      bible_college: '',
      bio: '',
      cover_image: '',
      gallery_images: [],
      video_url: '',
      locations_serving: [],
      fax: '',
      website: '',
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: '',
      highest_degree: '',
      qualification: '',
      certifications: [],
      skills: [],
      training: [],
      years_in_ministry: null,
      ministry_experience: [],
      recognitions: '',
      languages_known: [],
      worship_styles: [],
      roles_interested: [],
      passion_areas: [],
      cities_served: [],
      relationship_to_listing: '',
      status: 'draft',
   });

   const [mapViewport, setMapViewport] = useState({
      latitude: safeParse(formData.latitude, 20.5937),
      longitude: safeParse(formData.longitude, 78.9629),
      zoom: 12
   });
   const [searchSuggestions, setSearchSuggestions] = useState([]);
   const [searchLoading, setSearchLoading] = useState(false);
   const [resolvingMap, setResolvingMap] = useState(false);

   useEffect(() => {
      fetchTaxonomies();
      fetchChurches();
      if (id) fetchExistingPastor();
      if (id) fetchExistingPastor();
   }, [id]);


   useEffect(() => {
      window.scrollTo(0, 0);
   }, [currentStep]);

   const fetchExistingPastor = async () => {
      setLoading(true);
      try {
         const res = await pastorAPI.getById(id);
         setPastorId(res.data.id);
         setFormData(prev => ({ 
             ...prev, 
             ...res.data,
             church_associated_to: Array.isArray(res.data.church_associated_to) 
                ? res.data.church_associated_to 
                : (res.data.church_associated_to && res.data.church_associated_to !== 'not_listed' ? [res.data.church_associated_to] : [])
          }));
         setPassionInput(res.data.passion_areas?.join(', ') || '');
         setCitiesInput(res.data.cities_served?.join(', ') || '');

         if (res.data.latitude && res.data.longitude) {
            setMapViewport(prev => ({
               ...prev,
               latitude: parseFloat(res.data.latitude),
               longitude: parseFloat(res.data.longitude),
               zoom: 15
            }));
         }
      } catch (error) {
         toast.error('Load failed');
      } finally {
         setLoading(false);
      }
   };

   const fetchTaxonomies = async () => {
      try {
         const res = await taxonomyAPI.getAll();
         setTaxonomies(res.data);
      } catch (error) { }
   };

   const fetchChurches = async () => {
      try {
         const res = await churchAPI.getAll({ limit: 100 });
         setChurches(res.data.data || []);
      } catch (error) { }
   };

   const handleCitySearch = async (query) => {
      if (!query || query.length < 3) {
         setCitySuggestions([]);
         return;
      }
      if (!MAPBOX_TOKEN) {
         console.warn("Mapbox token missing, skipping city search");
         return;
      }
      setCityLoading(true);
      try {
         const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=place,postcode&limit=5`);
         if (!res.ok) throw new Error(`Search failed with status: ${res.status}`);
         const data = await res.json();
         setCitySuggestions(data.features || []);
      } catch (e) {
         console.error("City search failed:", e?.message || "Unknown error");
      } finally {
         setCityLoading(false);
      }
   };

   const handleCitySelect = (suggestion) => {
      const [lng, lat] = suggestion.center;
      updateFormData('city', suggestion.text);
      updateFormData('latitude', lat.toString());
      updateFormData('longitude', lng.toString());
      setCitySuggestions([]);
   };

   const handleQuickCitySearch = async (query) => {
      if (!query || query.length < 3) {
         setQuickCitySuggestions([]);
         return;
      }
      if (!MAPBOX_TOKEN) {
         console.warn("Mapbox token missing, skipping quick city search");
         return;
      }
      setQuickCityLoading(true);
      try {
         const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=place,postcode&limit=5`);
         if (!res.ok) throw new Error(`Quick search failed with status: ${res.status}`);
         const data = await res.json();
         setQuickCitySuggestions(data.features || []);
      } catch (e) {
         console.error("Quick City search failed:", e?.message || "Unknown error");
      } finally {
         setQuickCityLoading(false);
      }
   };

   const handleQuickCitySelect = (suggestion) => {
      const [lng, lat] = suggestion.center;
      setQuickChurch(prev => ({
         ...prev,
         city: suggestion.text,
         latitude: lat.toString(),
         longitude: lng.toString()
      }));
      setQuickCitySuggestions([]);
   };

   const updateFormData = (field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
   };


   const toggleArrayItem = (field, item) => {
      const current = formData[field] || [];
      if (current.includes(item)) {
         updateFormData(field, current.filter(i => i !== item));
      } else {
         updateFormData(field, [...current, item]);
      }
   };


   const handleQuickChurchCreate = async () => {
      if (!quickChurch.name || !quickChurch.email || !quickChurch.phone || !quickChurch.denomination || !quickChurch.city) {
         toast.error('Please fill in required fields (Name, Email, Phone, City, Denomination)');
         return;
      }
      setQuickChurchLoading(true);
      try {
         const churchData = {
            ...quickChurch,
            pastor_name: formData.name, 
            address_line1: quickChurch.address_line1 || 'Quick Profile', 
            city: quickChurch.city || 'N/A',
            state: quickChurch.state || 'N/A',
            country: quickChurch.country || 'N/A',
            status: 'draft'
         };
         const res = await churchAPI.create(churchData);
         toast.success('Church created & linked!');
         setChurches(prev => [...prev, res.data]);
         updateFormData('church_associated_to', [...(formData.church_associated_to || []), res.data.name]);
         setShowQuickChurchDialog(false);
         setQuickChurch({ 
            name: '', email: '', phone: '', denomination: '',
            latitude: '', longitude: '', timezone: 'UTC', google_maps_link: '',
            address_line1: ''
         });
      } catch (e) {
         toast.error('Failed to create church');
      } finally {
         setQuickChurchLoading(false);
      }
   };

   const handlePhoneCountryChange = (countryCode) => {
      const tz = COUNTRY_TIMEZONE_MAP[countryCode];
      if (tz) {
         updateFormData('timezone', tz);
      }
   };

   const handleNext = async () => {
      // Step 1 Validation
      if (currentStep === 1) {
         if (!formData.name?.trim()) return toast.error('Full Name is mandatory');
         if (!formData.email?.trim()) return toast.error('Email is mandatory');
         if (!formData.phone?.trim()) return toast.error('Phone number is mandatory');
         if (!formData.city?.trim()) return toast.error('Search City is mandatory');
         if (!formData.denomination) return toast.error('Denomination is mandatory');
         
         // Simple email validation
         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
         if (!emailRegex.test(formData.email)) return toast.error('Please enter a valid email address');
      }

      // Save draft before moving
      setLoading(true);
      try {
         if (pastorId) await pastorAPI.update(pastorId, formData);
         else {
            const res = await pastorAPI.create({ ...formData, status: 'draft' });
            setPastorId(res.data.id);
         }
      } catch (e) { console.error('Next save failed', e); }
      setLoading(false);

      if (currentStep < 2) {
         setCurrentStep(currentStep + 1);
         window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
         handlePublish();
      }
   };

   const handleBack = () => {
      if (currentStep > 1) {
         setCurrentStep(currentStep - 1);
         window.scrollTo({ top: 0, behavior: 'smooth' });
      }
   };

   const handleStepClick = async (stepId) => {
      if (stepId === currentStep) return;
      if (formData.name) {
         setLoading(true);
         try {
            if (pastorId) await pastorAPI.update(pastorId, formData);
            else {
               const res = await pastorAPI.create({ ...formData, status: 'draft' });
               setPastorId(res.data.id);
            }
         } catch (e) { }
         setLoading(false);
      }
      setCurrentStep(stepId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
   };

   const handleSaveDraft = async () => {
      if (!formData.name) return toast.error('Name required to save draft');
      setLoading(true);
      try {
         if (pastorId) await pastorAPI.update(pastorId, formData);
         else {
            const res = await pastorAPI.create({ ...formData, status: 'draft' });
            setPastorId(res.data.id);
         }
         toast.success('Draft Saved');
      } catch (error) {
         toast.error('Save failed');
      } finally {
         setLoading(false);
      }
   };

   const handlePublish = async () => {
      const requiredFields = {
         name: 'Full Name',
         email: 'Email',
         phone: 'Phone'
      };

      const missing = Object.entries(requiredFields)
         .filter(([key]) => !formData[key])
         .map(([_, label]) => label);

      if (missing.length > 0) {
         return toast.error(`Please fill in required fields: ${missing.join(', ')}`);
      }

      setLoading(true);
      try {
         const cleanedData = { ...formData, status: 'published' };
         if (pastorId) await pastorAPI.update(pastorId, cleanedData);
         else await pastorAPI.create(cleanedData);
         toast.success('Published Successfully');
         navigate('/dashboard/my-listings');
      } catch (error) {
         toast.error('Publish failed');
      } finally {
         setLoading(false);
      }
   };
   const inputStyle = "h-[45px] rounded-none border-0 border-b-2 border-gray-100 bg-transparent px-0 focus-visible:ring-0 focus:border-[#6c1cff] text-[16px] font-normal transition-all placeholder:text-gray-300 shadow-none";
   const selectStyle = "h-[45px] rounded-none border-0 border-b-2 border-gray-100 bg-transparent px-0 focus:ring-0 focus:border-[#6c1cff] text-[15px] font-normal transition-all shadow-none";

   return (
      <div className="min-h-screen bg-[#f8f9fa] selection:bg-[#6c1cff]/10 text-[#3c4043] font-sans flex flex-col">
         <NavbarPremium variant="light" fixed={false} />

         <main className="flex-1 flex justify-center p-4 md:p-8 lg:p-12">
            <div className="max-w-[1240px] w-full flex flex-col md:flex-row gap-12">

               {/* Left Side: Branding & Context */}
               <div className="hidden md:flex md:w-[32%] flex-col justify-between sticky top-[100px] h-fit">
                  <div className="space-y-12 animate-in fade-in slide-in-from-left-8 duration-700">
                     <div className="space-y-8">
                        <div className="w-16 h-16 bg-[#6c1cff]/5 rounded-full flex items-center justify-center">
                           <User className="h-8 w-8 text-[#6c1cff]" />
                        </div>
                        <div className="space-y-4">
                           <h1 className="text-[40px] font-extrabold text-[#202124] tracking-tight leading-[1.1]">
                              Build your <br />
                              <span className="text-[#6c1cff]">Pastor Profile</span>
                           </h1>
                           <p className="text-[15px] leading-relaxed text-[#5f6368] max-w-[320px]">
                              A dedicated space for spiritual leaders to share their calling, experience, and educational background with the worldwide body of Christ.
                           </p>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="space-y-5">
                           {[
                              { icon: GraduationCap, text: "Educational Background" },
                              { icon: Briefcase, text: "Professional Experience" },
                              { icon: Award, text: "Ministry Certifications" }
                           ].map((item, i) => (
                              <div key={i} className="flex items-center gap-4 group cursor-default">
                                 <div className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center group-hover:border-[#6c1cff]/30 transition-all">
                                    <item.icon className="w-4 h-4 text-[#6c1cff]" />
                                 </div>
                                 <span className="text-[15px] font-normal text-[#3c4043] tracking-wide">
                                    {item.text}
                                 </span>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right Side: Step-by-Step Form Container */}
               <div className="flex-1 bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden flex flex-col">

                  {/* Sticky Progress Header */}
                  <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-10 py-6 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        {STEPS.map((step, idx) => (
                           <div key={step.id} onClick={() => handleStepClick(step.id)} className="flex items-center gap-3 cursor-pointer group">
                              <div className={cn(
                                 "w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold transition-all",
                                 currentStep === step.id ? "bg-[#6c1cff] text-white shadow-lg shadow-purple-200" :
                                    currentStep > step.id ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400",
                                 "group-hover:scale-110 active:scale-95 transition-transform"
                              )}>
                                 {currentStep > step.id ? "✓" : step.id}
                              </div>
                              <span className={cn(
                                 "text-[15px] font-black tracking-wide hidden lg:block transition-colors",
                                 currentStep === step.id ? "text-[#6c1cff]" : "text-gray-400 group-hover:text-gray-600"
                              )}>
                                 {step.name}
                              </span>
                              {idx < STEPS.length - 1 && <div className="w-4 h-[2px] bg-gray-100 mx-1" />}
                           </div>
                        ))}
                     </div>
                     <div className="bg-gray-50 px-6 py-2.5 rounded-full">
                        <span className="text-[11px] font-black tracking-wide text-gray-500 whitespace-nowrap">Step {currentStep} &nbsp; of &nbsp; 2</span>
                     </div>
                  </div>

                  {/* Form Content Area */}
                  <div className="flex-1 py-12 px-10">
                     <div className="flex-1 min-w-0 max-w-5xl space-y-2 animate-in fade-in slide-in-from-right-8 duration-500">

                        {currentStep === 1 && (
                           <div className="space-y-4">
                              <GMBRow label="Full Name *">
                                 <Input value={formData.name} onChange={(e) => updateFormData('name', e.target.value)} placeholder="e.g. Rev. John Doe" className={inputStyle} />
                              </GMBRow>

                              <div className="grid grid-cols-2 gap-x-12">
                                 <GMBRow label="Email *">
                                    <Input value={formData.email} onChange={(e) => updateFormData('email', e.target.value)} placeholder="pastor@email.com" className={inputStyle} />
                                 </GMBRow>
                                 <GMBRow label="Phone *">
                                    <PhoneInputPremium 
                                       value={formData.phone} 
                                       onChange={(val) => updateFormData('phone', val)} 
                                       onCountryChange={handlePhoneCountryChange}
                                       placeholder="Phone number" 
                                    />
                                 </GMBRow>
                              </div>


                              <GMBRow label="Operating Timezone">
                                 <div className="relative group">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#6c1cff] transition-colors z-10" />
                                    <Select value={formData.timezone} onValueChange={(v) => updateFormData('timezone', v)}>
                                       <SelectTrigger className={cn(selectStyle, "pl-10")}>
                                          <SelectValue placeholder="Select timezone" />
                                       </SelectTrigger>
                                       <SelectContent position="popper" side="bottom" className="z-[110] max-h-[300px]">
                                          {[
                                             'UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 
                                             'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
                                             'Australia/Sydney', 'Europe/Paris', 'Africa/Lagos', 'Asia/Tokyo', 
                                             formData.timezone
                                          ].filter((v, i, a) => v && a.indexOf(v) === i).sort().map(tz => (
                                             <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                          ))}
                                       </SelectContent>
                                    </Select>
                                 </div>
                              </GMBRow>

                              <GMBRow label="Full Address">
                                 <Input 
                                    value={formData.address_line1} 
                                    onChange={(e) => updateFormData('address_line1', e.target.value)} 
                                    placeholder="Building No, Street Name, Area, City, State, Country, Zip" 
                                    className={inputStyle} 
                                 />
                              </GMBRow>

                              <div className="space-y-2 relative">
                                 <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-400">City *</Label>
                                 <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                       placeholder="Enter city or pincode" 
                                       value={formData.city} 
                                       onChange={(e) => {
                                          updateFormData('city', e.target.value);
                                          handleCitySearch(e.target.value);
                                       }} 
                                       className={cn(inputStyle, "pl-10")} 
                                    />
                                    {cityLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-[#6c1cff] border-t-transparent rounded-full animate-spin" />}
                                 </div>
                                 
                                 {citySuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-[110] overflow-hidden">
                                       {citySuggestions.map((s, idx) => (
                                          <button
                                             key={idx}
                                             onClick={() => handleCitySelect(s)}
                                             className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-2 border-b border-gray-50 last:border-none"
                                          >
                                             <MapPin className="h-4 w-4 text-[#6c1cff] mt-0.5" />
                                             <div className="min-w-0">
                                                <p className="text-[13px] font-semibold text-gray-800 truncate">{s.text}</p>
                                                <p className="text-[11px] text-gray-500 truncate">{s.place_name}</p>
                                             </div>
                                          </button>
                                       ))}
                                    </div>
                                 )}
                              </div>
                                 <GMBRow label="Denomination *">
                                    <Select value={formData.denomination} onValueChange={(v) => updateFormData('denomination', v)}>
                                       <SelectTrigger className={selectStyle}><SelectValue placeholder="Select denomination" /></SelectTrigger>
                                       <SelectContent className="z-[100] max-h-[300px]">
                                          {(taxonomies.denomination || []).sort().map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                       </SelectContent>
                                    </Select>
                                 </GMBRow>


                              <GMBRow label="Associated Church" hint="Select one or more churches">
                                  <div className="space-y-4 pt-1">
                                     <Popover open={churchPopoverOpen} onOpenChange={setChurchPopoverOpen}>
                                        <PopoverTrigger asChild>
                                           <button role="combobox" className={cn(selectStyle, "w-full flex items-center justify-between text-left hover:bg-gray-50/50")}>
                                              <span className="text-gray-400">Add church association...</span>
                                              <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                           </button>
                                        </PopoverTrigger>
                                        <PopoverContent side="bottom" align="start" className="w-[400px] p-0 z-[100] rounded-xl overflow-hidden shadow-2xl border-none">
                                           <Command>
                                              <CommandInput placeholder="Search churches..." className="h-10 text-[14px]" />
                                              <CommandList className="max-h-[300px] custom-scrollbar">
                                                 <CommandEmpty>No church found.</CommandEmpty>
                                                 <CommandGroup>
                                                    <CommandItem onSelect={() => { setShowQuickChurchDialog(true); setChurchPopoverOpen(false); }} className="text-[#6c1cff] font-semibold py-3 px-4 flex items-center gap-2">
                                                       <Plus className="h-4 w-4" /> Not listed yet? Create now
                                                    </CommandItem>
                                                    {[...churches].sort((a,b)=>a.name.localeCompare(b.name)).map(c => (
                                                       <CommandItem 
                                                          key={c.id} 
                                                          value={c.name} 
                                                          onSelect={() => toggleArrayItem('church_associated_to', c.name)} 
                                                          className="py-3 px-4 flex items-center justify-between"
                                                       >
                                                          <div className="flex items-center gap-2">
                                                             <div className={cn(
                                                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                                formData.church_associated_to?.includes(c.name) ? "bg-[#6c1cff] border-[#6c1cff]" : "border-gray-300"
                                                             )}>
                                                                {formData.church_associated_to?.includes(c.name) && <Check size={12} className="text-white" />}
                                                             </div>
                                                             <span>{c.name}</span>
                                                          </div>
                                                       </CommandItem>
                                                    ))}
                                                 </CommandGroup>
                                              </CommandList>
                                           </Command>
                                        </PopoverContent>
                                     </Popover>

                                     {/* Selected Churches Badges */}
                                     <div className="flex flex-wrap gap-2">
                                        {(formData.church_associated_to || []).map(name => (
                                           <Badge 
                                              key={name} 
                                              className="bg-[#6c1cff]/5 text-[#6c1cff] hover:bg-[#6c1cff]/10 border-[#6c1cff]/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                                           >
                                              {name}
                                              <X 
                                                 size={12} 
                                                 className="cursor-pointer hover:text-red-500" 
                                                 onClick={() => toggleArrayItem('church_associated_to', name)} 
                                              />
                                           </Badge>
                                        ))}
                                        {(!formData.church_associated_to || formData.church_associated_to.length === 0) && (
                                           <p className="text-[12px] text-gray-400 italic">No churches associated yet</p>
                                        )}
                                     </div>
                                  </div>
                               </GMBRow>

                              <GMBRow label="Current Designation">
                                 <Input value={formData.current_designation} onChange={(e) => updateFormData('current_designation', e.target.value)} placeholder="e.g. Senior Pastor" className={inputStyle} />
                              </GMBRow>
                           </div>
                        )}

                        {currentStep === 2 && (
                           <div className="pb-20 w-full animate-in fade-in duration-500">
                              <Accordion type="single" collapsible defaultValue="visual_identity" className="border-none space-y-4">
                                 {/* 1. Visual Identity */}
                                 <AccordionItem value="visual_identity" className="border-b border-gray-100 px-2 rounded-2xl transition-all">
                                    <AccordionTrigger className="hover:no-underline py-6">
                                       <div className="flex items-center gap-4">
                                          <div className={cn(
                                             "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black transition-all border-2",
                                             (formData.profile_picture || formData.cover_image) ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-gray-400"
                                          )}>
                                             {(formData.profile_picture || formData.cover_image) ? "✓" : "1"}
                                          </div>
                                          <span className="text-[16px] font-semibold text-gray-800 tracking-wide">Visual Identity</span>
                                       </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-8">
                                       <div className="space-y-6">
                                          <GMBRow label="Profile Picture">
                                             <FileUpload label="" category="profile" accept="image/*" value={formData.profile_picture} onChange={(url) => updateFormData('profile_picture', url)} hint="Square image works best" previewType="thumbnail" />
                                          </GMBRow>
                                          <GMBRow label="Cover Photo" hint="Wide landscape photo">
                                             <FileUpload category="cover" accept="image/*" value={formData.cover_image} onChange={(url) => updateFormData('cover_image', url)} previewType="thumbnail" className="h-[120px] bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100" />
                                          </GMBRow>
                                          <GMBRow label="Profile Gallery" hint="Max 10 photos">
                                             <FileUpload category="gallery" multiple={true} maxFiles={10} value={formData.gallery_images} onChange={(urls) => updateFormData('gallery_images', urls)} className="min-h-[140px] bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100" />
                                          </GMBRow>
                                          <GMBRow label="Video (URL)">
                                             <Input value={formData.video_url} onChange={(e) => updateFormData('video_url', e.target.value)} placeholder="YouTube / Vimeo link" className={inputStyle} />
                                          </GMBRow>
                                       </div>
                                    </AccordionContent>
                                 </AccordionItem>

                                 {/* 2. Professional Background */}
                                 <AccordionItem value="professional" className="border-b border-gray-100 px-2 rounded-2xl transition-all">
                                    <AccordionTrigger className="hover:no-underline py-6">
                                       <div className="flex items-center gap-4">
                                          <div className={cn(
                                             "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black transition-all border-2",
                                             (formData.years_in_ministry || formData.highest_degree) ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-gray-400"
                                          )}>
                                             {(formData.years_in_ministry || formData.highest_degree) ? "✓" : "2"}
                                          </div>
                                          <span className="text-[16px] font-semibold text-gray-800 tracking-wide">Professional Background</span>
                                       </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-8">
                                       <div className="grid grid-cols-2 gap-x-12">
                                          <GMBRow label="Years in Ministry">
                                             <Input 
                                                type="number" 
                                                min="0"
                                                value={formData.years_in_ministry || ''} 
                                                onChange={(e) => {
                                                   const val = parseInt(e.target.value);
                                                   updateFormData('years_in_ministry', isNaN(val) ? '' : Math.max(0, val));
                                                }} 
                                                onKeyDown={(e) => {
                                                   if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                }}
                                                placeholder="e.g. 15" 
                                                className={inputStyle} 
                                             />
                                          </GMBRow>
                                          <GMBRow label="Highest Degree">
                                             <Select value={formData.highest_degree} onValueChange={(v) => updateFormData('highest_degree', v)}>
                                                <SelectTrigger className={selectStyle}><SelectValue placeholder="Select degree" /></SelectTrigger>
                                                <SelectContent className="z-[100]">
                                                   {(taxonomies.qualification || []).map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                                                </SelectContent>
                                             </Select>
                                          </GMBRow>
                                       </div>

                                       <GMBRow label="Bible College">
                                          <Input value={formData.bible_college} onChange={(e) => updateFormData('bible_college', e.target.value)} placeholder="Seminary name" className={inputStyle} />
                                       </GMBRow>

                                       <GMBRow label="Ministry Experience" hint="Select from list">
                                          <div className="space-y-3 pt-1">
                                             <Select value="" onValueChange={(val) => toggleArrayItem('ministry_experience', val)}>
                                                <SelectTrigger className={cn(selectStyle, "bg-white")}>
                                                   <SelectValue placeholder="Add Experience" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[100] max-h-[300px]">
                                                   {MINISTRY_EXPERIENCE_OPTIONS.map(opt => (
                                                      <SelectItem key={opt} value={opt}>
                                                         <div className="flex items-center gap-2">
                                                            {formData.ministry_experience?.includes(opt) && <Check size={14} className="text-[#6c1cff]" />}
                                                            {opt}
                                                         </div>
                                                      </SelectItem>
                                                   ))}
                                                </SelectContent>
                                             </Select>
                                             <div className="flex flex-wrap gap-2">
                                                {formData.ministry_experience?.map(opt => (
                                                   <Badge 
                                                      key={opt} 
                                                      className="bg-[#6c1cff]/5 text-[#6c1cff] hover:bg-[#6c1cff]/10 border-[#6c1cff]/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                                                   >
                                                      {opt}
                                                      <X 
                                                         size={12} 
                                                         className="cursor-pointer hover:text-red-500" 
                                                         onClick={() => toggleArrayItem('ministry_experience', opt)} 
                                                      />
                                                   </Badge>
                                                ))}
                                             </div>
                                          </div>
                                       </GMBRow>

                                       <GMBRow label="Training Completed" hint="Select from list">
                                          <div className="space-y-3 pt-1">
                                             <Select value="" onValueChange={(val) => toggleArrayItem('training', val)}>
                                                <SelectTrigger className={cn(selectStyle, "bg-white")}>
                                                   <SelectValue placeholder="Add Training" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[100] max-h-[300px]">
                                                   {TRAINING_OPTIONS.map(opt => (
                                                      <SelectItem key={opt} value={opt}>
                                                         <div className="flex items-center gap-2">
                                                            {formData.training?.includes(opt) && <Check size={14} className="text-[#6c1cff]" />}
                                                            {opt}
                                                         </div>
                                                      </SelectItem>
                                                   ))}
                                                </SelectContent>
                                             </Select>
                                             <div className="flex flex-wrap gap-2">
                                                {formData.training?.map(opt => (
                                                   <Badge 
                                                      key={opt} 
                                                      className="bg-[#6c1cff]/5 text-[#6c1cff] hover:bg-[#6c1cff]/10 border-[#6c1cff]/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                                                   >
                                                      {opt}
                                                      <X 
                                                         size={12} 
                                                         className="cursor-pointer hover:text-red-500" 
                                                         onClick={() => toggleArrayItem('training', opt)} 
                                                      />
                                                   </Badge>
                                                ))}
                                             </div>
                                          </div>
                                       </GMBRow>

                                       <GMBRow label="Roles Interested In" hint="Select from list">
                                          <div className="space-y-3 pt-1">
                                             <Select value="" onValueChange={(val) => toggleArrayItem('roles_interested', val)}>
                                                <SelectTrigger className={cn(selectStyle, "bg-white")}>
                                                   <SelectValue placeholder="Add Role" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[100] max-h-[300px]">
                                                   {ROLES_INTERESTED_OPTIONS.map(opt => (
                                                      <SelectItem key={opt} value={opt}>
                                                         <div className="flex items-center gap-2">
                                                            {formData.roles_interested?.includes(opt) && <Check size={14} className="text-[#6c1cff]" />}
                                                            {opt}
                                                         </div>
                                                      </SelectItem>
                                                   ))}
                                                </SelectContent>
                                             </Select>
                                             <div className="flex flex-wrap gap-2">
                                                {formData.roles_interested?.map(opt => (
                                                   <Badge 
                                                      key={opt} 
                                                      className="bg-[#6c1cff]/5 text-[#6c1cff] hover:bg-[#6c1cff]/10 border-[#6c1cff]/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                                                   >
                                                      {opt}
                                                      <X 
                                                         size={12} 
                                                         className="cursor-pointer hover:text-red-500" 
                                                         onClick={() => toggleArrayItem('roles_interested', opt)} 
                                                      />
                                                   </Badge>
                                                ))}
                                             </div>
                                          </div>
                                       </GMBRow>
                                    </AccordionContent>
                                 </AccordionItem>

                                 {/* 3. Biography & Narrative */}
                                 <AccordionItem value="narrative" className="border-b border-gray-100 px-2 rounded-2xl transition-all">
                                    <AccordionTrigger className="hover:no-underline py-6">
                                       <div className="flex items-center gap-4">
                                          <div className={cn(
                                             "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black transition-all border-2",
                                             (formData.bio && formData.languages_known?.length > 0) ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-gray-400"
                                          )}>
                                             {(formData.bio && formData.languages_known?.length > 0) ? "✓" : "3"}
                                          </div>
                                          <span className="text-[16px] font-semibold text-gray-800 tracking-wide">Biography & Narrative</span>
                                       </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-8">
                                       <GMBRow label="Biography / Calling">
                                          <Textarea value={formData.bio} onChange={(e) => updateFormData('bio', e.target.value)} rows={6} className="rounded-2xl border-gray-100 focus:border-[#6c1cff] px-4 py-4 text-[15px] min-h-[150px] shadow-none" placeholder="Share your ministry journey..." />
                                       </GMBRow>

                                       <div className="grid grid-cols-2 gap-x-12">
                                          <GMBRow label="Passion Areas" hint="Comma-separated">
                                             <Input 
                                                value={passionInput} 
                                                onChange={(e) => setPassionInput(e.target.value)}
                                                onBlur={() => updateFormData('passion_areas', passionInput.split(',').map(s => s.trim()).filter(Boolean))}
                                                className={inputStyle} 
                                                placeholder="e.g. Youth, Healing, Worship"
                                             />
                                          </GMBRow>
                                          <GMBRow label="Cities Served" hint="Comma-separated">
                                             <Input 
                                                value={citiesInput} 
                                                onChange={(e) => setCitiesInput(e.target.value)}
                                                onBlur={() => updateFormData('cities_served', citiesInput.split(',').map(s => s.trim()).filter(Boolean))}
                                                className={inputStyle} 
                                                placeholder="e.g. New York, Chicago"
                                             />
                                          </GMBRow>
                                       </div>

                                       <GMBRow label="Languages Known" hint="Select from list">
                                          <div className="space-y-3 pt-1">
                                             <Select value="" onValueChange={(val) => toggleArrayItem('languages_known', val)}>
                                                <SelectTrigger className={cn(selectStyle, "bg-white")}>
                                                   <SelectValue placeholder="Add Language" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[100] max-h-[300px]">
                                                   {(taxonomies.language || []).map(lang => (
                                                      <SelectItem key={lang} value={lang}>
                                                         <div className="flex items-center gap-2">
                                                            {formData.languages_known?.includes(lang) && <Check size={14} className="text-[#6c1cff]" />}
                                                            {lang}
                                                         </div>
                                                      </SelectItem>
                                                   ))}
                                                </SelectContent>
                                             </Select>
                                             
                                             <div className="flex flex-wrap gap-2">
                                                {formData.languages_known?.map(lang => (
                                                   <Badge 
                                                      key={lang} 
                                                      className="bg-[#6c1cff]/5 text-[#6c1cff] hover:bg-[#6c1cff]/10 border-[#6c1cff]/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                                                   >
                                                      {lang}
                                                      <X 
                                                         size={12} 
                                                         className="cursor-pointer hover:text-red-500" 
                                                         onClick={() => toggleArrayItem('languages_known', lang)} 
                                                      />
                                                   </Badge>
                                                ))}
                                             </div>
                                          </div>
                                       </GMBRow>
                                       
                                       <GMBRow label="Recognitions / Awards">
                                          <Textarea value={formData.recognitions} onChange={(e) => updateFormData('recognitions', e.target.value)} placeholder="Honors, awards, or key milestones..." className="min-h-[100px] border-b-2 border-gray-100 bg-transparent px-0 focus-visible:ring-0 focus:border-[#6c1cff] text-[16px] font-normal transition-all" />
                                       </GMBRow>
                                    </AccordionContent>
                                 </AccordionItem>

                                 {/* 4. Social Networks */}
                                 <AccordionItem value="socials" className="border-none px-2 rounded-2xl transition-all">
                                    <AccordionTrigger className="hover:no-underline py-6">
                                       <div className="flex items-center gap-4">
                                          <div className={cn(
                                             "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium transition-all border-2",
                                             (formData.facebook || formData.instagram) ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-gray-400"
                                          )}>
                                             {(formData.facebook || formData.instagram) ? "✓" : "4"}
                                          </div>
                                          <span className="text-[16px] font-semibold text-gray-800 tracking-wide">Social Networks</span>
                                       </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-8">
                                       <div className="grid grid-cols-2 gap-x-12 gap-y-8 pt-4">
                                          <div className="space-y-2">
                                             <div className="flex items-center gap-2 mb-1">
                                                <Facebook className="h-4 w-4 text-[#1877F2]" />
                                                <span className="text-[12px] font-medium text-gray-400 uppercase tracking-widest">Facebook</span>
                                             </div>
                                             <Input value={formData.facebook} onChange={(e) => updateFormData('facebook', e.target.value)} placeholder="facebook.com/pastor" className={inputStyle} />
                                          </div>
                                          <div className="space-y-2">
                                             <div className="flex items-center gap-2 mb-1">
                                                <Instagram className="h-4 w-4 text-[#E4405F]" />
                                                <span className="text-[12px] font-medium text-gray-400 uppercase tracking-widest">Instagram</span>
                                             </div>
                                             <Input value={formData.instagram} onChange={(e) => updateFormData('instagram', e.target.value)} placeholder="instagram.com/pastor" className={inputStyle} />
                                          </div>
                                          <div className="space-y-2">
                                             <div className="flex items-center gap-2 mb-1">
                                                <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                                                <span className="text-[12px] font-medium text-gray-400 uppercase tracking-widest">LinkedIn</span>
                                             </div>
                                             <Input value={formData.linkedin} onChange={(e) => updateFormData('linkedin', e.target.value)} placeholder="linkedin.com/in/pastor" className={inputStyle} />
                                          </div>
                                          <div className="space-y-2">
                                             <div className="flex items-center gap-2 mb-1">
                                                <Youtube className="h-4 w-4 text-[#FF0000]" />
                                                <span className="text-[12px] font-medium text-gray-400 uppercase tracking-widest">YouTube</span>
                                             </div>
                                             <Input value={formData.youtube} onChange={(e) => updateFormData('youtube', e.target.value)} placeholder="youtube.com/@pastor" className={inputStyle} />
                                          </div>
                                       </div>
                                    </AccordionContent>
                                 </AccordionItem>

                                 {/* 5. Verification */}
                                 <AccordionItem value="verification" className="border-none px-2 rounded-2xl transition-all">
                                    <AccordionTrigger className="hover:no-underline py-6">
                                       <div className="flex items-center gap-4">
                                          <div className={cn(
                                             "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black transition-all border-2",
                                             formData.relationship_to_listing ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-gray-400"
                                          )}>
                                             {formData.relationship_to_listing ? "✓" : "5"}
                                          </div>
                                          <span className="text-[16px] font-semibold text-gray-800 tracking-wide">Verification</span>
                                       </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-8">
                                       <div className="p-8 bg-gray-50/30 rounded-3xl border border-gray-100 space-y-4">
                                          <div className="flex items-center gap-4 mb-2">
                                             <div className="w-10 h-10 bg-[#6c1cff]/10 rounded-full flex items-center justify-center">
                                                <Check className="h-5 w-5 text-[#6c1cff]" />
                                             </div>
                                             <h4 className="text-base font-semibold text-gray-900">Listing Verification</h4>
                                          </div>
                                          <GMBRow label="How are you related to this listing? (Optional)">
                                             <Input 
                                                value={formData.relationship_to_listing} 
                                                onChange={(e) => updateFormData('relationship_to_listing', e.target.value)} 
                                                placeholder="e.g. Lead Pastor, Admin, Founder..." 
                                                className={inputStyle} 
                                             />
                                          </GMBRow>
                                       </div>
                                    </AccordionContent>
                                 </AccordionItem>

                              </Accordion>
                           </div>
                        )}



                        {/* Navigation Footer */}
                        <div className="flex items-center justify-between pt-16 mt-8 border-t border-gray-50 bg-white sticky bottom-0 py-6">
                           <Button onClick={handleBack} variant="ghost" disabled={currentStep === 1} className="h-14 px-8 rounded-2xl text-[14px] font-medium tracking-widest text-[#5f6368] hover:bg-gray-50 flex items-center gap-3">
                              <ChevronLeft className="h-5 w-5" /> Back
                           </Button>
                           <div className="flex items-center gap-4">
                              <Button onClick={handleSaveDraft} variant="outline" className="h-14 px-10 rounded-2xl border-gray-100 text-[#5f6368] font-medium text-[12px] tracking-[0.2em] uppercase hover:bg-gray-50 shadow-none">
                                 {loading ? 'Saving...' : 'Save Draft'}
                              </Button>
                              <Button onClick={handleNext} className="h-14 px-10 rounded-2xl bg-[#6c1cff] hover:bg-[#5b17d6] text-white font-medium text-[12px] tracking-[0.2em] uppercase shadow-2xl shadow-purple-200 flex items-center gap-3 active:scale-95 transition-all">
                                 {currentStep === 2 ? 'Publish Profile' : 'Continue'}
                                 <ChevronRight className="h-5 w-5" />
                              </Button>
                           </div>
                        </div>

                     </div>
                  </div>
               </div>

            </div>
         </main>

         {/* Quick Church Dialog */}
         <Dialog open={showQuickChurchDialog} onOpenChange={setShowQuickChurchDialog}>
            <DialogContent className="sm:max-w-xl rounded-3xl border-none p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
               <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl font-extrabold tracking-tight">Quick Church Profile</DialogTitle>
                  <p className="text-[14px] text-gray-500">Add the church name and basic details to link your profile.</p>
               </DialogHeader>
               
               <div className="space-y-6 pt-4">
                  <div className="space-y-2">
                     <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-400">Church Full Name *</Label>
                     <Input placeholder="Enter church name" value={quickChurch.name} onChange={(e) => setQuickChurch({ ...quickChurch, name: e.target.value })} className={inputStyle} />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-400">Email *</Label>
                        <Input placeholder="Official email" value={quickChurch.email} onChange={(e) => setQuickChurch({ ...quickChurch, email: e.target.value })} className={inputStyle} />
                     </div>
                     <div className="space-y-2">
                        <GMBRow label="Phone *">
                           <PhoneInputPremium 
                              value={quickChurch.phone} 
                              onChange={(val) => setQuickChurch(prev => ({ ...prev, phone: val }))} 
                              onCountryChange={(code) => {
                                 const tz = COUNTRY_TIMEZONE_MAP[code];
                                 if (tz) setQuickChurch(prev => ({ ...prev, timezone: tz }));
                              }}
                              placeholder="Phone number" 
                           />
                        </GMBRow>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-400">Operating Timezone</Label>
                     <div className="flex items-center gap-2 px-4 h-11 bg-gray-50 rounded-xl text-[13px] text-gray-600">
                        <Globe size={14} className="text-gray-400" />
                        <Select value={quickChurch.timezone} onValueChange={(val) => setQuickChurch({ ...quickChurch, timezone: val })}>
                           <SelectTrigger className="bg-transparent border-none p-0 h-auto focus:ring-0">
                              <SelectValue placeholder="Select timezone" />
                           </SelectTrigger>
                           <SelectContent className="z-[130]">
                              {['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York'].map(tz => (
                                 <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="space-y-2">
                        <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-400">Full Address *</Label>
                        <Input placeholder="Building No, Street Name, Area, City, State, Country, Zip" value={quickChurch.address_line1} onChange={(e) => setQuickChurch({ ...quickChurch, address_line1: e.target.value })} className={inputStyle} />
                     </div>
                     <div className="space-y-2 relative">
                        <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-400">City *</Label>
                        <div className="relative">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                           <Input 
                              placeholder="Enter city or pincode" 
                              value={quickChurch.city} 
                              onChange={(e) => {
                                 setQuickChurch({ ...quickChurch, city: e.target.value });
                                 handleQuickCitySearch(e.target.value);
                              }} 
                              className={cn(inputStyle, "pl-10")} 
                           />
                           {quickCityLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-[#6c1cff] border-t-transparent rounded-full animate-spin" />}
                        </div>
                        
                        {quickCitySuggestions.length > 0 && (
                           <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-[110] overflow-hidden">
                              {quickCitySuggestions.map((s, idx) => (
                                 <button
                                    key={idx}
                                    onClick={() => handleQuickCitySelect(s)}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-2 border-b border-gray-50 last:border-none"
                                 >
                                    <MapPin className="h-4 w-4 text-[#6c1cff] mt-0.5" />
                                    <div className="min-w-0">
                                       <p className="text-[13px] font-semibold text-gray-800 truncate">{s.text}</p>
                                       <p className="text-[11px] text-gray-500 truncate">{s.place_name}</p>
                                    </div>
                                 </button>
                              ))}
                           </div>
                        )}
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-400">How are you related to this listing? (Optional)</Label>
                        <Input placeholder="e.g. Lead Pastor, Admin, Founder..." value={quickChurch.relationship_to_listing} onChange={(e) => setQuickChurch({ ...quickChurch, relationship_to_listing: e.target.value })} className={inputStyle} />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-400">Denomination *</Label>
                     <Select value={quickChurch.denomination} onValueChange={(val) => setQuickChurch({ ...quickChurch, denomination: val })}>
                        <SelectTrigger className={selectStyle}>
                           <SelectValue placeholder="Select Denomination" />
                        </SelectTrigger>
                        <SelectContent className="z-[120]">
                           {taxonomies.denomination?.map(d => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <DialogFooter className="pt-10 pb-6 flex gap-4">
                  <Button variant="ghost" className="flex-1 h-12 rounded-xl text-[12px] font-bold tracking-widest uppercase text-gray-400" onClick={() => setShowQuickChurchDialog(false)}>Cancel</Button>
                  <Button onClick={handleQuickChurchCreate} disabled={quickChurchLoading} className="flex-1 h-12 rounded-xl bg-[#6c1cff] hover:bg-[#5b17d6] text-white font-bold text-[12px] tracking-widest uppercase shadow-lg shadow-purple-100">
                     {quickChurchLoading ? 'Creating...' : 'Create & Link'}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

            <Footer />
      </div>
   );
};

export default PastorCreationFlow2;
