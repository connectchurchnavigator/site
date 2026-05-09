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
import { churchAPI, taxonomyAPI, pastorAPI, utilityAPI } from '../../lib/api';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList
} from "../../components/ui/command";
import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
} from "../../components/ui/tooltip";
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
import { cn, formatTimeTo12h } from "../../lib/utils";
import {
   ChevronsUpDown,
   Search,
   ChevronLeft,
   ChevronRight,
   Check,
   X,
   MapPin,
   Sparkles,
   Map,
   Church,
   Globe,
   Phone,
   Mail,
   Clock,
   Plus,
   Trash2,
   Info,
   Camera,
   Image as ImageIcon,
   Video,
   AlertCircle,
   HelpCircle,
   Facebook,
   Instagram,
   Youtube,
   Twitter,
   DollarSign,
   Users,
   Eye,
   EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import FileUpload from '../../components/FileUpload';
import MapGL, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CitySelect } from '../../components/CitySelect';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

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

const STEPS = [
   { id: 1, name: 'Profile', description: 'Essential information' },
   { id: 2, name: 'Service Hours', description: 'Service timings' },
   { id: 3, name: 'Details', description: 'Media & narrative' },
];

const FACILITIES_LIST = [
   'Accessibility Ramps / Elevators',
   'Auditorium',
   'Baptistry / Baptism Pool',
   'Bible Study Rooms',
   'Chapel',
   "Children's Playground",
   'Church Café / Coffee Shop',
   'Church Office Building',
   'Conference Room / Boardroom',
   'Counseling Center',
   'Disaster Relief Center',
   'Food Pantry',
   'Free WiFi',
   'Funeral / Memorial Service Facilities',
   'Fellowship Hall',
   'Guest Housing / Missionary Housing',
   'Handicapped Parking',
   'Health Care',
   'Hearing Assistance System',
   'Kids Room / Kids Zone',
   'Library / Resource Center',
   'Live Stream / Online Service Support',
   'Live Streaming Equipment',
   'Main Sanctuary',
   'Mission Support Office',
   'Nursery / Crèche',
   'Parking',
   "Parsonage / Pastor's Residence",
   'Prayer Room',
   'Projectors / Screens',
   'Recording Studio',
   'Restrooms',
   'Security',
   'Sound Booth / Audio-Visual Room',
   'Stage / Lighting System',
   'Sunday School Classrooms',
   'Transportation',
   'Translation / Interpretation System',
   'Wheelchair Accessible',
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

// --- Internal Helper Components Moved Outside to Prevent Focus Loss ---

const GMBRow = ({ label, children, className, hint, error }) => (
   <div className={cn("py-2 flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
         <label className={cn("text-[16px] font-semibold tracking-tight transition-colors", error ? "text-red-500" : "text-gray-800")}>
            {label} {error && <span className="ml-1 text-red-500 animate-pulse">!</span>}
         </label>
         {hint && <span className="text-[11px] text-gray-400 font-normal opacity-80">{hint}</span>}
      </div>
      <div className={cn("flex-1 transition-all", error && "ring-2 ring-red-100 rounded-xl")}>
         {children}
      </div>
   </div>
);

const TimePicker = ({ value, onChange, isMandatory }) => {
   const safeValue = typeof value === 'string' ? value : '';
   const parts = safeValue.split(/[: ]/);
   const h = parts[0] || "";
   const m = parts[1] || "";
   const p = parts[2] || "";

   const update = (nh, nm, np) => {
      let fH = nh !== undefined ? nh : h;
      let fM = nm !== undefined ? nm : m;
      let fP = np !== undefined ? np : p;

      if (nh && nh !== "" && !fM) {
         fM = '00';
      }

      const val = `${fH}:${fM} ${fP}`.trim();

      if (!fH && !fM && (fP === 'AM' || fP === 'PM') && !safeValue) {
         onChange(`::${fP}`);
      } else {
         onChange(val);
      }
   };

   return (
      <div className="flex items-center gap-0.5 p-0 bg-transparent transition-all px-2 py-1 rounded-md focus-within:bg-gray-100/80 focus-within:ring-2 focus-within:ring-purple-100">
         <select
            value={h}
            onChange={(e) => update(e.target.value, m, p)}
            className="bg-transparent text-[14px] font-medium outline-none cursor-pointer w-[30px] appearance-none focus:text-[#6c1cff]"
         >
            <option value="">HH</option>
            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(n => <option key={n} value={n}>{n}</option>)}
         </select>
         <span className="text-gray-300 pointer-events-none text-[12px]">:</span>
         <select
            value={m}
            onChange={(e) => update(h, e.target.value, p)}
            className="bg-transparent text-[14px] font-medium outline-none cursor-pointer w-[30px] appearance-none text-center focus:text-[#6c1cff]"
         >
            <option value="">MM</option>
            {['00', '15', '30', '45'].map(n => <option key={n} value={n}>{n}</option>)}
         </select>
         <select
            value={p}
            onChange={(e) => update(h, m, e.target.value)}
            className="bg-transparent text-[13px] font-bold outline-none ml-1 cursor-pointer w-[34px] appearance-none uppercase focus:text-[#6c1cff]"
         >
            <option value="">--</option>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
         </select>
      </div>
   );
};

// --- Main Component ---
const ChurchCreationFlow = () => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const { id } = useParams();
   const [currentStep, setCurrentStep] = useState(1);
   const [churchId, setChurchId] = useState(id || null);
   const [taxonomies, setTaxonomies] = useState({});
   const [pastors, setPastors] = useState([]);
   const [churches, setChurches] = useState([]);
   const [loading, setLoading] = useState(false);
   const [showErrors, setShowErrors] = useState(false);
   const [locationMethod, setLocationMethod] = useState('google_link');
   const [showQuickPastorDialog, setShowQuickPastorDialog] = useState(false);
   const [pastorPopoverOpen, setPastorPopoverOpen] = useState(false);
   const [quickPastor, setQuickPastor] = useState({
      name: '', email: '', phone: '', denomination: '', profile_picture: '',
      address_line1: '', google_maps_link: '', latitude: null, longitude: null, timezone: 'UTC',
      relationship_to_listing: ''
   });
   const [quickPastorLoading, setQuickPastorLoading] = useState(false);
   const [quickPastorEmailError, setQuickPastorEmailError] = useState('');
   const [quickPastorViewport, setQuickPastorViewport] = useState({
      latitude: 20.5937,
      longitude: 78.9629,
      zoom: 12
   });
   const [quickPastorSearchSuggestions, setQuickPastorSearchSuggestions] = useState([]);
   const [quickPastorSearchLoading, setQuickPastorSearchLoading] = useState(false);
   const [resolvingMap, setResolvingMap] = useState(false);

   const [formData, setFormData] = useState({
      name: '',
      address_line1: '',
      city: '',
      state: '',
      country: '',
      zip_code: '',
      google_maps_link: '',
      latitude: null,
      longitude: null,
      denomination: '',
      pastor_id: '',
      pastor_name: '',
      logo: '',
      cover_image: '',
      gallery_images: [],
      video_url: '',
      tagline: '',
      description: '',
      worship_styles: [],
      languages: [],
      ministries: [],
      facilities: [],
      main_branch_id: '',
      other_branches: [],
      hidden_branches: [],
      email: '',
      phone: '',
      website: '',
      website_status: 'no_website',
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: '',
      donations_url: '',
      worship_team: { description: '', images: [], video_urls: [''] },
      it_media_team: { description: '', images: [], video_urls: [''] },
      outreach_team: { description: '', images: [], video_urls: [''] },
      services: [{ day: '', start_time: '::AM', end_time: '::AM', event_name: '', ends_next_day: false }],
      timezone: 'UTC',
      relationship_to_listing: ''
   });

   const safeParse = (val, fallback) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? fallback : parsed;
   };

   const [mapViewport, setMapViewport] = useState({
      latitude: safeParse(formData.latitude, 20.5937),
      longitude: safeParse(formData.longitude, 78.9629),
      zoom: 12
   });
   const [searchSuggestions, setSearchSuggestions] = useState([]);
   const [searchLoading, setSearchLoading] = useState(false);

   // Quick Church Creation (Step 3)
   const [showQuickChurchDialog, setShowQuickChurchDialog] = useState(false);
   const [quickChurchLoading, setQuickChurchLoading] = useState(false);
   const [quickChurch, setQuickChurch] = useState({
      name: '', email: '', phone: '', city: '', address_line1: '', state: '', zip_code: '', country: 'USA', logo: '',
      google_maps_link: '', latitude: null, longitude: null, timezone: 'UTC', denomination: '',
      relationship_to_listing: ''
   });
   const [quickChurchViewport, setQuickChurchViewport] = useState({
      latitude: 20.5937,
      longitude: 78.9629,
      zoom: 12
   });
   const [quickSearchSuggestions, setQuickSearchSuggestions] = useState([]);
   const [quickSearchLoading, setQuickSearchLoading] = useState(false);
   const [quickChurchTrigger, setQuickChurchTrigger] = useState(null); // 'main' or 'branch'

   useEffect(() => {
      fetchTaxonomies();
      fetchPastors();
      fetchChurches();
      if (id) fetchExistingChurch();
      else detectUserInitialLocation();
   }, [id]);

   const detectUserInitialLocation = async () => {
      try {
         const response = await fetch('https://ipapi.co/json/');
         const data = await response.json();
         if (data.latitude && data.longitude) {
            setMapViewport(prev => ({
               ...prev,
               latitude: data.latitude,
               longitude: data.longitude,
               zoom: 12
            }));
         }
      } catch (e) {
         console.warn('Initial location detection failed:', e.message);
      }
   };

   useEffect(() => {
      window.scrollTo(0, 0);
   }, [currentStep]);

   const fetchExistingChurch = async () => {
      setLoading(true);
      try {
         const res = await churchAPI.getById(id);
         setChurchId(res.data.id);
         const churchData = res.data;

         // Normalize the church data for the form
         const normalizedChurch = {
            ...churchData,
            services: (churchData.services || []).map(s => ({
               day: s?.day || '',
               start_time: s?.start_time || '::AM',
               end_time: s?.end_time || '::AM',
               event_name: s?.event_name || '',
               ends_next_day: !!s?.ends_next_day
            })),
            worship_team: {
               description: churchData.worship_team?.description || '',
               images: churchData.worship_team?.images || [],
               video_urls: churchData.worship_team?.video_urls || (churchData.worship_team?.video_url ? [churchData.worship_team.video_url] : [''])
            },
            it_media_team: {
               description: churchData.it_media_team?.description || '',
               images: churchData.it_media_team?.images || [],
               video_urls: churchData.it_media_team?.video_urls || (churchData.it_media_team?.video_url ? [churchData.it_media_team.video_url] : [''])
            },
            outreach_team: {
               description: churchData.outreach_team?.description || '',
               images: churchData.outreach_team?.images || [],
               video_urls: churchData.outreach_team?.video_urls || (churchData.outreach_team?.video_url ? [churchData.outreach_team.video_url] : [''])
            }
         };

         // If no services, add one empty entry
         if (normalizedChurch.services.length === 0) {
            normalizedChurch.services = [{ day: '', start_time: '::AM', end_time: '::AM', event_name: '', ends_next_day: false }];
         }

         setFormData(prev => ({
            ...prev,
            ...normalizedChurch,
            gallery_images: churchData.gallery_images || [],
            social_links: churchData.social_links || prev.social_links
         }));

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

   const fetchPastors = async () => {
      try {
         const res = await pastorAPI.getAll({ limit: 100 });
         setPastors(res.data.data || []);
      } catch (error) { }
   };

   const fetchChurches = async () => {
      try {
         const res = await churchAPI.getAll({ limit: 100 });
         setChurches(res.data.data || []);
      } catch (error) { }
   };

   const isFieldEmpty = (field) => {
      if (!showErrors) return false;
      if (field === 'pastor') return !formData.pastor_id;
      return !formData[field]?.toString().trim();
   };

   const isServiceIncomplete = (service) => {
      if (!showErrors) return false;
      // Only check if at least one field is touched
      const isTouched = service.day?.trim() || service.event_name?.trim() || (service.start_time && service.start_time !== '::PM');
      if (!isTouched) return false;
      return !service.day?.trim() || !service.event_name?.trim() || !service.start_time || service.start_time === '::PM';
   };

   const updateFormData = (field, value) => {
      setFormData(prev => {
         const newData = { ...prev, [field]: value };
         // If setting to independent, clear other branches as they are mutually exclusive
         if (field === 'main_branch_id' && value === 'independent') {
            newData.other_branches = [];
         }
         return newData;
      });
   };

   const validateStep = (stepId) => {
      if (stepId === 1) {
         const requiredFields = {
            name: 'Church Name',
            denomination: 'Denomination',
            pastor_name: 'Lead Pastor',
            email: 'Email',
            phone: 'Phone',
            city: 'City',
            address_line1: 'Street Address'
         };

         const missing = Object.entries(requiredFields)
            .filter(([key, label]) => {
               // Special case for pastor: we need either pastor_id (existing) or pastor_name (selection display)
               if (key === 'pastor_name') return !formData.pastor_id;
               return !formData[key]?.toString().trim();
            })
            .map(([_, label]) => label);

         if (missing.length > 0) {
            setShowErrors(true);
            toast.error(`Required: ${missing.join(', ')}`);
            return false;
         }

         setShowErrors(false);

         if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            toast.error('Invalid email format');
            return false;
         }
      }

      if (stepId === 2) {
         // Step 1 check in case of direct navigation
         if (!formData.name || !formData.denomination) {
            toast.error('Identity details missing');
            return false;
         }

         // Filter for services that have at least one field touched
         const activeServices = formData.services.filter(s =>
            s.day?.trim() ||
            s.event_name?.trim() ||
            (s.start_time && s.start_time !== '::PM') ||
            (s.end_time && s.end_time !== '::PM')
         );

         // If anything is touched, ensure required fields (Day, Title, Start Time) are present
         const incompleteIdx = activeServices.findIndex(s =>
            !s.day?.trim() ||
            !s.event_name?.trim() ||
            !s.start_time ||
            s.start_time === '::PM'
         );

         if (incompleteIdx !== -1) {
            toast.error(`Please complete all details for Service #${incompleteIdx + 1} (Day, Title, and Start Time) or clear the row to skip.`);
            return false;
         }

         const seen = new Set();
         const duplicates = [];
         activeServices.forEach((s, idx) => {
            const key = `${s.day}-${s.event_name}-${s.start_time}`.toLowerCase().trim();
            if (seen.has(key)) {
               duplicates.push(s.event_name || `Service ${idx + 1}`);
            }
            seen.add(key);
         });

         if (duplicates.length > 0) {
            toast.error(`Duplicate entries found: ${duplicates.join(', ')}`);
            return false;
         }
      }

      if (stepId === 3) {
         const teams = [
            { id: 'worship_team', name: 'Praise & Worship Team' },
            { id: 'it_media_team', name: 'IT & Media Team' },
            { id: 'outreach_team', name: 'Outreach & Missions' }
         ];

         for (const team of teams) {
            const data = formData[team.id];
            if (!data) continue;

            const hasGallery = data.images && data.images.length > 0;
            const hasVideos = data.video_urls && data.video_urls.some(url => url.trim() !== '');

            if ((hasGallery || hasVideos) && !data.description?.trim()) {
               toast.error(`Team Description is mandatory for ${team.name} if photos or videos are added.`);
               return false;
            }
         }
         return true;
      }

      return true;
   };

   const handleZipCodeChange = async (zip) => {
      updateFormData('zip_code', zip);

      // Debounce logic or at least minimum length to avoid spamming
      if (zip.length < 5) return;

      try {
         const cleanZip = zip.toUpperCase();
         // 1. Try Indian Pincode API if it looks like one (6 numeric digits)
         if (cleanZip.length === 6 && /^\d+$/.test(cleanZip)) {
            const res = await fetch(`https://api.postalpincode.in/pincode/${zip}`);
            const data = await res.json();
            if (data[0].Status === 'Success') {
               const postOffice = data[0].PostOffice[0];
               setFormData(prev => ({
                  ...prev,
                  city: postOffice.District,
                  state: postOffice.State,
                  country: 'India'
               }));
               toast.success(`Located: ${postOffice.District}, ${postOffice.State}`);
               return;
            }
         }

         // 2. Fallback to Global Lookup (OSM Nominatim)
         // Note: We use a slight delay or only on specific lengths for non-Indian codes
         if (zip.length >= 5) {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&format=json&addressdetails=1`);
            const data = await res.json();

            if (data && data.length > 0) {
               const result = data[0].address;
               const city = result.city || result.town || result.village || result.suburb || result.city_district || "";
               const state = result.state || result.region || result.province || "";
               const country = result.country || "";

               if (city || state || country) {
                  setFormData(prev => ({
                     ...prev,
                     city: city || prev.city,
                     state: state || prev.state,
                     country: country || prev.country
                  }));
                  toast.success(`Located: ${city}, ${country}`);
               }
            }
         }
      } catch (e) {
         console.error('Zip code lookup failed', e);
      }
   };

   const handleNext = async () => {
      if (!validateStep(currentStep)) return;

      // Save draft before moving if we have a name
      if (formData.name) {
         setLoading(true);
         try {
            if (churchId) await churchAPI.update(churchId, formData);
            else {
               const res = await churchAPI.create({ ...formData, status: 'draft' });
               setChurchId(res.data.id);
            }
         } catch (e) { console.error('Next save failed', e); }
         setLoading(false);
      }

      if (currentStep < 3) {
         setCurrentStep(currentStep + 1);
         window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
         handlePublish();
      }
   };

   const toggleFacility = (facility) => {
      if (formData.facilities.includes(facility)) {
         updateFormData('facilities', formData.facilities.filter(f => f !== facility));
      } else {
         updateFormData('facilities', [...formData.facilities, facility]);
      }
   };

   const toggleOtherBranch = (branchId) => {
      if (formData.other_branches.includes(branchId)) {
         updateFormData('other_branches', formData.other_branches.filter(b => b !== branchId));
      } else {
         updateFormData('other_branches', [...formData.other_branches, branchId]);
      }
   };

   const toggleMinistry = (ministry) => {
      if (formData.ministries.includes(ministry)) {
         updateFormData('ministries', formData.ministries.filter(m => m !== ministry));
      } else {
         updateFormData('ministries', [...formData.ministries, ministry]);
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

      // If moving forward, validate all steps in between
      if (stepId > currentStep) {
         for (let s = currentStep; s < stepId; s++) {
            if (!validateStep(s)) return;
         }
      }

      // Save draft if possible
      if (formData.name) {
         setLoading(true);
         try {
            if (churchId) await churchAPI.update(churchId, formData);
            else {
               const res = await churchAPI.create({ ...formData, status: 'draft' });
               setChurchId(res.data.id);
            }
         } catch (e) { console.error('Step click save failed', e); }
         setLoading(false);
      }

      setCurrentStep(stepId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
   };

   const handleSaveDraft = async () => {
      if (!formData.name) return toast.error('Name required to save draft');
      setLoading(true);
      try {
         const cleanedServices = (formData.services || []).filter(s =>
            s.day?.trim() ||
            s.event_name?.trim() ||
            (s.start_time && s.start_time !== '::PM')
         );

         const cleanedData = {
            ...formData,
            services: cleanedServices
         };

         if (churchId) await churchAPI.update(churchId, cleanedData);
         else {
            const res = await churchAPI.create({ ...cleanedData, status: 'draft' });
            setChurchId(res.data.id);
         }
         toast.success('Draft Saved');
      } catch (error) {
         const errorMsg = error.response?.data?.detail;
         toast.error(typeof errorMsg === 'string' ? errorMsg : 'Save failed - check all required fields');
      } finally {
         setLoading(false);
      }
   };

   const handlePublish = async () => {
      // Final comprehensive validation
      if (!validateStep(1)) return;
      if (!validateStep(2)) return;
      if (!validateStep(3)) return;

      setLoading(true);
      try {
         // Clean up coordinates and services
         const cleanedServices = (formData.services || []).filter(s =>
            s.day?.trim() ||
            s.event_name?.trim() ||
            (s.start_time && s.start_time !== '::PM')
         );

         const cleanedData = {
            ...formData,
            latitude: formData.latitude === '' ? null : formData.latitude,
            longitude: formData.longitude === '' ? null : formData.longitude,
            services: cleanedServices,
            status: 'published'
         };

         if (churchId) await churchAPI.update(churchId, cleanedData);
         else await churchAPI.create(cleanedData);
         toast.success('Published Successfully');
         navigate('/dashboard/my-listings');
      } catch (error) {
         const errorMsg = error.response?.data?.detail;
         if (Array.isArray(errorMsg)) {
            // Extract messages from Pydantic validation errors
            toast.error(errorMsg.map(err => err.msg).join(', ') || 'Publish failed');
         } else {
            toast.error(typeof errorMsg === 'string' ? errorMsg : 'Publish failed');
         }
      } finally {
         setLoading(false);
      }
   };
   const handleQuickPastorCreate = async () => {
      setQuickPastorEmailError('');

      if (!quickPastor.name || !quickPastor.email || !quickPastor.phone || !quickPastor.denomination || !quickPastor.city) {
         toast.error('Please fill in required fields (Name, Email, Phone, Denomination, City)');
         if (!quickPastor.email) setQuickPastorEmailError('Email is required');
         return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(quickPastor.email)) {
         setQuickPastorEmailError('Please enter a valid email address');
         return;
      }

      setQuickPastorLoading(true);
      try {
         const res = await pastorAPI.create({
            ...quickPastor,
            status: 'published'
         });

         const newPastor = res.data;
         updateFormData('pastor_id', newPastor.id);
         updateFormData('pastor_name', newPastor.name);

         // Refresh list
         fetchPastors();

         setShowQuickPastorDialog(false);
         setQuickPastor({
            name: '', email: '', phone: '', denomination: '', profile_picture: '',
            address_line1: '', google_maps_link: '', latitude: null, longitude: null, timezone: 'UTC',
            relationship_to_listing: ''
         });
         setQuickPastorEmailError('');
         toast.success('Pastor created and linked successfully!');
      } catch (error) {
         const errorMsg = error.response?.data?.detail;
         if (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('email')) {
            setQuickPastorEmailError(errorMsg);
         } else if (Array.isArray(errorMsg)) {
            const emailErr = errorMsg.find(err => (err.loc || []).includes('email'));
            if (emailErr) {
               setQuickPastorEmailError(emailErr.msg);
            } else {
               toast.error('Failed to create pastor');
            }
         } else {
            toast.error('Failed to create pastor');
         }
      } finally {
         setQuickPastorLoading(false);
      }
   };

   const handleQuickChurchCreate = async () => {
      if (!quickChurch.name || !quickChurch.email || !quickChurch.phone || !quickChurch.denomination || !quickChurch.city) {
         toast.error('Please fill in required fields (Name, Email, Phone, Denomination, City)');
         return;
      }

      setQuickChurchLoading(true);
      try {
         const res = await churchAPI.create({ ...quickChurch, status: 'published' });
         toast.success('Church profile created!');
         setChurches(prev => [...prev, res.data]);

         if (quickChurchTrigger === 'main') {
            updateFormData('main_branch_id', res.data.id);
         } else if (quickChurchTrigger === 'branch') {
            const currentBranches = formData.other_branches || [];
            updateFormData('other_branches', [...currentBranches, res.data.id]);
         }

         setShowQuickChurchDialog(false);
         setQuickChurch({
            name: '', email: '', phone: '', city: '', address_line1: '', state: '', zip_code: '', country: 'USA', logo: '',
            google_maps_link: '', latitude: null, longitude: null, timezone: 'UTC', denomination: ''
         });
      } catch (e) {
         toast.error('Failed to create church listing');
      } finally {
         setQuickChurchLoading(false);
      }
   };

   const handleQuickZipChange = async (zip) => {
      const alphaNumericZip = zip.replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();
      setQuickChurch(prev => ({ ...prev, zip_code: alphaNumericZip }));

      if (alphaNumericZip.length >= 5 && /^\d+$/.test(alphaNumericZip)) {
         try {
            // Priority for US lookups for simplicity, but can expand
            const res = await fetch(`https://api.zippopotam.us/us/${alphaNumericZip}`);
            if (res.ok) {
               const data = await res.json();
               const place = data.places[0];
               setQuickChurch(prev => ({
                  ...prev,
                  city: place['place name'],
                  state: place['state'],
               }));
            }
         } catch (e) {
            console.error('Zip lookup failed');
         }
      }
   };

   const handleQuickGoogleMapsLinkChange = async (url) => {
      setQuickChurch(prev => ({ ...prev, google_maps_link: url }));

      let coords = parseGoogleMapsUrl(url);

      if (!coords && url && url.startsWith('http')) {
         setQuickSearchLoading(true);
         try {
            const res = await utilityAPI.resolveMap(url);
            if (res.data.latitude && res.data.longitude) {
               coords = { lat: res.data.latitude, lng: res.data.longitude };
               if (res.data.timezone) {
                  setQuickChurch(prev => ({ ...prev, timezone: res.data.timezone }));
               }
            }
         } catch (e) { console.error('Map resolution failed', e); }
         setQuickSearchLoading(false);
      }

      if (coords) {
         setQuickChurch(prev => ({ ...prev, latitude: coords.lat.toString(), longitude: coords.lng.toString() }));
         setQuickChurchViewport(prev => ({ ...prev, latitude: coords.lat, longitude: coords.lng, zoom: 15 }));
         detectTimezone(coords.lat, coords.lng).then(tz => {
            if (tz) setQuickChurch(prev => ({ ...prev, timezone: tz }));
         });
      } else if (url && url.length > 3 && !url.startsWith('http')) {
         setQuickSearchLoading(true);
         try {
            const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(url)}.json?access_token=${MAPBOX_TOKEN}&limit=5`);
            const data = await res.json();
            setQuickSearchSuggestions(data.features || []);
         } catch (e) { }
         setQuickSearchLoading(false);
      } else {
         setQuickSearchSuggestions([]);
      }
   };

   const handleQuickMarkerDrag = (evt) => {
      const { lng, lat } = evt.lngLat;
      setQuickChurch(prev => ({
         ...prev,
         latitude: lat.toString(),
         longitude: lng.toString(),
         google_maps_link: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      }));
      detectQuickCity(lat, lng);
      detectQuickCity(lat, lng);
      detectTimezone(lat, lng).then(tz => {
         if (tz) setQuickChurch(prev => ({ ...prev, timezone: tz }));
      });
   };

   const handleQuickSuggestionSelect = (suggestion) => {
      const [lng, lat] = suggestion.center;
      setQuickChurch(prev => ({
         ...prev,
         address_line1: suggestion.text,
         latitude: lat.toString(),
         longitude: lng.toString(),
         google_maps_link: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      }));

      // Extract city/state if available
      const context = suggestion.context || [];
      const city = context.find(c => c.id.includes('place'))?.text;
      const state = context.find(c => c.id.includes('region'))?.text;
      const country = context.find(c => c.id.includes('country'))?.text;
      const zip = context.find(c => c.id.includes('postcode'))?.text;

      setQuickChurch(prev => ({
         ...prev,
         city: city || prev.city,
         state: state || prev.state,
         country: country || prev.country,
         zip_code: zip || prev.zip_code
      }));

      setQuickChurchViewport(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 15 }));
      setQuickSearchSuggestions([]);
      detectCity(lat, lng);
      detectCity(lat, lng);
      detectTimezone(lat, lng).then(tz => {
         if (tz) setQuickChurch(prev => ({ ...prev, timezone: tz }));
      });
   };

   // --- Quick Pastor Map Handlers ---
   const handleQuickPastorGoogleMapsLinkChange = async (url) => {
      setQuickPastor(prev => ({ ...prev, google_maps_link: url }));

      let coords = parseGoogleMapsUrl(url);

      if (!coords && url && url.startsWith('http')) {
         setQuickPastorSearchLoading(true);
         try {
            const res = await utilityAPI.resolveMap(url);
            if (res.data.latitude && res.data.longitude) {
               coords = { lat: res.data.latitude, lng: res.data.longitude };
               if (res.data.timezone) {
                  setQuickPastor(prev => ({ ...prev, timezone: res.data.timezone }));
               }
            }
         } catch (e) { console.error('Map resolution failed', e); }
         setQuickPastorSearchLoading(false);
      }

      if (coords) {
         setQuickPastor(prev => ({ ...prev, latitude: coords.lat.toString(), longitude: coords.lng.toString() }));
         setQuickPastorViewport(prev => ({ ...prev, latitude: coords.lat, longitude: coords.lng, zoom: 15 }));
         detectTimezone(coords.lat, coords.lng).then(tz => {
            if (tz) setQuickPastor(prev => ({ ...prev, timezone: tz }));
         });
      } else if (url && url.length > 3 && !url.startsWith('http')) {
         setQuickPastorSearchLoading(true);
         try {
            const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(url)}.json?access_token=${MAPBOX_TOKEN}&limit=5`);
            const data = await res.json();
            setQuickPastorSearchSuggestions(data.features || []);
         } catch (e) { }
         setQuickPastorSearchLoading(false);
      } else {
         setQuickPastorSearchSuggestions([]);
      }
   };

   const handleQuickPastorMarkerDrag = (evt) => {
      const { lng, lat } = evt.lngLat;
      setQuickPastor(prev => ({
         ...prev,
         latitude: lat.toString(),
         longitude: lng.toString(),
         google_maps_link: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      }));
      detectCity(lat, lng);
      detectTimezone(lat, lng).then(tz => {
         if (tz) setQuickPastor(prev => ({ ...prev, timezone: tz }));
      });
   };

   const handleQuickPastorSuggestionSelect = (s) => {
      const [lng, lat] = s.center;
      setQuickPastor(prev => ({
         ...prev,
         latitude: lat.toString(),
         longitude: lng.toString(),
         address_line1: s.place_name,
         google_maps_link: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      }));
      setQuickPastorViewport(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 15 }));
      setQuickPastorSearchSuggestions([]);
      detectCity(lat, lng);
      detectTimezone(lat, lng).then(tz => {
         if (tz) setQuickPastor(prev => ({ ...prev, timezone: tz }));
      });
   };

           const detectQuickCity = async (lat, lng) => {
       if (!lat || !lng || !MAPBOX_TOKEN) return;
       try {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=place`);
          const data = await res.json();
          const cityName = data.features?.[0]?.text;
          if (cityName) {
             setQuickPastor(prev => ({ ...prev, city: cityName }));
          }
       } catch (e) {
          console.warn('Quick City detection failed:', e.message);
       }
    };

    const detectCity = async (lat, lng) => {
       if (!lat || !lng || !MAPBOX_TOKEN) return;
       try {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=place`);
          const data = await res.json();
          const cityName = data.features?.[0]?.text;
          if (cityName) {
             updateFormData('city', cityName);
          }
       } catch (e) {
          console.warn('City detection failed:', e.message);
       }
    };

    const detectTimezone = async (lat, lng) => {
      if (!lat || !lng) return null;
      try {
         const res = await utilityAPI.getTimezone(lat, lng);
         if (res.data.timezone) {
            updateFormData('timezone', res.data.timezone);
            return res.data.timezone;
         }
      } catch (e) {
         console.warn('Timezone detection failed:', e.message);
      }
      return null;
   };

   // Parse Google Maps URL to extract coordinates
   const parseGoogleMapsUrl = (url) => {
      if (!url) return null;
      const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
      const dPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
      const qPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
      const placePattern = /place\/[^@]*@(-?\d+\.?\d*),(-?\d+\.?\d*)/;

      let match = url.match(atPattern) || url.match(dPattern) || url.match(qPattern) || url.match(placePattern);
      if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      return null;
   };

   const handleGoogleMapsLinkChange = async (url) => {
      updateFormData('google_maps_link', url);

      // 1. Try local parsing first (for full URLs)
      let coords = parseGoogleMapsUrl(url);

      // 2. If no coords and it looks like a URL, try backend resolution (for short links)
      if (!coords && url && url.startsWith('http')) {
         setResolvingMap(true);
         const loadingToast = toast.loading('Expanding Maps link...');
         try {
            const res = await utilityAPI.resolveMap(url);
            if (res.data.latitude && res.data.longitude) {
               coords = { lat: res.data.latitude, lng: res.data.longitude };
               toast.success('Link expanded successfully', { id: loadingToast });
            } else {
               toast.error('Could not extract coordinates from this link', { id: loadingToast });
            }
         } catch (e) {
            console.error('Map resolution failed', e);
            toast.error('Failed to resolve Maps link', { id: loadingToast });
         } finally {
            setResolvingMap(false);
         }
      }

      if (coords) {
         updateFormData('latitude', coords.lat.toString());
         updateFormData('longitude', coords.lng.toString());
         detectTimezone(coords.lat, coords.lng);
         setMapViewport(prev => ({ ...prev, latitude: coords.lat, longitude: coords.lng, zoom: 15 }));

         if (!resolvingMap) toast.info('Coordinates extracted.');
      } else if (url && !url.includes('http')) {
         toast.success('Wait, searching...');
         handleMapboxSearch(url);
      }
   };

   const handleMapboxSearch = async (query) => {
      if (!query || query.length < 3) return;
      setSearchLoading(true);
      try {
         const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5`);
         const data = await res.json();
         setSearchSuggestions(data.features || []);
      } catch (e) {
         console.error('Search failed', e);
      } finally {
         setSearchLoading(false);
      }
   };

   const handleSuggestionSelect = (suggestion) => {
      const [lng, lat] = suggestion.center;
      const context = suggestion.context || [];

      const city = context.find(c => c.id.startsWith('place'))?.text || "";
      const state = context.find(c => c.id.startsWith('region'))?.text || "";
      const country = context.find(c => c.id.startsWith('country'))?.text || "";
      const zip = context.find(c => c.id.startsWith('postcode'))?.text || suggestion.text.includes(' ') ? "" : suggestion.text; // Use text if it looks like a zip

      // If it's a postcode search, the suggestion.text itself is the zip
      const finalZip = zip || (suggestion.id.startsWith('postcode') ? suggestion.text : "");

      setFormData(prev => ({
         ...prev,
         latitude: lat.toString(),
         longitude: lng.toString(),
         google_maps_link: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
         timezone: prev.timezone
      }));

      detectTimezone(lat, lng);
            detectCity(lat, lng);
      detectCity(lat, lng);
      detectCity(lat, lng);
      setMapViewport(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 15 }));
      setSearchSuggestions([]);
      toast.success('Location updated');
   };

   const handleMarkerDrag = async (e) => {
      const { lng, lat } = e.lngLat;
      updateFormData('latitude', lat.toString());
      updateFormData('longitude', lng.toString());
      updateFormData('google_maps_link', `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
      detectTimezone(lat, lng);
            detectCity(lat, lng);
      detectCity(lat, lng);
      detectCity(lat, lng);
   };

   const addService = () => {
      setFormData(prev => ({
         ...prev,
         services: [...prev.services, { day: 'Sunday', start_time: '::PM', end_time: '::PM', event_name: '', ends_next_day: false }]
      }));
   };

   const inputStyle = "h-[45px] rounded-none border-0 border-b-2 border-gray-100 bg-transparent px-0 focus-visible:ring-0 focus:border-[#6c1cff] text-[16px] font-normal transition-all placeholder:text-gray-300 shadow-none";
   const selectStyle = "h-[45px] rounded-none border-0 border-b-2 border-gray-100 bg-transparent px-0 focus:ring-0 focus:border-[#6c1cff] text-[15px] font-normal transition-all shadow-none";

   return (
      <div className="min-h-screen bg-[#f8f9fa] selection:bg-[#6c1cff]/10 text-[#3c4043] font-sans flex flex-col">
         <NavbarPremium variant="light" fixed={false} />

         <main className="flex-1 flex justify-center p-4 md:p-8 lg:p-12">
            <div className="max-w-[1240px] w-full flex flex-col md:flex-row gap-12">

               {/* Left Side: Branding & Context (Hidden on Mobile) */}
               <div className="hidden md:flex md:w-[32%] flex-col justify-between sticky top-[100px] h-fit">
                  <div className="space-y-12 animate-in fade-in slide-in-from-left-8 duration-700">
                     <div className="space-y-8">
                        <div className="w-16 h-16 bg-[#6c1cff]/5 rounded-full flex items-center justify-center">
                           <Church className="h-8 w-8 text-[#6c1cff]" />
                        </div>
                        <div className="space-y-4">
                           <h1 className="text-[40px] font-extrabold text-[#202124] tracking-tight leading-[1.1]">
                              Register your <br />
                              <span className="text-[#6c1cff]">Church Community</span>
                           </h1>
                           <p className="text-[15px] leading-relaxed text-[#5f6368] max-w-[320px]">
                              Create a comprehensive digital identity. Share your mission, service timings, and connect with seekers in your city.
                           </p>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="space-y-5">
                           {[
                              { icon: Clock, text: "Showcase Service Timings" },
                              { icon: MapPin, text: "List Multiple Branches" },
                              { icon: Map, text: "Precise Map Integration" }
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

                  {/* Sticky Progress Header inside the form container */}
                  <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-10 py-6 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        {STEPS.map((step, idx) => (
                           <div
                              key={step.id}
                              onClick={() => handleStepClick(step.id)}
                              className="flex items-center gap-3 cursor-pointer group"
                           >
                              <div className={cn(
                                 "w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-semibold transition-all",
                                 currentStep === step.id ? "bg-[#6c1cff] text-white shadow-lg shadow-purple-200" :
                                    currentStep > step.id ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400",
                                 "group-hover:scale-110 active:scale-95 transition-transform"
                              )}>
                                 {currentStep > step.id ? "✓" : step.id}
                              </div>
                              <span className={cn(
                                 "text-[14px] font-semibold tracking-wide hidden lg:block transition-colors",
                                 currentStep === step.id ? "text-[#6c1cff]" : "text-gray-400 group-hover:text-gray-600"
                              )}>
                                 {step.name}
                              </span>
                              {idx < STEPS.length - 1 && <div className="w-4 h-[2px] bg-gray-100 mx-1" />}
                           </div>
                        ))}
                     </div>
                     <div className="bg-gray-50 px-6 py-2.5 rounded-full">
                        <span className="text-[11px] font-semibold tracking-wide text-gray-500 whitespace-nowrap">Step {currentStep} &nbsp; of &nbsp; 3</span>
                     </div>
                  </div>

                  {/* Form Content Area */}
                  <div className="flex-1 py-8 px-8">
                     <div className="flex-1 min-w-0 max-w-5xl space-y-2 animate-in fade-in slide-in-from-right-8 duration-500">

                        {currentStep === 1 && (
                           <div className="space-y-2">
                              <GMBRow label="Church Name *" error={isFieldEmpty('name')}>
                                 <Input value={formData.name} onChange={(e) => updateFormData('name', e.target.value)} placeholder="e.g. Grace Community" className={inputStyle} />
                              </GMBRow>

                              <div className="grid grid-cols-2 gap-x-8">
                                 <GMBRow label="Denomination *" error={isFieldEmpty('denomination')}>
                                    <Select value={formData.denomination} onValueChange={(v) => updateFormData('denomination', v)}>
                                       <SelectTrigger className={selectStyle}><SelectValue placeholder="Select denomination" /></SelectTrigger>
                                       <SelectContent position="popper" side="bottom" sideOffset={8} avoidCollisions={false} className="z-[100] max-h-[300px]">
                                          {(taxonomies.denomination || []).sort().map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                       </SelectContent>
                                    </Select>
                                 </GMBRow>
                                 <GMBRow label="Pastor *" error={isFieldEmpty('pastor')}>
                                    <div className="space-y-3">
                                       <Popover open={pastorPopoverOpen} onOpenChange={setPastorPopoverOpen}>
                                          <PopoverTrigger asChild>
                                             <button
                                                role="combobox"
                                                aria-expanded={pastorPopoverOpen}
                                                className={cn(selectStyle, "w-full flex items-center justify-between text-left hover:bg-gray-50/50")}
                                             >
                                                <span className={formData.pastor_id ? "text-gray-900" : "text-gray-400"}>
                                                   {formData.pastor_name || "Select Lead Pastor"}
                                                </span>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                             </button>
                                          </PopoverTrigger>
                                          <PopoverContent side="bottom" align="start" sideOffset={8} avoidCollisions={false} className="w-[300px] p-0 z-[100] rounded-xl overflow-hidden shadow-2xl border-none">
                                             <Command className="border-none">
                                                <CommandInput placeholder="Search pastors..." className="h-10 text-[14px]" />
                                                <CommandList className="max-h-[300px] border-none custom-scrollbar">
                                                   <CommandEmpty>No pastor found.</CommandEmpty>
                                                   <CommandGroup>
                                                      <CommandItem
                                                         value="not_listed"
                                                         onSelect={() => {
                                                            updateFormData('pastor_id', 'not_listed');
                                                            updateFormData('pastor_name', '');
                                                            setPastorPopoverOpen(false);
                                                         }}
                                                         className="text-[#6c1cff] font-semibold py-3 px-4 flex items-center gap-2"
                                                      >
                                                         <Plus className="h-4 w-4" />
                                                         Not listed yet
                                                      </CommandItem>
                                                      {[...pastors].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map((p) => (
                                                         <CommandItem
                                                            key={p.id}
                                                            value={p.name}
                                                            onSelect={() => {
                                                               updateFormData('pastor_id', p.id);
                                                               updateFormData('pastor_name', p.name);
                                                               setPastorPopoverOpen(false);
                                                            }}
                                                            className="py-3 px-4"
                                                         >
                                                            <Check className={cn("mr-2 h-4 w-4", formData.pastor_id === p.id ? "opacity-100" : "opacity-0")} />
                                                            {p.name}
                                                         </CommandItem>
                                                      ))}
                                                   </CommandGroup>
                                                </CommandList>
                                             </Command>
                                          </PopoverContent>
                                       </Popover>

                                       {formData.pastor_id === 'not_listed' && (
                                          <button
                                             onClick={() => setShowQuickPastorDialog(true)}
                                             className="w-full py-3 bg-[#6c1cff]/5 border border-dashed border-[#6c1cff]/20 rounded-lg text-[#6c1cff] text-[15px] font-semibold hover:bg-[#6c1cff]/10 transition-all flex items-center justify-center gap-2"
                                          >
                                             <Plus className="h-3 w-3" />
                                             Create pastor profile in one click
                                          </button>
                                       )}
                                    </div>
                                 </GMBRow>
                              </div>

                              <div className="grid grid-cols-2 gap-x-8">
                                 <GMBRow label="Email *" error={isFieldEmpty('email')}>
                                    <Input
                                       value={formData.email}
                                       onChange={(e) => updateFormData('email', e.target.value)}
                                       placeholder="contact@yourchurch.com"
                                       className={cn(inputStyle, formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? "border-red-300" : "")}
                                    />
                                 </GMBRow>
                                 <GMBRow label="Phone *" error={isFieldEmpty('phone')}>
                                    <PhoneInputPremium
                                       value={formData.phone}
                                       onChange={(val) => updateFormData('phone', val)}
                                       placeholder="Phone number"
                                    />
                                 </GMBRow>
                              </div>

                              <GMBRow label="Map location">
                                 <div className="space-y-6">
                                    <div className="relative">
                                       <div className="flex gap-4">
                                          <div className="relative flex-1 group">
                                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#6c1cff] transition-colors" />
                                             <Input
                                                value={formData.google_maps_link}
                                                onChange={(e) => handleGoogleMapsLinkChange(e.target.value)}
                                                placeholder="Search address or paste Google Maps URL..."
                                                className={cn(inputStyle, "flex-1 pl-10")}
                                             />
                                          </div>
                                          <Button
                                             onClick={() => handleGoogleMapsLinkChange(formData.google_maps_link)}
                                             variant="outline"
                                             className="h-11 px-6 border-[#6c1cff] text-[#6c1cff] font-medium text-[13px] tracking-wide hover:bg-[#6c1cff]/5 rounded-xl transition-all"
                                          >
                                             {searchLoading ? "..." : "Fetch"}
                                          </Button>
                                       </div>

                                       {/* Search Suggestions Dropdown */}
                                       {searchSuggestions.length > 0 && (
                                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                             {searchSuggestions.map((s, idx) => (
                                                <button
                                                   key={idx}
                                                   onClick={() => handleSuggestionSelect(s)}
                                                   className="w-full px-5 py-3.5 text-left hover:bg-gray-50 flex items-start gap-3 transition-colors border-b border-gray-50 last:border-none"
                                                >
                                                   <MapPin className="h-4 w-4 text-[#6c1cff] mt-0.5" />
                                                   <div>
                                                      <p className="text-[14px] font-semibold text-gray-800">{s.text}</p>
                                                      <p className="text-[12px] text-gray-500 line-clamp-1">{s.place_name}</p>
                                                   </div>
                                                </button>
                                             ))}
                                          </div>
                                       )}
                                    </div>

                                    {/* Mini Map Picker */}
                                    <div className="h-[280px] w-full rounded-2xl overflow-hidden border border-gray-100 shadow-inner relative group">
                                       <MapGL
                                          {...mapViewport}
                                          latitude={safeParse(mapViewport.latitude, 20.5937)}
                                          longitude={safeParse(mapViewport.longitude, 78.9629)}
                                          onMove={evt => setMapViewport(evt.viewState)}
                                          mapStyle="mapbox://styles/mapbox/streets-v12"
                                          mapboxAccessToken={MAPBOX_TOKEN}
                                          style={{ width: '100%', height: '100%' }}
                                       >
                                          <Marker
                                             latitude={safeParse(formData.latitude, mapViewport.latitude)}
                                             longitude={safeParse(formData.longitude, mapViewport.longitude)}
                                             draggable
                                             onDragEnd={handleMarkerDrag}
                                             anchor="bottom"
                                             style={{ zIndex: 1000 }}
                                          >
                                             <div className="cursor-grab active:cursor-grabbing">
                                                <div className="relative group/pin">
                                                   <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#6c1cff] text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover/pin:opacity-100 transition-opacity whitespace-nowrap">
                                                      Drag to adjust
                                                   </div>
                                                   <div className="w-10 h-10 bg-[#6c1cff] rounded-full flex items-center justify-center shadow-xl border-4 border-white transform hover:scale-110 transition-transform">
                                                      <Church size={18} className="text-white" />
                                                   </div>
                                                   <div className="w-1 h-3 bg-[#6c1cff] mx-auto -mt-1 rounded-full shadow-lg"></div>
                                                </div>
                                             </div>
                                          </Marker>
                                          <NavigationControl position="top-right" />
                                          <GeolocateControl
                                             position="top-right"
                                             positionOptions={{ enableHighAccuracy: true }}
                                             trackUserLocation={false}
                                             showUserLocation={false}
                                             style={{ marginRight: 0, marginTop: 40 }}
                                             onGeolocate={async (pos) => {
                                                const { latitude, longitude } = pos.coords;
                                                updateFormData('latitude', latitude.toString());
                                                updateFormData('longitude', longitude.toString());
                                                updateFormData('google_maps_link', `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
                                                detectTimezone(latitude, longitude);
                                                 detectQuickCity(latitude, longitude);
                                                setMapViewport(prev => ({ ...prev, latitude, longitude, zoom: 15 }));
                                                toast.success("Location coordinates updated");
                                             }}
                                          />
                                       </MapGL>

                                       <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                          Interactive Map Picker Active
                                       </div>
                                    </div>

                                    <p className="text-[12px] text-[#5f6368] leading-relaxed">
                                       <span className="font-semibold text-[#6c1cff]">Pro Tip:</span> You can type your church address in the search box above, or simply <span className="text-[#6c1cff] font-medium">drag the purple pin</span> on the map to your exact location.
                                    </p>

                                    <div className="grid grid-cols-2 gap-8">
                                       <div className="space-y-3">
                                          <Label className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">Latitude</Label>
                                          <Input
                                             value={formData.latitude}
                                             onChange={(e) => updateFormData('latitude', e.target.value)}
                                             placeholder="e.g. 17.3850"
                                             className="h-10 bg-white border-gray-200 focus:border-[#6c1cff] focus:ring-0 text-[14px] font-normal rounded-lg transition-all"
                                          />
                                       </div>
                                       <div className="space-y-3">
                                          <Label className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">Longitude</Label>
                                          <Input
                                             value={formData.longitude}
                                             onChange={(e) => updateFormData('longitude', e.target.value)}
                                             placeholder="e.g. 78.4867"
                                             className="h-10 bg-white border-gray-200 focus:border-[#6c1cff] focus:ring-0 text-[14px] font-normal rounded-lg transition-all"
                                          />
                                       </div>
                                    </div>

                                    

                                 </div>
                              </GMBRow>

                              <GMBRow label="Full Address *" error={isFieldEmpty('address_line1')}>
                                 <Input
                                    value={formData.address_line1}
                                    onChange={(e) => updateFormData('address_line1', e.target.value)}
                                    placeholder="Full Address (Building, Street, Area, City, State, Zip)"
                                    className={inputStyle}
                                 />
                              </GMBRow>

                              <GMBRow label="City *" error={isFieldEmpty('city')} hint="The primary city where seekers will search for your church.">
                                 <CitySelect
                                    value={formData.city}
                                    onChange={(cityName, cityData) => {
                                       updateFormData('city', cityName);
                                       if (cityData) {
                                          updateFormData('latitude', cityData.lat.toString());
                                          updateFormData('longitude', cityData.lng.toString());
                                          setMapViewport(prev => ({
                                             ...prev,
                                             latitude: cityData.lat,
                                             longitude: cityData.lng,
                                             zoom: 12
                                          }));
                                       }
                                    }}
                                    placeholder="e.g. Hyderabad, Dallas, etc."
                                    variant="outline"
                                 />
                              </GMBRow>

                              <GMBRow label="Operating Timezone" hint="Auto-detected from location">
                                       <div className="relative group">
                                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#6c1cff] transition-colors z-10" />
                                          <Select value={formData.timezone} onValueChange={(v) => updateFormData('timezone', v)}>
                                             <SelectTrigger className={cn(selectStyle, "pl-10")}>
                                                <SelectValue placeholder="Select timezone" />
                                             </SelectTrigger>
                                             <SelectContent position="popper" side="bottom" className="z-[110] max-h-[300px]">
                                                {/* Common Timezones Subset + Currently Selected */}
                                                {[
                                                   'UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London',
                                                   'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
                                                   'Australia/Sydney', 'Europe/Paris', 'Africa/Lagos', 'Asia/Tokyo',
                                                   formData.timezone // Include detected one if not in list
                                                ].filter((v, i, a) => v && a.indexOf(v) === i).sort().map(tz => (
                                                   <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                                ))}
                                             </SelectContent>
                                          </Select>
                                       </div>
                                    </GMBRow>
                           </div>
                        )}

                        {currentStep === 2 && (
                           <div className="space-y-6">
                              <div className="overflow-hidden rounded-2xl border border-gray-100">
                                 {/* Header */}
                                 <div className="grid grid-cols-[160px_1fr_135px_135px_60px] bg-gray-50/50 border-b border-gray-100 py-3 px-2">
                                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Day</div>
                                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Event / Service Name</div>
                                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Start Time</div>
                                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">End Time</div>
                                    <div></div>
                                 </div>

                                 {/* Table Body */}
                                 <div className="divide-y divide-gray-50">
                                    <TooltipProvider>
                                       {(formData.services || []).map((s, i) => {
                                          const isMandatory = !!s.day;
                                          const isDuplicate = s.day && s.event_name && s.start_time && s.start_time !== '::PM' &&
                                             (formData.services || []).some((other, idx) =>
                                                idx < i &&
                                                other.day === s.day &&
                                                other.event_name?.toLowerCase().trim() === s.event_name?.toLowerCase().trim() &&
                                                other.start_time === s.start_time
                                             );

                                          return (
                                             <div key={i} className={cn(
                                                "grid grid-cols-[160px_1fr_135px_135px_60px] items-center hover:bg-gray-50/20 transition-colors group relative",
                                                isDuplicate && "bg-red-100/60 border-l-[6px] border-l-red-500",
                                                isServiceIncomplete(s) && "bg-red-50 ring-1 ring-red-200"
                                             )}>
                                                {isServiceIncomplete(s) && (
                                                   <div className="absolute -left-2 top-1/2 -translate-y-1/2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg z-10 animate-pulse">!</div>
                                                )}
                                                {/* Day Cell */}
                                                <div className="p-4 border-r border-gray-100">
                                                   <Select value={s.day} onValueChange={(v) => { const n = [...formData.services]; n[i].day = v; updateFormData('services', n); }}>
                                                      <SelectTrigger className="h-9 border-none bg-transparent text-[14px] font-semibold shadow-none focus:ring-2 focus:ring-purple-100 focus:bg-gray-50 [&>svg]:hidden">
                                                         <SelectValue placeholder="Day" />
                                                      </SelectTrigger>
                                                      <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false} className="z-[100] rounded-xl border-none shadow-2xl">
                                                         {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <SelectItem key={d} value={d} className="py-2.5 font-medium">{d}</SelectItem>)}
                                                      </SelectContent>
                                                   </Select>
                                                </div>

                                                {/* Title Cell */}
                                                <div className="p-4 border-r border-gray-100 relative group/title">
                                                   <Input
                                                      placeholder={isMandatory ? "Enter title" : "Service title"}
                                                      value={s.event_name || ''}
                                                      onChange={(e) => { const n = [...formData.services]; n[i].event_name = e.target.value; updateFormData('services', n); }}
                                                      className={cn("h-10 border-none bg-transparent text-[14px] font-medium shadow-none focus-visible:ring-2 focus-visible:ring-purple-100 focus-visible:bg-gray-50 transition-all px-4 rounded-md", isMandatory && !s.event_name ? "bg-red-50/50 placeholder:text-red-300" : "placeholder:text-gray-300", isDuplicate && "text-red-600")}
                                                   />
                                                   {isDuplicate && (
                                                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                         <Tooltip>
                                                            <TooltipTrigger asChild>
                                                               <div className="cursor-help text-red-500 hover:text-red-700 transition-colors">
                                                                  <AlertCircle className="h-4 w-4" />
                                                               </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="bg-red-600 text-white font-normal text-[11px] py-1.5 px-3 rounded-lg shadow-xl border-none">
                                                               <p>Duplicate Entry</p>
                                                            </TooltipContent>
                                                         </Tooltip>
                                                      </div>
                                                   )}
                                                </div>

                                                {/* Start Time Cell */}
                                                <div className="p-4 border-r border-gray-100">
                                                   <TimePicker
                                                      value={s.start_time}
                                                      onChange={(v) => {
                                                         const n = [...formData.services];
                                                         n[i].start_time = v;
                                                         updateFormData('services', n);
                                                      }}
                                                      isMandatory={isMandatory}
                                                   />
                                                </div>

                                                {/* End Time Cell */}
                                                <div className="p-4 border-r border-gray-100 flex justify-center">
                                                   <TimePicker
                                                      value={s.end_time}
                                                      onChange={(v) => { const n = [...formData.services]; n[i].end_time = v; updateFormData('services', n); }}
                                                      isMandatory={isMandatory}
                                                   />
                                                </div>

                                                {/* Actions Cell */}
                                                <div className="flex justify-center">
                                                   <button
                                                      onClick={() => {
                                                         if (i === 0) {
                                                            const n = [...formData.services];
                                                            n[0] = { day: '', start_time: '::PM', end_time: '::PM', event_name: '' };
                                                            updateFormData('services', n);
                                                         } else {
                                                            updateFormData('services', (formData.services || []).filter((_, idx) => idx !== i));
                                                         }
                                                      }}
                                                      className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                                                   >
                                                      <X className="h-4 w-4" />
                                                   </button>
                                                </div>
                                             </div>
                                          );
                                       })}
                                    </TooltipProvider>
                                 </div>
                              </div>

                              <div className="flex justify-center">
                                 <Button
                                    onClick={() => {
                                       setFormData(prev => ({
                                          ...prev,
                                          services: [...(prev.services || []), { day: '', start_time: '::PM', end_time: '::PM', event_name: '' }]
                                       }));
                                    }}
                                    className="h-11 bg-white border-2 border-dashed border-gray-200 text-[#6c1cff] font-medium text-[13px] tracking-wide px-8 rounded-xl hover:bg-gray-50/50 hover:border-[#6c1cff]/30 transition-all flex items-center gap-2"
                                 >
                                    <Plus className="h-4 w-4" />
                                    Add entry
                                 </Button>
                              </div>
                           </div>
                        )}

                        {currentStep === 3 && (
                           <div className="pb-20 text-center">
                              <Accordion
                                 type="single"
                                 collapsible
                                 defaultValue="visual"
                                 className="border-none space-y-4 text-left"
                                 onValueChange={(value) => {
                                    if (value) {
                                       setTimeout(() => {
                                          const element = document.getElementById(`accordion-item-${value}`);
                                          if (element) {
                                             element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                          }
                                       }, 400);
                                    }
                                 }}
                              >

                                 {/* 1. Visual Identity */}
                                 <AccordionItem value="visual" id="accordion-item-visual" className="border-b border-gray-100 px-2 rounded-2xl transition-all">
                                    <AccordionTrigger className="hover:no-underline py-6">
                                       <div className="flex items-center gap-4">
                                          <div className={cn(
                                             "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all border-2",
                                             (formData.logo || formData.cover_image || formData.gallery_images?.length > 0 || formData.video_url) ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-gray-400"
                                          )}>
                                             {(formData.logo || formData.cover_image || formData.gallery_images?.length > 0 || formData.video_url) ? "✓" : "1"}
                                          </div>
                                          <span className="text-[16px] font-semibold text-gray-800 tracking-wide">Visual Identity</span>
                                       </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-8">
                                       <div className="grid grid-cols-1 gap-10 py-1">
                                          <GMBRow label={<>Church Logo (optional)</>}>
                                             <FileUpload category="logo" variant="simple" maxSize={0.5} accept=".jpg,.jpeg,.png,.webp" previewType="thumbnail" value={formData.logo} onChange={(u) => updateFormData('logo', u)} className="h-[120px] bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100" />
                                          </GMBRow>
                                          <GMBRow label={<>Cover Image (optional)</>}>
                                             <FileUpload category="cover" variant="simple" maxSize={1} accept=".jpg,.jpeg,.png,.webp" previewType="thumbnail" value={formData.cover_image} onChange={(u) => updateFormData('cover_image', u)} className="h-[120px] bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100" />
                                          </GMBRow>
                                       </div>
                                       <GMBRow label={<>Gallery Images (optional)</>} className="mt-8 mb-10">
                                          <FileUpload category="gallery" variant="simple" hint="Max 10 photos, 1MB each." accept=".jpg,.jpeg,.png,.webp" multiple={true} maxFiles={10} value={formData.gallery_images} onChange={(urls) => updateFormData('gallery_images', urls)} className="min-h-[140px] bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100" />
                                       </GMBRow>
                                       <GMBRow label="Video URL (YouTube or Vimeo)">
                                          <Input value={formData.video_url} onChange={(e) => updateFormData('video_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." className={inputStyle} />
                                       </GMBRow>
                                    </AccordionContent>
                                 </AccordionItem>

                                 {/* 2. About & Beliefs */}
                                 <AccordionItem value="narrative" id="accordion-item-narrative" className="border-b border-gray-100 px-2 rounded-2xl transition-all">
                                    <AccordionTrigger className="hover:no-underline py-6">
                                       <div className="flex items-center gap-4">
                                          <div className={cn(
                                             "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all border-2",
                                             (formData.tagline || formData.description || formData.languages?.length > 0 || formData.worship_styles?.length > 0) ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-gray-400"
                                          )}>
                                             {(formData.tagline || formData.description || formData.languages?.length > 0 || formData.worship_styles?.length > 0) ? "✓" : "2"}
                                          </div>
                                          <span className="text-[16px] font-semibold text-gray-800 tracking-wide">About & Beliefs</span>
                                       </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-8">
                                       <GMBRow label="Tagline">
                                          <Input value={formData.tagline} onChange={(e) => updateFormData('tagline', e.target.value)} placeholder="A welcoming community for all" className={inputStyle} />
                                       </GMBRow>
                                       <GMBRow label="Mission Narrative">
                                          <Textarea value={formData.description} onChange={(e) => updateFormData('description', e.target.value)} placeholder="Talk about your church, mission, and values..." className="min-h-[140px] rounded-none border-0 border-b-2 border-gray-100 bg-transparent px-0 focus-visible:ring-0 focus:border-[#6c1cff] text-[16px] font-normal transition-all" />
                                       </GMBRow>
                                       <GMBRow label="Languages Spoken">
                                          {formData.languages.length > 0 && (
                                             <div className="flex flex-wrap gap-1.5 mb-3">
                                                {formData.languages.map(l => (
                                                   <Badge key={l} variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none px-3 py-1 text-[12px] font-semibold rounded-full flex items-center gap-1.5">
                                                      {l}
                                                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFormData('languages', formData.languages.filter(x => x !== l))} />
                                                   </Badge>
                                                ))}
                                             </div>
                                          )}
                                          <Popover>
                                             <PopoverTrigger asChild>
                                                <button className={cn(selectStyle, "w-full flex items-center justify-between text-left")}>
                                                   <span className={formData.languages.length > 0 ? "text-gray-900 text-[14px]" : "text-gray-400 text-[14px]"}>
                                                      {formData.languages.length > 0 ? `${formData.languages.length} languages selected` : "Select languages"}
                                                   </span>
                                                   <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                </button>
                                             </PopoverTrigger>
                                             <PopoverContent side="bottom" align="start" avoidCollisions={false} className="w-[300px] p-0 z-[100] rounded-xl overflow-hidden shadow-2xl border-none">
                                                <Command>
                                                   <CommandInput placeholder="Search languages..." />
                                                   <CommandList className="max-h-[300px] custom-scrollbar">
                                                      <CommandEmpty>No language found.</CommandEmpty>
                                                      <CommandGroup>
                                                         {(taxonomies.language || []).map(lang => (
                                                            <CommandItem key={lang} onSelect={() => updateFormData('languages', formData.languages.includes(lang) ? formData.languages.filter(l => l !== lang) : [...formData.languages, lang])} className="py-2.5 px-4 flex items-center justify-between cursor-pointer text-[14px]">
                                                               <span>{lang}</span>
                                                               {formData.languages.includes(lang) && <Check className="h-4 w-4 text-[#6c1cff]" />}
                                                            </CommandItem>
                                                         ))}
                                                      </CommandGroup>
                                                   </CommandList>
                                                </Command>
                                             </PopoverContent>
                                          </Popover>
                                       </GMBRow>
                                       <GMBRow label="Worship Styles">
                                          {formData.worship_styles.length > 0 && (
                                             <div className="flex flex-wrap gap-1.5 mb-3">
                                                {formData.worship_styles.map(s => (
                                                   <Badge key={s} variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none px-3 py-1 text-[12px] font-semibold rounded-full flex items-center gap-1.5">
                                                      {s}
                                                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFormData('worship_styles', formData.worship_styles.filter(x => x !== s))} />
                                                   </Badge>
                                                ))}
                                             </div>
                                          )}
                                          <Popover>
                                             <PopoverTrigger asChild>
                                                <button className={cn(selectStyle, "w-full flex items-center justify-between text-left")}>
                                                   <span className={formData.worship_styles.length > 0 ? "text-gray-900 text-[14px]" : "text-gray-400 text-[14px]"}>
                                                      {formData.worship_styles.length > 0 ? `${formData.worship_styles.length} styles selected` : "Select styles"}
                                                   </span>
                                                   <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                </button>
                                             </PopoverTrigger>
                                             <PopoverContent side="bottom" align="start" avoidCollisions={false} className="w-[300px] p-0 z-[100] rounded-xl overflow-hidden shadow-2xl border-none">
                                                <Command>
                                                   <CommandInput placeholder="Search styles..." />
                                                   <CommandList className="max-h-[300px] custom-scrollbar">
                                                      <CommandEmpty>No style found.</CommandEmpty>
                                                      <CommandGroup>
                                                         {(taxonomies.worship_style || []).map(style => (
                                                            <CommandItem key={style} onSelect={() => updateFormData('worship_styles', formData.worship_styles.includes(style) ? formData.worship_styles.filter(s => s !== style) : [...formData.worship_styles, style])} className="py-2.5 px-4 flex items-center justify-between cursor-pointer text-[14px]">
                                                               <span>{style}</span>
                                                               {formData.worship_styles.includes(style) && <Check className="h-4 w-4 text-[#6c1cff]" />}
                                                            </CommandItem>
                                                         ))}
                                                      </CommandGroup>
                                                   </CommandList>
                                                </Command>
                                             </PopoverContent>
                                          </Popover>
                                       </GMBRow>
                                       <GMBRow label="Ministries">
                                          {formData.ministries.length > 0 && (
                                             <div className="flex flex-wrap gap-1.5 mb-3">
                                                {formData.ministries.map(m => (
                                                   <Badge key={m} variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none px-3 py-1 text-[12px] font-semibold rounded-full flex items-center gap-1.5">
                                                      {m}
                                                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleMinistry(m)} />
                                                   </Badge>
                                                ))}
                                             </div>
                                          )}
                                          <Popover>
                                             <PopoverTrigger asChild>
                                                <button className={cn(selectStyle, "w-full flex items-center justify-between text-left")}>
                                                   <span className={formData.ministries.length > 0 ? "text-gray-900 text-[14px]" : "text-gray-400 text-[14px]"}>
                                                      {formData.ministries.length > 0 ? `${formData.ministries.length} ministries selected` : "Select ministries"}
                                                   </span>
                                                   <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                </button>
                                             </PopoverTrigger>
                                             <PopoverContent side="bottom" align="start" avoidCollisions={false} className="w-[300px] p-0 z-[100] rounded-xl overflow-hidden shadow-2xl border-none">
                                                <Command>
                                                   <CommandInput placeholder="Search ministries..." />
                                                   <CommandList className="max-h-[300px] custom-scrollbar">
                                                      <CommandEmpty>No ministry found.</CommandEmpty>
                                                      <CommandGroup>
                                                         {(taxonomies.ministry || []).map(min => (
                                                            <CommandItem key={min} onSelect={() => toggleMinistry(min)} className="py-2.5 px-4 flex items-center justify-between cursor-pointer text-[14px]">
                                                               <span>{min}</span>
                                                               {formData.ministries.includes(min) && <Check className="h-4 w-4 text-[#6c1cff]" />}
                                                            </CommandItem>
                                                         ))}
                                                      </CommandGroup>
                                                   </CommandList>
                                                </Command>
                                             </PopoverContent>
                                          </Popover>
                                       </GMBRow>
                                       <GMBRow label="Facilities">
                                          {formData.facilities.length > 0 && (
                                             <div className="flex flex-wrap gap-1.5 mb-3 max-h-[120px] overflow-y-auto custom-scrollbar p-1">
                                                {formData.facilities.map(f => (
                                                   <Badge key={f} variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none px-3 py-1 text-[12px] font-semibold rounded-full flex items-center gap-1.5">
                                                      {f}
                                                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFacility(f)} />
                                                   </Badge>
                                                ))}
                                             </div>
                                          )}
                                          <Popover>
                                             <PopoverTrigger asChild>
                                                <button className={cn(selectStyle, "w-full flex items-center justify-between text-left")}>
                                                   <span className={formData.facilities.length > 0 ? "text-gray-900 text-[14px]" : "text-gray-400 text-[14px]"}>
                                                      {formData.facilities.length > 0 ? `${formData.facilities.length} facilities selected` : "Select facilities"}
                                                   </span>
                                                   <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                </button>
                                             </PopoverTrigger>
                                             <PopoverContent side="bottom" align="start" avoidCollisions={false} className="w-[320px] p-0 z-[100] rounded-xl overflow-hidden shadow-2xl border-none">
                                                <Command>
                                                   <CommandInput placeholder="Search facilities..." />
                                                   <CommandList className="max-h-[300px] custom-scrollbar">
                                                      <CommandEmpty>No facility found.</CommandEmpty>
                                                      <CommandGroup>
                                                         {FACILITIES_LIST.map(f => (
                                                            <CommandItem key={f} onSelect={() => toggleFacility(f)} className="py-2.5 px-4 flex items-center justify-between cursor-pointer text-[14px]">
                                                               <span className="text-[14px]">{f}</span>
                                                               {formData.facilities.includes(f) && <Check className="h-4 w-4 text-[#6c1cff]" />}
                                                            </CommandItem>
                                                         ))}
                                                      </CommandGroup>
                                                   </CommandList>
                                                </Command>
                                             </PopoverContent>
                                          </Popover>
                                       </GMBRow>
                                    </AccordionContent>
                                 </AccordionItem>

                                 {/* 3. Church Network */}
                                 <AccordionItem value="network" id="accordion-item-network" className="border-b border-gray-100 px-2 rounded-2xl transition-all">
                                    <AccordionTrigger className="hover:no-underline py-6">
                                       <div className="flex items-center gap-4">
                                          <div className={cn(
                                             "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all border-2",
                                             (formData.main_branch_id || formData.other_branches?.length > 0) ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-gray-400"
                                          )}>
                                             {(formData.main_branch_id || formData.other_branches?.length > 0) ? "✓" : "3"}
                                          </div>
                                          <span className="text-[16px] font-semibold text-gray-800 tracking-wide">Church Network</span>
                                       </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-8">
                                       {/* Network Tree Preview */}
                                       <div className="mb-8 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                                          <div className="flex items-center justify-between mb-6">
                                             <div>
                                                <h4 className="text-[15px] font-bold text-slate-800">Network Preview</h4>
                                                <p className="text-[12px] text-slate-500">How branches will appear on your landing page</p>
                                             </div>
                                             <Badge variant="outline" className="bg-white text-slate-400 border-slate-200 font-medium px-2 py-0.5 text-[10px] uppercase tracking-wider">Live Preview</Badge>
                                          </div>

                                          <div className="space-y-4">
                                             {/* Main Branch Node */}
                                             {(() => {
                                                const mainId = formData.main_branch_id;
                                                const main = churches.find(c => c.id === mainId);
                                                if (!main || mainId === 'none' || mainId === 'independent') return null;
                                                const isHidden = formData.hidden_branches.includes(main.id);
                                                return (
                                                   <div className="relative pl-8">
                                                      <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-slate-200" />
                                                      <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-4 h-[2px] bg-slate-200" />
                                                      <div className={cn("flex items-center justify-between p-3 rounded-xl border transition-all", isHidden ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-slate-200 shadow-sm")}>
                                                         <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[10px]">MAIN</div>
                                                            <div>
                                                               <div className="text-[13px] font-semibold text-slate-700">{main.name}</div>
                                                               <div className="text-[10px] text-slate-400">Main Branch / Parent</div>
                                                            </div>
                                                         </div>
                                                         <button
                                                            type="button"
                                                            onClick={() => updateFormData('hidden_branches', isHidden ? formData.hidden_branches.filter(id => id !== main.id) : [...formData.hidden_branches, main.id])}
                                                            className={cn("p-2 rounded-lg transition-all", isHidden ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:bg-slate-50")}
                                                            title={isHidden ? "Show in listing" : "Hide from listing"}
                                                         >
                                                            {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                         </button>
                                                      </div>
                                                   </div>
                                                );
                                             })()}

                                             {/* Current Church Node */}
                                             <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-50 border border-purple-100 ring-2 ring-purple-100/50">
                                                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white">
                                                   <Sparkles className="h-5 w-5" />
                                                </div>
                                                <div>
                                                   <div className="text-[14px] font-bold text-purple-900">{formData.name || 'Your Church'}</div>
                                                   <div className="text-[11px] text-purple-600 font-medium">Currently Editing</div>
                                                </div>
                                             </div>

                                             {/* Sister/Branch Nodes */}
                                             {(() => {
                                                const others = [];
                                                const seenIds = new Set();
                                                const currentId = churchId;
                                                const churchMainId = formData.main_branch_id;

                                                const isExplicitExcluded = (id) => !id || id === 'independent' || id === 'none';
                                                const findMatch = (idOrSlug) => {
                                                   if (isExplicitExcluded(idOrSlug)) return null;
                                                   return churches.find(c => c.id === idOrSlug || c._id === idOrSlug || c.slug === idOrSlug);
                                                };

                                                const add = (c) => {
                                                   if (!c || (c.id === currentId || c._id === currentId || c.slug === formData.name) || seenIds.has(c.id)) return;
                                                   seenIds.add(c.id);
                                                   others.push(c);
                                                };

                                                // 1. Explicit
                                                formData.other_branches.forEach(bid => add(findMatch(bid)));

                                                // 2. Reciprocal
                                                churches.forEach(c => {
                                                   const cMainId = c.main_branch_id;
                                                   if (!isExplicitExcluded(cMainId) && (cMainId === currentId || cMainId === formData.name)) add(c);
                                                });

                                                // 3. Siblings
                                                const mainObj = findMatch(churchMainId);
                                                if (mainObj) {
                                                   churches.forEach(c => {
                                                      const cMainId = c.main_branch_id;
                                                      if (!isExplicitExcluded(cMainId)) {
                                                         if (cMainId === churchMainId) add(c);
                                                         else {
                                                            const parentOfC = findMatch(cMainId);
                                                            if (parentOfC && (parentOfC.id === mainObj.id || parentOfC.slug === mainObj.slug)) add(c);
                                                         }
                                                      }
                                                   });
                                                }

                                                if (others.length === 0) return (
                                                   <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                                      <div className="text-slate-300 text-[12px] font-medium italic">No linked sister branches yet</div>
                                                   </div>
                                                );

                                                return others.map(s => {
                                                   const isHidden = formData.hidden_branches.includes(s.id);
                                                   return (
                                                      <div key={s.id} className="relative pl-8">
                                                         <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-slate-200" />
                                                         <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-4 h-[2px] bg-slate-200" />
                                                         <div className={cn("flex items-center justify-between p-3 rounded-xl border transition-all", isHidden ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-slate-200 shadow-sm")}>
                                                            <div className="flex items-center gap-3">
                                                               <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-400 font-bold text-[10px]">BRANCH</div>
                                                               <div>
                                                                  <div className="text-[13px] font-semibold text-slate-700">{s.name}</div>
                                                                  <div className="text-[10px] text-slate-400">{s.city}, {s.state}</div>
                                                               </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                               {isHidden && <span className="text-[10px] font-bold text-amber-600 px-2 py-0.5 bg-amber-50 rounded-full mr-1">HIDDEN</span>}
                                                               <button
                                                                  type="button"
                                                                  onClick={() => updateFormData('hidden_branches', isHidden ? formData.hidden_branches.filter(id => id !== s.id) : [...formData.hidden_branches, s.id])}
                                                                  className={cn("p-2 rounded-lg transition-all", isHidden ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:bg-slate-50")}
                                                                  title={isHidden ? "Show in listing" : "Hide from listing"}
                                                               >
                                                                  {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                               </button>
                                                            </div>
                                                         </div>
                                                      </div>
                                                   );
                                                });
                                             })()}
                                          </div>
                                       </div>

                                       <GMBRow label="Main Branch">
                                          <div className="space-y-3">
                                             <Select value={formData.main_branch_id} onValueChange={(v) => updateFormData('main_branch_id', v)}>
                                                <SelectTrigger className={selectStyle}>
                                                   <SelectValue placeholder="Select main church (optional)" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[100] rounded-xl border-none shadow-2xl">
                                                   <SelectItem value="none" className="font-semibold text-[#6c1cff] text-[14px]">This is the main church</SelectItem>
                                                   <SelectItem value="independent" className="text-slate-500 text-[14px]">This is an independent church (No branches)</SelectItem>
                                                   <SelectItem value="not_listed" className="text-gray-500 text-[14px] italic">Not listed? Create profile below</SelectItem>
                                                   {churches.filter(c => c.id !== churchId).map(c => (
                                                      <SelectItem key={c.id} value={c.id} className="text-[14px]">{c.name}</SelectItem>
                                                   ))}
                                                </SelectContent>
                                             </Select>

                                             {formData.main_branch_id === 'not_listed' && (
                                                <button
                                                   type="button"
                                                   onClick={() => { setQuickChurchTrigger('main'); setShowQuickChurchDialog(true); }}
                                                   className="w-full py-3 bg-[#6c1cff]/5 border border-dashed border-[#6c1cff]/20 rounded-lg text-[#6c1cff] text-[14px] font-bold hover:bg-[#6c1cff]/10 transition-all flex items-center justify-center gap-2"
                                                >
                                                   <Plus className="h-3 w-3" />
                                                   Create main church profile in one click
                                                </button>
                                             )}
                                          </div>
                                       </GMBRow>
                                       {formData.main_branch_id !== 'independent' && (
                                          <GMBRow label="Other Branches" className="mb-10">
                                             <div className="space-y-4">
                                                {formData.other_branches.length > 0 && (
                                                   <div className="flex flex-wrap gap-1.5 mb-1.5">
                                                      {formData.other_branches.map(bid => {
                                                         const b = churches.find(x => x.id === bid);
                                                         return (
                                                            <Badge key={bid} variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none px-3 py-1 text-[12px] font-semibold rounded-full flex items-center gap-1.5">
                                                               {b?.name || "Unknown Branch"}
                                                               <X className="h-3 w-3 cursor-pointer" onClick={() => toggleOtherBranch(bid)} />
                                                            </Badge>
                                                         );
                                                      })}
                                                   </div>
                                                )}
                                                <div className="space-y-3">
                                                   <Popover>
                                                      <PopoverTrigger asChild>
                                                         <button className={cn(selectStyle, "w-full flex items-center justify-between text-left")}>
                                                            <span className={formData.other_branches.length > 0 ? "text-gray-900 text-[14px]" : "text-gray-400 text-[14px]"}>
                                                               {formData.other_branches.length > 0 ? `${formData.other_branches.length} branches selected` : "Select branches"}
                                                            </span>
                                                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                         </button>
                                                      </PopoverTrigger>
                                                      <PopoverContent side="bottom" align="start" avoidCollisions={false} className="w-[300px] p-0 z-[100] rounded-xl overflow-hidden shadow-2xl border-none">
                                                         <Command>
                                                            <CommandInput placeholder="Search churches..." />
                                                            <CommandList className="max-h-[300px] custom-scrollbar">
                                                               <CommandEmpty>No church found.</CommandEmpty>
                                                               <CommandGroup>
                                                                  {churches.filter(c => c.id !== churchId).length === 0 ? (
                                                                     <div className="py-6 px-4 text-center text-[13px] text-gray-400">No other listings available</div>
                                                                  ) : (
                                                                     churches.filter(c => c.id !== churchId).map(c => (
                                                                        <CommandItem key={c.id} onSelect={() => toggleOtherBranch(c.id)} className="py-2.5 px-4 flex items-center justify-between cursor-pointer text-[14px]">
                                                                           <span>{c.name}</span>
                                                                           {formData.other_branches.includes(c.id) && <Check className="h-4 w-4 text-[#6c1cff]" />}
                                                                        </CommandItem>
                                                                     ))
                                                                  )}
                                                               </CommandGroup>
                                                            </CommandList>
                                                         </Command>
                                                      </PopoverContent>
                                                   </Popover>

                                                   <button
                                                      type="button"
                                                      onClick={() => { setQuickChurchTrigger('branch'); setShowQuickChurchDialog(true); }}
                                                      className="w-full py-3 bg-[#6c1cff]/5 border border-dashed border-[#6c1cff]/20 rounded-lg text-[#6c1cff] text-[14px] font-bold hover:bg-[#6c1cff]/10 transition-all flex items-center justify-center gap-2"
                                                   >
                                                      <Plus className="h-3 w-3" />
                                                      Add a new branch profile in one click
                                                   </button>
                                                </div>
                                             </div>
                                          </GMBRow>
                                       )}
                                    </AccordionContent>
                                 </AccordionItem>

                                 {/* 4. Online Presence */}
                                 <AccordionItem value="online" id="accordion-item-online" className="border-b border-gray-100 px-2 rounded-2xl transition-all">
                                    <AccordionTrigger className="hover:no-underline py-6">
                                       <div className="flex items-center gap-4">
                                          <div className={cn(
                                             "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all border-2",
                                             (formData.website || formData.facebook || formData.instagram || formData.youtube || formData.twitter || formData.donations_url || formData.website_status !== 'no_website') ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-gray-400"
                                          )}>
                                             {(formData.website || formData.facebook || formData.instagram || formData.youtube || formData.twitter || formData.donations_url || formData.website_status !== 'no_website') ? "✓" : "4"}
                                          </div>
                                          <span className="text-[16px] font-semibold text-gray-800 tracking-wide">Online Presence</span>
                                       </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-8 space-y-4">
                                       <div className="grid grid-cols-2 gap-12 py-2">
                                          <GMBRow label="Website Status">
                                             <Select value={formData.website_status} onValueChange={(v) => updateFormData('website_status', v)}>
                                                <SelectTrigger className={selectStyle}>
                                                   <SelectValue placeholder="Website status" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[100] rounded-xl border-none shadow-2xl">
                                                   <SelectItem value="no_website" className="text-[14px]">No Website</SelectItem>
                                                   <SelectItem value="under_construction" className="text-[14px]">Under Construction</SelectItem>
                                                   <SelectItem value="link" className="text-[14px]">Active Website</SelectItem>
                                                </SelectContent>
                                             </Select>
                                          </GMBRow>
                                          {formData.website_status === 'link' && (
                                             <GMBRow label="Website URL">
                                                <Input value={formData.website} onChange={(e) => updateFormData('website', e.target.value)} placeholder="https://yourchurch.com" className={inputStyle} />
                                             </GMBRow>
                                          )}
                                       </div>
                                       <div className="grid grid-cols-2 gap-x-8">
                                          <GMBRow label="Facebook">
                                             <Input value={formData.facebook} onChange={(e) => updateFormData('facebook', e.target.value)} placeholder="facebook.com/yourchurch" className={inputStyle} />
                                          </GMBRow>
                                          <GMBRow label="Instagram">
                                             <Input value={formData.instagram} onChange={(e) => updateFormData('instagram', e.target.value)} placeholder="instagram.com/yourchurch" className={inputStyle} />
                                          </GMBRow>
                                       </div>
                                       <div className="grid grid-cols-2 gap-x-8">
                                          <GMBRow label="YouTube">
                                             <Input value={formData.youtube} onChange={(e) => updateFormData('youtube', e.target.value)} placeholder="youtube.com/@yourchurch" className={inputStyle} />
                                          </GMBRow>
                                          <GMBRow label="Twitter / X">
                                             <Input value={formData.twitter} onChange={(e) => updateFormData('twitter', e.target.value)} placeholder="twitter.com/yourchurch" className={inputStyle} />
                                          </GMBRow>
                                       </div>
                                       <GMBRow label="Donations URL" className="mb-10">
                                          <Input value={formData.donations_url} onChange={(e) => updateFormData('donations_url', e.target.value)} placeholder="https://yourchurch.com/donate" className={inputStyle} />
                                       </GMBRow>
                                    </AccordionContent>
                                 </AccordionItem>

                                 {/* 5. Ministry Teams */}
                                 <AccordionItem value="teams" id="accordion-item-teams" className="border-none px-2 rounded-2xl transition-all">
                                    <AccordionTrigger className="hover:no-underline py-6">
                                       <div className="flex items-center gap-4">
                                          <div className={cn(
                                             "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all border-2",
                                             (formData.worship_team?.description || formData.it_media_team?.description || formData.outreach_team?.description || formData.worship_team?.video_urls?.some(u => u.trim() !== '') || formData.it_media_team?.video_urls?.some(u => u.trim() !== '') || formData.outreach_team?.video_urls?.some(u => u.trim() !== '')) ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-gray-400"
                                          )}>
                                             {(formData.worship_team?.description || formData.it_media_team?.description || formData.outreach_team?.description || formData.worship_team?.video_urls?.some(u => u.trim() !== '') || formData.it_media_team?.video_urls?.some(u => u.trim() !== '') || formData.outreach_team?.video_urls?.some(u => u.trim() !== '')) ? "✓" : "5"}
                                          </div>
                                          <span className="text-[16px] font-semibold text-gray-800 tracking-wide">Ministry Teams</span>
                                       </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-8 space-y-6">
                                       {/* Worship Team */}
                                       <div className="p-8 bg-gray-50/30 rounded-3xl border border-gray-100 space-y-4">
                                          <div className="flex items-center gap-4 mb-2">
                                             <div className="w-10 h-10 bg-[#6c1cff]/10 rounded-full flex items-center justify-center">
                                                <Users className="h-5 w-5 text-[#6c1cff]" />
                                             </div>
                                             <h4 className="text-base font-semibold text-gray-900">Praise & Worship Team</h4>
                                          </div>
                                          <GMBRow label={`Team Description${(formData.worship_team?.images?.length > 0 || formData.worship_team?.video_urls?.some(u => u.trim() !== '')) ? ' *' : ''}`}>
                                             <Textarea value={formData.worship_team?.description || ''} onChange={(e) => updateFormData('worship_team', { ...(formData.worship_team || {}), description: e.target.value })} placeholder="Describe your worship team..." className="min-h-[100px] border border-gray-200 rounded-xl bg-white px-4 py-3 focus-visible:ring-1 focus-visible:ring-purple-200 text-[15px] transition-all" />
                                          </GMBRow>
                                          <GMBRow label="Team Photos" hint="Max 1MB each">
                                             <FileUpload category="team" accept=".jpg,.jpeg,.png,.webp" multiple={true} value={formData.worship_team?.images || []} onChange={(urls) => updateFormData('worship_team', { ...(formData.worship_team || {}), images: urls })} className="border-dashed" />
                                          </GMBRow>
                                          <GMBRow label="Video Highlights (YouTube)">
                                             <div className="space-y-3">
                                                {(formData.worship_team?.video_urls || ['']).map((url, idx) => (
                                                   <div key={idx} className="flex gap-2 group/vid">
                                                      <div className="relative flex-1">
                                                         <Input
                                                            value={url}
                                                            onChange={(e) => {
                                                               const urls = [...(formData.worship_team?.video_urls || [''])];
                                                               urls[idx] = e.target.value;
                                                               updateFormData('worship_team', { ...(formData.worship_team || {}), video_urls: urls });
                                                            }}
                                                            placeholder="Paste YouTube Link..."
                                                            className={inputStyle}
                                                         />
                                                         {(formData.worship_team?.video_urls?.length > 1) && (
                                                            <button
                                                               type="button"
                                                               onClick={() => {
                                                                  const urls = formData.worship_team.video_urls.filter((_, i) => i !== idx);
                                                                  updateFormData('worship_team', { ...formData.worship_team, video_urls: urls });
                                                               }}
                                                               className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-500 transition-colors"
                                                            >
                                                               <X className="h-4 w-4" />
                                                            </button>
                                                         )}
                                                      </div>
                                                   </div>
                                                ))}
                                                <Button
                                                   type="button"
                                                   variant="outline"
                                                   onClick={() => {
                                                      const urls = [...(formData.worship_team?.video_urls || ['']), ''];
                                                      updateFormData('worship_team', { ...(formData.worship_team || {}), video_urls: urls });
                                                   }}
                                                   className="h-10 w-full border-dashed border-[#6c1cff]/30 text-[#6c1cff] text-[11px] font-bold uppercase tracking-widest hover:bg-[#6c1cff]/5 rounded-xl transition-all"
                                                >
                                                   <Plus className="h-3 w-3 mr-2" /> Add another highlight
                                                </Button>
                                             </div>
                                          </GMBRow>
                                       </div>

                                       {/* IT & Media Team */}
                                       <div className="p-8 bg-gray-50/30 rounded-3xl border border-gray-100 space-y-4">
                                          <div className="flex items-center gap-4 mb-2">
                                             <div className="w-10 h-10 bg-[#6c1cff]/10 rounded-full flex items-center justify-center">
                                                <Video className="h-5 w-5 text-[#6c1cff]" />
                                             </div>
                                             <h4 className="text-base font-semibold text-gray-900">IT & Media Team</h4>
                                          </div>
                                          <GMBRow label={`Team Description${(formData.it_media_team?.images?.length > 0 || formData.it_media_team?.video_urls?.some(u => u.trim() !== '')) ? ' *' : ''}`}>
                                             <Textarea value={formData.it_media_team?.description || ''} onChange={(e) => updateFormData('it_media_team', { ...(formData.it_media_team || {}), description: e.target.value })} placeholder="Describe your media team..." className="min-h-[100px] border border-gray-200 rounded-xl bg-white px-4 py-3 focus-visible:ring-1 focus-visible:ring-purple-200 text-[15px] transition-all" />
                                          </GMBRow>
                                          <GMBRow label="Team Photos" hint="Max 1MB each">
                                             <FileUpload category="team" accept=".jpg,.jpeg,.png,.webp" multiple={true} value={formData.it_media_team?.images || []} onChange={(urls) => updateFormData('it_media_team', { ...(formData.it_media_team || {}), images: urls })} className="border-dashed" />
                                          </GMBRow>
                                          <GMBRow label="Video Highlights (YouTube)">
                                             <div className="space-y-3">
                                                {(formData.it_media_team?.video_urls || ['']).map((url, idx) => (
                                                   <div key={idx} className="flex gap-2 group/vid">
                                                      <div className="relative flex-1">
                                                         <Input
                                                            value={url}
                                                            onChange={(e) => {
                                                               const urls = [...(formData.it_media_team?.video_urls || [''])];
                                                               urls[idx] = e.target.value;
                                                               updateFormData('it_media_team', { ...(formData.it_media_team || {}), video_urls: urls });
                                                            }}
                                                            placeholder="Paste YouTube Link..."
                                                            className={inputStyle}
                                                         />
                                                         {(formData.it_media_team?.video_urls?.length > 1) && (
                                                            <button
                                                               type="button"
                                                               onClick={() => {
                                                                  const urls = formData.it_media_team.video_urls.filter((_, i) => i !== idx);
                                                                  updateFormData('it_media_team', { ...formData.it_media_team, video_urls: urls });
                                                               }}
                                                               className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-500 transition-colors"
                                                            >
                                                               <X className="h-4 w-4" />
                                                            </button>
                                                         )}
                                                      </div>
                                                   </div>
                                                ))}
                                                <Button
                                                   type="button"
                                                   variant="outline"
                                                   onClick={() => {
                                                      const urls = [...(formData.it_media_team?.video_urls || ['']), ''];
                                                      updateFormData('it_media_team', { ...(formData.it_media_team || {}), video_urls: urls });
                                                   }}
                                                   className="h-10 w-full border-dashed border-[#6c1cff]/30 text-[#6c1cff] text-[11px] font-bold uppercase tracking-widest hover:bg-[#6c1cff]/5 rounded-xl transition-all"
                                                >
                                                   <Plus className="h-3 w-3 mr-2" /> Add another highlight
                                                </Button>
                                             </div>
                                          </GMBRow>
                                       </div>

                                       {/* Outreach Team */}
                                       <div className="p-8 bg-gray-50/30 rounded-3xl border border-gray-100 space-y-4">
                                          <div className="flex items-center gap-4 mb-2">
                                             <div className="w-10 h-10 bg-[#6c1cff]/10 rounded-full flex items-center justify-center">
                                                <Globe className="h-5 w-5 text-[#6c1cff]" />
                                             </div>
                                             <h4 className="text-base font-semibold text-gray-900">Outreach Team</h4>
                                          </div>
                                          <GMBRow label={`Team Description${(formData.outreach_team?.images?.length > 0 || formData.outreach_team?.video_urls?.some(u => u.trim() !== '')) ? ' *' : ''}`}>
                                             <Textarea value={formData.outreach_team?.description || ''} onChange={(e) => updateFormData('outreach_team', { ...(formData.outreach_team || {}), description: e.target.value })} placeholder="Describe your outreach initiatives..." className="min-h-[100px] border border-gray-200 rounded-xl bg-white px-4 py-3 focus-visible:ring-1 focus-visible:ring-purple-200 text-[15px] transition-all" />
                                          </GMBRow>
                                          <GMBRow label="Team Photos" hint="Max 1MB each">
                                             <FileUpload category="team" accept=".jpg,.jpeg,.png,.webp" multiple={true} value={formData.outreach_team?.images || []} onChange={(urls) => updateFormData('outreach_team', { ...(formData.outreach_team || {}), images: urls })} className="border-dashed" />
                                          </GMBRow>
                                          <GMBRow label="Video Highlights (YouTube)">
                                             <div className="space-y-3">
                                                {(formData.outreach_team?.video_urls || ['']).map((url, idx) => (
                                                   <div key={idx} className="flex gap-2 group/vid">
                                                      <div className="relative flex-1">
                                                         <Input
                                                            value={url}
                                                            onChange={(e) => {
                                                               const urls = [...(formData.outreach_team?.video_urls || [''])];
                                                               urls[idx] = e.target.value;
                                                               updateFormData('outreach_team', { ...(formData.outreach_team || {}), video_urls: urls });
                                                            }}
                                                            placeholder="Paste YouTube Link..."
                                                            className={inputStyle}
                                                         />
                                                         {(formData.outreach_team?.video_urls?.length > 1) && (
                                                            <button
                                                               type="button"
                                                               onClick={() => {
                                                                  const urls = formData.outreach_team.video_urls.filter((_, i) => i !== idx);
                                                                  updateFormData('outreach_team', { ...formData.outreach_team, video_urls: urls });
                                                               }}
                                                               className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-500 transition-colors"
                                                            >
                                                               <X className="h-4 w-4" />
                                                            </button>
                                                         )}
                                                      </div>
                                                   </div>
                                                ))}
                                                <Button
                                                   type="button"
                                                   variant="outline"
                                                   onClick={() => {
                                                      const urls = [...(formData.outreach_team?.video_urls || ['']), ''];
                                                      updateFormData('outreach_team', { ...(formData.outreach_team || {}), video_urls: urls });
                                                   }}
                                                   className="h-10 w-full border-dashed border-[#6c1cff]/30 text-[#6c1cff] text-[11px] font-bold uppercase tracking-widest hover:bg-[#6c1cff]/5 rounded-xl transition-all"
                                                >
                                                   <Plus className="h-3 w-3 mr-2" /> Add another highlight
                                                </Button>
                                             </div>
                                          </GMBRow>
                                       </div>
                                    </AccordionContent>
                                 </AccordionItem>

                                 {/* 6. Verification */}
                                 <AccordionItem value="verification" id="accordion-item-verification" className="border-none px-2 rounded-2xl transition-all">
                                    <AccordionTrigger className="hover:no-underline py-6">
                                       <div className="flex items-center gap-4">
                                          <div className={cn(
                                             "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all border-2",
                                             formData.relationship_to_listing ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-gray-400"
                                          )}>
                                             {formData.relationship_to_listing ? "✓" : "6"}
                                          </div>
                                          <span className="text-[16px] font-semibold text-gray-800 tracking-wide">Verification</span>
                                       </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-8 space-y-6">
                                       <div className="p-8 bg-gray-50/30 rounded-3xl border border-gray-100 space-y-4">
                                          <div className="flex items-center gap-4 mb-2">
                                             <div className="w-10 h-10 bg-[#6c1cff]/10 rounded-full flex items-center justify-center">
                                                <Check className="h-5 w-5 text-[#6c1cff]" />
                                             </div>
                                             <h4 className="text-base font-semibold text-gray-900">Entity Relationship</h4>
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
                     </div>
                  </div>

                  {/* Sticky Footer UI */}
                  <div className="px-12 py-8 bg-white border-t border-gray-100 flex items-center justify-between">
                     <Button
                        type="button"
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        variant="ghost"
                        className="text-[12px] font-medium text-gray-400 tracking-wide hover:text-[#6c1cff] transition-colors"
                     >
                        Back
                     </Button>
                     <div className="flex gap-4">
                        <Button onClick={handleSaveDraft} variant="ghost" className="text-[12px] font-medium text-[#6c1cff] tracking-wide px-6 hover:bg-purple-50/50">Draft</Button>
                        {currentStep < 3 ? (
                           <Button onClick={handleNext} className="bg-[#6c1cff] text-white font-semibold text-[13px] tracking-wide px-10 h-12 rounded-full shadow-xl shadow-purple-200 hover:scale-105 transition-transform active:scale-95">Continue</Button>
                        ) : (
                           <Button onClick={handlePublish} className="bg-[#6c1cff] text-white font-semibold text-[13px] tracking-wide px-12 h-12 rounded-full shadow-2xl shadow-purple-300 hover:scale-110 transition-transform animate-pulse">Publish</Button>
                        )}
                     </div>
                  </div>

               </div>
            </div>
         </main>

         {/* Quick Pastor Creation Dialog */}
                  <Dialog open={showQuickPastorDialog} onOpenChange={setShowQuickPastorDialog}>
            <DialogContent className="max-w-2xl p-0 border-none rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
               <div className="flex-1 p-10 space-y-10 bg-white overflow-y-auto custom-scrollbar min-h-0">
                  <DialogHeader className="space-y-3">
                     <DialogTitle className="text-3xl font-bold text-slate-900 tracking-tight">Quick Pastor Profile</DialogTitle>
                     <p className="text-[15px] text-slate-500 font-medium leading-relaxed">Complete your leadership profile with location and contact details.</p>
                  </DialogHeader>

                  <div className="space-y-12">
                     <div className="flex justify-center">
                        <div className="space-y-4 w-full">
                           <Label className="text-[12px] font-bold tracking-widest uppercase text-gray-400 block text-left">Profile Picture (Optional)</Label>
                           <FileUpload
                              category="avatar"
                              accept=".jpg,.jpeg,.png,.webp"
                              previewType="thumbnail"
                              value={quickPastor.profile_picture}
                              onChange={(u) => setQuickPastor(prev => ({ ...prev, profile_picture: u }))}
                              className="h-[180px] bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 hover:border-[#6c1cff]/30 transition-all"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <Label className="text-[13px] font-bold text-gray-500 uppercase tracking-widest text-left block">Full Name *</Label>
                           <Input
                              autoFocus
                              name="qp-fullname-unique"
                              autoComplete="new-password"
                              value={quickPastor.name}
                              onChange={(e) => setQuickPastor(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="e.g. John Doe"
                              className="h-12 bg-gray-50/50 border-gray-100 focus:border-[#6c1cff] focus:ring-purple-100 transition-all rounded-xl"
                           />
                        </div>
                        <div className="space-y-3">
                           <Label className="text-[13px] font-bold text-gray-500 uppercase tracking-widest text-left block">Email *</Label>
                           <Input
                              name="qp-email-unique"
                              autoComplete="new-password"
                              type="email"
                              value={quickPastor.email}
                              onChange={(e) => {
                                 setQuickPastor(prev => ({ ...prev, email: e.target.value }));
                                 if (quickPastorEmailError) setQuickPastorEmailError('');
                              }}
                              placeholder="pastor@example.com"
                              className={cn(
                                 "h-12 bg-gray-50/50 border-gray-100 focus:border-[#6c1cff] focus:ring-purple-100 transition-all rounded-xl",
                                 quickPastorEmailError && "border-red-400 bg-red-50/10 focus:ring-red-50"
                              )}
                           />
                           {quickPastorEmailError && (
                              <p className="text-[12px] font-medium text-red-500 mt-1 pl-1 flex items-center gap-1">
                                 <AlertCircle className="h-3 w-3" />
                                 {quickPastorEmailError}
                              </p>
                           )}
                        </div>
                     </div>

                     <div className="space-y-3">
                        <Label className="text-[13px] font-bold text-gray-500 uppercase tracking-widest text-left block">Phone *</Label>
                        <PhoneInputPremium
                           value={quickPastor.phone}
                           onChange={(val) => setQuickPastor(prev => ({ ...prev, phone: val }))}
                           onCountryChange={(code) => {
                              const tz = COUNTRY_TIMEZONE_MAP[code];
                              if (tz) setQuickPastor(prev => ({ ...prev, timezone: tz }));
                           }}
                           placeholder="Phone number"
                        />
                     </div>

                     <div className="space-y-3">
                        <Label className="text-[13px] font-bold text-gray-500 uppercase tracking-widest text-left block">Denomination *</Label>
                        <Select
                           value={quickPastor.denomination}
                           onValueChange={(v) => setQuickPastor(prev => ({ ...prev, denomination: v }))}
                        >
                           <SelectTrigger className={cn(selectStyle, "h-12 bg-gray-50/50 border-gray-100 rounded-xl")}>
                              <SelectValue placeholder="Select denomination" />
                           </SelectTrigger>
                           <SelectContent position="popper" side="bottom" className="z-[130] max-h-[300px] rounded-2xl border-none shadow-2xl">
                              {(taxonomies.denomination || []).sort().map(d => (
                                 <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>

                     <div className="space-y-8 pt-4 border-t border-gray-50">
                        <div className="space-y-4">
                           <Label className="text-[13px] font-bold text-gray-500 uppercase tracking-widest text-left block">Service Location</Label>

                           <div className="space-y-4">
                              <div className="flex gap-4">
                                 <div className="relative flex-1 group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#6c1cff] transition-colors" />
                                    <Input
                                       value={quickPastor.google_maps_link}
                                       onChange={(e) => handleQuickPastorGoogleMapsLinkChange(e.target.value)}
                                       placeholder="Search address or paste Google Maps URL..."
                                       className={cn(inputStyle, "flex-1 pl-10 h-12")}
                                    />
                                 </div>
                                 <Button
                                    onClick={() => handleQuickPastorGoogleMapsLinkChange(quickPastor.google_maps_link)}
                                    variant="outline"
                                    className="h-12 px-6 border-[#6c1cff] text-[#6c1cff] font-medium text-[13px] tracking-wide hover:bg-[#6c1cff]/5 rounded-xl transition-all"
                                 >
                                    {quickPastorSearchLoading ? "..." : "Fetch"}
                                 </Button>
                              </div>

                              {quickPastorSearchSuggestions.length > 0 && (
                                 <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden mt-1">
                                    {quickPastorSearchSuggestions.map((s, idx) => (
                                       <button
                                          key={idx}
                                          onClick={() => handleQuickPastorSuggestionSelect(s)}
                                          className="w-full px-5 py-3.5 text-left hover:bg-gray-50 flex items-start gap-3 transition-colors border-b border-gray-50 last:border-none"
                                       >
                                          <MapPin className="h-4 w-4 text-[#6c1cff] mt-0.5" />
                                          <div>
                                             <p className="text-[14px] font-bold text-slate-800">{s.text}</p>
                                             <p className="text-[12px] text-slate-500 line-clamp-1">{s.place_name}</p>
                                          </div>
                                       </button>
                                    ))}
                                 </div>
                              )}
                           </div>
                        </div>

                        <div className="h-[260px] w-full rounded-3xl overflow-hidden border border-gray-100 shadow-inner relative group">
                           <MapGL
                              {...quickPastorViewport}
                              onMove={evt => setQuickPastorViewport(evt.viewState)}
                              mapStyle="mapbox://styles/mapbox/streets-v12"
                              mapboxAccessToken={MAPBOX_TOKEN}
                              style={{ width: '100%', height: '100%' }}
                           >
                              <Marker
                                 latitude={safeParse(quickPastor.latitude, quickPastorViewport.latitude)}
                                 longitude={safeParse(quickPastor.longitude, quickPastorViewport.longitude)}
                                 draggable
                                 onDragEnd={handleQuickPastorMarkerDrag}
                                 anchor="bottom"
                                 style={{ zIndex: 1000 }}
                              >
                                 <div className="cursor-grab active:cursor-grabbing">
                                    <div className="w-12 h-12 bg-[#6c1cff] rounded-full flex items-center justify-center shadow-2xl border-4 border-white transform hover:scale-110 transition-transform">
                                       <Users size={20} className="text-white" />
                                    </div>
                                    <div className="w-1.5 h-4 bg-[#6c1cff] mx-auto -mt-1 rounded-full shadow-lg"></div>
                                 </div>
                              </Marker>
                              <NavigationControl position="top-right" />
                              <GeolocateControl
                                 position="top-right"
                                 positionOptions={{ enableHighAccuracy: true }}
                                 trackUserLocation={false}
                                 showUserLocation={false}
                                 style={{ marginRight: 0, marginTop: 40 }}
                                 onGeolocate={async (pos) => {
                                    const { latitude, longitude } = pos.coords;
                                    setQuickPastor(prev => ({
                                       ...prev,
                                       latitude: latitude.toString(),
                                       longitude: longitude.toString(),
                                       google_maps_link: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
                                    }));
                                    setQuickPastorViewport(prev => ({ ...prev, latitude, longitude, zoom: 15 }));
                                    detectCity(latitude, longitude);
                                    detectTimezone(latitude, longitude).then(tz => {
                                       if (tz) setQuickPastor(prev => ({ ...prev, timezone: tz }));
                                    });
                                 }}
                              />
                           </MapGL>

                           <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl border border-gray-100 shadow-lg text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                              Interactive Map Picker Active
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                           <div className="space-y-2">
                              <Label className="text-[11px] font-bold tracking-widest uppercase text-gray-400">Latitude</Label>
                              <Input
                                 value={quickPastor.latitude || ''}
                                 onChange={(e) => setQuickPastor(prev => ({ ...prev, latitude: e.target.value }))}
                                 placeholder="e.g. 17.3850"
                                 className="h-10 bg-gray-50 border-none text-[13px] rounded-lg"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[11px] font-bold tracking-widest uppercase text-gray-400">Longitude</Label>
                              <Input
                                 value={quickPastor.longitude || ''}
                                 onChange={(e) => setQuickPastor(prev => ({ ...prev, longitude: e.target.value }))}
                                 placeholder="e.g. 78.4867"
                                 className="h-10 bg-gray-50 border-none text-[13px] rounded-lg"
                              />
                           </div>
                        </div>

                        <div className="space-y-2">
                           <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Full Address</Label>
                           <Input
                              placeholder="Full Address (Building, Street, Area, City, State, Country, Zip)"
                              value={quickPastor.address_line1}
                              onChange={(e) => setQuickPastor(prev => ({ ...prev, address_line1: e.target.value }))}
                              className={cn(inputStyle, "h-12")}
                           />
                        </div>

                        <div className="space-y-2">
                           <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">City *</Label>
                           <p className="text-[10px] font-bold text-gray-400 -mt-1 mb-1 uppercase tracking-tighter">The city where people will search for you in the directory</p>
                           <CitySelect
                              value={quickPastor.city}
                              onChange={(cityName, cityData) => {
                                 setQuickPastor(prev => ({ 
                                    ...prev, 
                                    city: cityName,
                                    latitude: cityData?.lat || prev.latitude,
                                    longitude: cityData?.lng || prev.longitude
                                 }));
                                 if (cityData) {
                                    setQuickPastorViewport(prev => ({
                                       ...prev,
                                       latitude: cityData.lat,
                                       longitude: cityData.lng,
                                       zoom: 12
                                    }));
                                 }
                              }}
                              placeholder="e.g. Hyderabad, Dallas..."
                              variant="outline"
                           />
                        </div>

                        <div className="space-y-3">
                           <Label className="text-[12px] font-bold tracking-widest uppercase text-gray-500 block">Operating Timezone</Label>
                           <div className="relative group">
                              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#6c1cff] transition-colors z-10" />
                              <Select value={quickPastor.timezone} onValueChange={(v) => setQuickPastor(prev => ({ ...prev, timezone: v }))}>
                                 <SelectTrigger className={cn(selectStyle, "pl-10 h-12 bg-gray-50/50")}>
                                    <SelectValue placeholder="Select timezone" />
                                 </SelectTrigger>
                                 <SelectContent position="popper" side="bottom" className="z-[130] max-h-[300px] rounded-2xl border-none shadow-2xl">
                                    {['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Australia/Sydney', 'Europe/Paris', 'Africa/Lagos', 'Asia/Tokyo'].map(tz => (
                                       <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                    ))}
                                 </SelectContent>
                              </Select>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex gap-4 p-10 bg-gray-50/50 border-t border-gray-100">
                  <Button
                     onClick={() => setShowQuickPastorDialog(false)}
                     variant="ghost"
                     className="flex-1 h-12 text-[13px] font-bold tracking-widest uppercase text-slate-400 hover:text-slate-600 transition-colors"
                  >
                     Cancel
                  </Button>
                  <Button
                     onClick={handleQuickPastorCreate}
                     disabled={quickPastorLoading}
                     className="flex-1 h-12 bg-[#6c1cff] hover:bg-[#5b17d6] text-white text-[13px] font-bold tracking-widest uppercase shadow-lg shadow-purple-100 rounded-[16px] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                     {quickPastorLoading ? 'Creating...' : 'Create & Link'}
                  </Button>
               </div>
            </DialogContent>
         </Dialog>

         {/* Quick Church Creation Dialog (Step 3) */}
         <Dialog open={showQuickChurchDialog} onOpenChange={setShowQuickChurchDialog}>
            <DialogContent className="max-w-2xl p-0 border-none overflow-hidden rounded-3xl shadow-2xl">
               <div className="p-10 space-y-8 bg-white max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <DialogHeader className="space-y-3">
                     <DialogTitle className="text-2xl font-semibold text-[#202124] tracking-tight">Quick Church Profile</DialogTitle>
                     <p className="text-[15px] text-[#5f6368]">Add basic details to link this {quickChurchTrigger === 'main' ? 'main branch' : 'branch'} to your profile.</p>
                  </DialogHeader>

                  <div className="space-y-6">
                     <div className="flex justify-center mb-6">
                        <div className="space-y-3 w-full">
                           <Label className="text-[12px] font-semibold tracking-widest uppercase text-gray-400 text-center block">Church Logo (Optional)</Label>
                           <FileUpload
                              category="logo"
                              accept=".jpg,.jpeg,.png,.webp"
                              previewType="thumbnail"
                              value={quickChurch.logo}
                              onChange={(u) => setQuickChurch(prev => ({ ...prev, logo: u }))}
                              className="h-[120px] bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100"
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-500">Church Name *</Label>
                        <Input 
                           autoFocus
                           name="qc-church-name-secure" 
                           autoComplete="new-password" 
                           placeholder="Enter church name" 
                           value={quickChurch.name} 
                           onChange={(e) => setQuickChurch({ ...quickChurch, name: e.target.value })} 
                           className={inputStyle} 
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-500">Email *</Label>
                           <Input name="qc-church-email-secure" autoComplete="new-password" placeholder="Official email" value={quickChurch.email} onChange={(e) => setQuickChurch({ ...quickChurch, email: e.target.value })} className={inputStyle} />
                        </div>
                        <div className="space-y-2 group">
                           <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-widest group-focus-within:text-[#6c1cff] transition-colors">Phone *</Label>
                           <PhoneInputPremium
                              value={quickChurch.phone}
                              onChange={(val) => setQuickChurch({ ...quickChurch, phone: val })}
                              onCountryChange={(code) => {
                                 const tz = COUNTRY_TIMEZONE_MAP[code];
                                 if (tz) setQuickChurch(prev => ({ ...prev, timezone: tz }));
                              }}
                              placeholder="Phone number"
                           />
                        </div>
                     </div>
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-500">Full Address *</Label>
                           <Input name="qc-church-addr-secure" autoComplete="new-password" placeholder="Building, Street, Area, City, State, Zip" value={quickChurch.address_line1} onChange={(e) => setQuickChurch({ ...quickChurch, address_line1: e.target.value })} className={inputStyle} />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-500">City *</Label>
                           <CitySelect
                              value={quickChurch.city}
                              onChange={(cityName, cityData) => {
                                 setQuickChurch(prev => ({ 
                                    ...prev, 
                                    city: cityName,
                                    latitude: cityData?.lat || prev.latitude,
                                    longitude: cityData?.lng || prev.longitude
                                 }));
                                 if (cityData) {
                                    setQuickChurchViewport(prev => ({
                                       ...prev,
                                       latitude: cityData.lat,
                                       longitude: cityData.lng,
                                       zoom: 12
                                    }));
                                 }
                              }}
                              placeholder="e.g. Hyderabad, Dallas..."
                              variant="outline"
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-500">How are you related to this listing? (Optional)</Label>
                           <Input placeholder="e.g. Admin, Branch Head..." value={quickChurch.relationship_to_listing} onChange={(e) => setQuickChurch({ ...quickChurch, relationship_to_listing: e.target.value })} className={inputStyle} />
                        </div>
                     </div>

                     <div className="space-y-6 pt-2">
                        <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-500 block mb-2">Map location</Label>
                        <div className="space-y-6">
                           <div className="relative">
                              <div className="flex gap-4">
                                 <div className="relative flex-1 group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#6c1cff] transition-colors" />
                                    <Input
                                       value={quickChurch.google_maps_link}
                                       onChange={(e) => handleQuickGoogleMapsLinkChange(e.target.value)}
                                       placeholder="Search address or paste Google Maps URL..."
                                       className={cn(inputStyle, "flex-1 pl-10")}
                                    />
                                 </div>
                                 <Button
                                    onClick={() => handleQuickGoogleMapsLinkChange(quickChurch.google_maps_link)}
                                    variant="outline"
                                    className="h-11 px-6 border-[#6c1cff] text-[#6c1cff] font-medium text-[13px] tracking-wide hover:bg-[#6c1cff]/5 rounded-xl transition-all"
                                 >
                                    {quickSearchLoading ? "..." : "Fetch"}
                                 </Button>
                              </div>

                              {quickSearchSuggestions.length > 0 && (
                                 <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-[110] overflow-hidden">
                                    {quickSearchSuggestions.map((s, idx) => (
                                       <button
                                          key={idx}
                                          onClick={() => handleQuickSuggestionSelect(s)}
                                          className="w-full px-5 py-3.5 text-left hover:bg-gray-50 flex items-start gap-3 transition-colors border-b border-gray-50 last:border-none"
                                       >
                                          <MapPin className="h-4 w-4 text-[#6c1cff] mt-0.5" />
                                          <div>
                                             <p className="text-[14px] font-semibold text-gray-800">{s.text}</p>
                                             <p className="text-[12px] text-gray-500 line-clamp-1">{s.place_name}</p>
                                          </div>
                                       </button>
                                    ))}
                                 </div>
                              )}
                           </div>

                           <div className="h-[280px] w-full rounded-2xl overflow-hidden border border-gray-100 shadow-inner relative group">
                              <MapGL
                                 {...quickChurchViewport}
                                 latitude={safeParse(quickChurchViewport.latitude, 20.5937)}
                                 longitude={safeParse(quickChurchViewport.longitude, 78.9629)}
                                 onMove={evt => setQuickChurchViewport(evt.viewState)}
                                 mapStyle="mapbox://styles/mapbox/streets-v12"
                                 mapboxAccessToken={MAPBOX_TOKEN}
                                 style={{ width: '100%', height: '100%' }}
                              >
                                 <Marker
                                    latitude={safeParse(quickChurch.latitude, quickChurchViewport.latitude)}
                                    longitude={safeParse(quickChurch.longitude, quickChurchViewport.longitude)}
                                    draggable
                                    onDragEnd={handleQuickMarkerDrag}
                                    anchor="bottom"
                                  style={{ zIndex: 1000 }}
                                 >
                                    <div className="cursor-grab active:cursor-grabbing">
                                       <div className="w-10 h-10 bg-[#6c1cff] rounded-full flex items-center justify-center shadow-xl border-4 border-white transform hover:scale-110 transition-transform">
                                          <Church size={18} className="text-white" />
                                       </div>
                                       <div className="w-1 h-3 bg-[#6c1cff] mx-auto -mt-1 rounded-full shadow-lg"></div>
                                    </div>
                                 </Marker>
                                 <NavigationControl position="top-right" />
                                 <GeolocateControl
                                    position="top-right"
                                    positionOptions={{ enableHighAccuracy: true }}
                                    trackUserLocation={false}
                                    showUserLocation={false}
                                    style={{ marginRight: 0, marginTop: 40 }}
                                    onGeolocate={async (pos) => {
                                       const { latitude, longitude } = pos.coords;
                                       setQuickChurch(prev => ({
                                          ...prev,
                                          latitude: latitude.toString(),
                                          longitude: longitude.toString(),
                                          google_maps_link: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
                                       }));
                                       setQuickChurchViewport(prev => ({ ...prev, latitude, longitude, zoom: 15 }));
                                       detectTimezone(latitude, longitude).then(tz => {
                                          if (tz) setQuickChurch(prev => ({ ...prev, timezone: tz }));
                                       });
                                    }}
                                 />
                              </MapGL>

                              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                 Interactive Map Picker Active
                              </div>
                           </div>

                           <p className="text-[12px] text-[#5f6368] leading-relaxed">
                              <span className="font-semibold text-[#6c1cff]">Pro Tip:</span> You can type your current address in the search box above, or simply <span className="text-[#6c1cff] font-medium">drag the purple pin</span> on the map to your exact location.
                           </p>

                           <div className="grid grid-cols-2 gap-8">
                              <div className="space-y-3">
                                 <Label className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">Latitude</Label>
                                 <Input
                                    value={quickChurch.latitude || ''}
                                    onChange={(e) => setQuickChurch(prev => ({ ...prev, latitude: e.target.value }))}
                                    placeholder="e.g. 17.3850"
                                    className="h-10 bg-white border-gray-200 focus:border-[#6c1cff] focus:ring-0 text-[14px] font-normal rounded-lg transition-all"
                                 />
                              </div>
                              <div className="space-y-3">
                                 <Label className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">Longitude</Label>
                                 <Input
                                    value={quickChurch.longitude || ''}
                                    onChange={(e) => setQuickChurch(prev => ({ ...prev, longitude: e.target.value }))}
                                    placeholder="e.g. 78.4867"
                                    className="h-10 bg-white border-gray-200 focus:border-[#6c1cff] focus:ring-0 text-[14px] font-normal rounded-lg transition-all"
                                 />
                              </div>
                           </div>

                           <div className="space-y-2 pt-2">
                              <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-500 block mb-2">Operating Timezone</Label>
                              <div className="relative group">
                                 <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#6c1cff] transition-colors z-10" />
                                 <Select value={quickChurch.timezone} onValueChange={(v) => setQuickChurch(prev => ({ ...prev, timezone: v }))}>
                                    <SelectTrigger className={cn(selectStyle, "pl-10 h-11")}>
                                       <SelectValue placeholder="Select timezone" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" side="bottom" className="z-[120] max-h-[300px]">
                                       {['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Australia/Sydney', 'Europe/Paris', 'Africa/Lagos', 'Asia/Tokyo'].map(tz => (
                                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                       ))}
                                    </SelectContent>
                                 </Select>
                              </div>
                           </div>
                        </div>
                     </div>


                     <div className="space-y-2">
                        <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-500">Denomination *</Label>
                        <Select value={quickChurch.denomination} onValueChange={(v) => setQuickChurch({ ...quickChurch, denomination: v })}>
                           <SelectTrigger className={selectStyle}><SelectValue placeholder="Select denomination" /></SelectTrigger>
                           <SelectContent position="popper" side="bottom" sideOffset={8} avoidCollisions={false} className="z-[110] max-h-[300px]">
                              {(taxonomies.denomination || []).sort().map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                           </SelectContent>
                        </Select>
                     </div>
                     <div className="flex gap-4 pt-10 pb-6">
                        <Button
                           variant="ghost"
                           className="flex-1 h-12 rounded-xl text-[12px] font-bold tracking-widest uppercase text-gray-400"
                           onClick={() => setShowQuickChurchDialog(false)}
                        >
                           Cancel
                        </Button>
                        <Button
                           onClick={handleQuickChurchCreate}
                           disabled={quickChurchLoading}
                           className="flex-1 h-12 rounded-xl bg-[#6c1cff] hover:bg-[#5b17d6] text-white font-bold text-[12px] tracking-widest uppercase shadow-lg shadow-purple-100"
                        >
                           {quickChurchLoading ? 'Creating...' : 'Create & Link'}
                        </Button>
                     </div>
                  </div>
               </div>
            </DialogContent>
         </Dialog>

         <Footer />
      </div>
   );
};

export default ChurchCreationFlow;
