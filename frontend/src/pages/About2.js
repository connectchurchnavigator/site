import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Church, Users, Search, TrendingUp, MapPin, 
  Heart, Calendar, BookOpen, Sparkles, CheckCircle,
  Shield, Globe, Zap, MessageSquare, ArrowUp
} from 'lucide-react';
import { NavbarPremium } from '../components/NavbarPremium';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/button';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '../components/ui/accordion';
import './Home2.css'; // Reusing Home2 styles

const CountUp = ({ end, duration = 2000, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime = null;
    let animationFrame = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, end, duration]);

  return <span ref={elementRef}>{count}{suffix}</span>;
};

const About2 = () => {
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollY / height) * 100;
      
      setScrollProgress(progress);
      setShowScrollTop(scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const faqs = [
    {
      question: "Is ChurchNavigator free for users?",
      answer: "Yes, ChurchNavigator is completely free for individuals looking to find churches, pastors, or events. We want to make spiritual discovery accessible to everyone."
    },
    {
      question: "How do you verify the listings?",
      answer: "We use a multi-step verification process, including checking official websites, social media presence, and sometimes direct contact with the ministry leadership to ensure accuracy."
    },
    {
      question: "Can I update my profile after listing?",
      answer: "Absolutely. Once your listing is approved, you can log into your dashboard at any time to update service times, photos, contact info, and upcoming events."
    },
    {
      question: "What types of ministries are eligible?",
      answer: "We welcome Christian churches, ministries, and spiritual organizations of all sizes and denominations that are focused on serving their communities."
    }
  ];

  return (
    <div className="home2-container bg-slate-50 min-h-screen font-sans">
      <NavbarPremium variant="dark" />

      {/* Hero Section */}
      <section 
        className="relative min-h-[70vh] flex items-center justify-center pt-24 overflow-hidden bg-hero-dark-custom"
        style={{
          backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.8), rgba(2, 6, 23, 0.95)), url('/hero-church-3.jpg')`
        }}
      >
        <div className="aura-blob top-[-10%] left-[-10%] opacity-20"></div>
        <div className="aura-blob bottom-[-10%] right-[-10%] opacity-10"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
          <div className="reveal">
            <div className="inline-flex items-center text-brand text-xs font-bold tracking-widest uppercase mb-4 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-white/80">
              <Sparkles className="h-3 w-3 mr-2 text-brand" /> Our Mission
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.05] text-white hero-text-glow tracking-tight">
              Bridging Faith <br /> <span className="text-gradient">With Innovation</span>
            </h1>
            <p className="text-lg md:text-xl text-white/50 mb-12 max-w-3xl mx-auto font-light leading-relaxed tracking-wide">
              ChurchNavigator is the world's most advanced spiritual discovery platform, 
              connecting individuals with verified Christian communities and leadership.
            </p>
          </div>
        </div>
      </section>

      {/* Who We Are & Stats Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="reveal">
              <div className="inline-flex items-center text-brand text-xs font-bold tracking-widest uppercase mb-4">
                <Shield className="h-3 w-3 mr-2" /> Who We Are
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 tracking-tight">
                Empowering the <br /> <span className="text-gradient">Global Church</span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed font-light mb-6">
                Our goal is simple: Make it easier for people to find a spiritual home and easier for 
                Churches to reach the people who need them by our platform where information is organized 
                in a simple way so that it is make easy to find what you're looking for in just a few clicks.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12">
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center mr-4 shrink-0 text-brand">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Wide Reach</h4>
                    <p className="text-slate-600 text-base font-light">Connecting thousands across multiple regions.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center mr-4 shrink-0 text-brand">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Fully Verified</h4>
                    <p className="text-slate-600 text-base font-light">Every listing passes strict quality checks.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Redesigned Premium Stats Boxes */}
            <div className="reveal delay-1 relative">
              <div className="absolute -inset-4 bg-brand/5 blur-3xl rounded-full"></div>
              <div className="relative grid grid-cols-2 gap-6">
                 {/* Stat Card 1 */}
                 <div className="glass-panel p-8 rounded-[2.5rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/50 hover:shadow-brand/10 transition-all duration-500 group">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 text-brand group-hover:scale-110 transition-transform">
                      <Church className="h-6 w-6" />
                    </div>
                    <div className="text-4xl font-bold text-slate-900 mb-1 tracking-tighter">
                      <CountUp end={1000} suffix="+" />
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Communities</div>
                 </div>

                 {/* Stat Card 2 */}
                 <div className="glass-panel p-8 rounded-[2.5rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/50 translate-y-8 hover:shadow-brand/10 transition-all duration-500 group">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 text-brand group-hover:scale-110 transition-transform">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="text-4xl font-bold text-slate-900 mb-1 tracking-tighter">
                      <CountUp end={500} suffix="+" />
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pastors</div>
                 </div>

                 {/* Stat Card 3 */}
                 <div className="glass-panel p-8 rounded-[2.5rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/50 hover:shadow-brand/10 transition-all duration-500 group">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 text-brand group-hover:scale-110 transition-transform">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div className="text-4xl font-bold text-slate-900 mb-1 tracking-tighter">
                      <CountUp end={50} suffix="+" />
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cities</div>
                 </div>

                 {/* Stat Card 4 */}
                 <div className="glass-panel p-8 rounded-[2.5rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/50 translate-y-8 hover:shadow-brand/10 transition-all duration-500 group">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 text-brand group-hover:scale-110 transition-transform">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div className="text-4xl font-bold text-slate-900 mb-1 tracking-tighter">
                      <CountUp end={100} suffix="%" />
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified</div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="py-24 bg-mesh-light/30 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 text-center mb-16 reveal">
          <div className="inline-flex items-center text-brand text-xs font-bold tracking-widest uppercase mb-4">
             <TrendingUp className="h-3 w-3 mr-2" /> Our Services
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            What We <span className="text-gradient">Do</span>
          </h2>
          <p className="mt-4 text-slate-600 max-w-3xl mx-auto font-light leading-relaxed text-lg">
            At ChurchNavigator.com, we gather and organize information from Christian Ministries 
            to create a clear, searchable directory that anyone can use.
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: Church, title: 'Church Profiles', desc: 'Comprehensive church profiles with ministry details, photos, and contact information.' },
            { icon: Users, title: 'Pastor Listings', desc: 'Connect with pastors and church leadership in your community.' },
            { icon: MapPin, title: 'Location Services', desc: 'Find churches with accurate locations, service times, and directions.' },
            { icon: Search, title: 'Smart Search', desc: 'Easy-to-use search based on your preferences and location.' }
          ].map((item, i) => (
            <div key={i} className="reveal glass-panel p-8 rounded-[2.5rem] flex flex-col items-center text-center group active:scale-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-6 border border-brand/5 group-hover:bg-brand group-hover:text-white transition-all duration-500 shadow-lg shadow-brand/5">
                <item.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">{item.title}</h3>
              <p className="text-slate-600 text-base leading-relaxed font-light">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why ChurchNavigator.com? */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 reveal">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Why <span className="text-gradient">ChurchNavigator.com?</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
             {[
               { icon: Search, title: 'Simplified Search', desc: 'We simplify the process of finding a church that fits your needs.' },
               { icon: TrendingUp, title: 'Increased Visibility', desc: 'We help ministries increase their visibility and reach more people.' },
               { icon: Calendar, title: 'Easy Discovery', desc: 'We make Christian events easier to discover and attend.' },
               { icon: Heart, title: 'Bridge the Gap', desc: 'We connect people with the local ministries that serve them.' },
             ].map((reason, i) => (
               <div key={i} className="reveal text-center">
                 <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-50 border border-slate-100 rounded-3xl mb-6 shadow-sm group-hover:shadow-md transition-all">
                   <reason.icon className="h-9 w-9 text-brand" />
                 </div>
                 <h3 className="font-bold text-xl text-slate-900 mb-3 tracking-tight">{reason.title}</h3>
                 <p className="text-slate-600 text-base font-light leading-relaxed">
                   {reason.desc}
                 </p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-slate-50 border-y border-slate-100 relative">
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16 reveal">
            <div className="inline-flex items-center text-brand text-xs font-bold tracking-widest uppercase mb-4">
               <MessageSquare className="h-3 w-3 mr-2" /> Got Questions?
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Frequently Asked <span className="text-gradient">Questions</span>
            </h2>
          </div>

          <div className="reveal">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-white border border-slate-100 rounded-2xl px-6 py-2 shadow-sm shadow-slate-100 hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  <AccordionTrigger className="text-slate-900 font-bold text-[18.5px] hover:no-underline py-6">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600 text-lg font-light leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>


      {/* Variation 4: Futuristic Gradient Glow */}
      <section className="py-32 px-4 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="reveal relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand to-purple-600 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-white border border-slate-100 rounded-[3rem] p-12 md:p-20 shadow-2xl overflow-hidden flex flex-col lg:flex-row gap-16 items-center">
               <div className="lg:w-3/5">
                  <div className="inline-flex items-center text-brand text-xs font-bold tracking-widest uppercase mb-8">
                    <Sparkles className="h-4 w-4 mr-2" /> Visionary Partnership
                  </div>
                  <h2 className="text-4xl md:text-6xl font-bold text-slate-950 mb-8 tracking-tight">
                    Powering The Next Generation <br /> <span className="text-gradient">Of Faith Communities.</span>
                  </h2>
                  <p className="text-slate-500 text-xl font-light leading-relaxed mb-10">
                    We're not just a directory. We're a technology partner dedicated to helping 
                    ministries scale their impact and reach the hearts of people everywhere.
                  </p>
                  <div className="flex flex-wrap gap-4">
                     <Button 
                        size="lg" 
                        className="bg-slate-950 hover:bg-slate-800 text-white rounded-2xl px-12 h-14 font-bold transition-all shadow-xl shadow-slate-200"
                        onClick={() => navigate('/add-listing')}
                      >
                        Partner With Us
                      </Button>
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl px-12 h-14 font-bold"
                        onClick={() => navigate('/explore')}
                      >
                        See Examples
                      </Button>
                  </div>
               </div>
               <div className="lg:w-2/5 w-full">
                  <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 relative group-hover:scale-[1.02] transition-transform duration-500">
                     <MessageSquare className="h-10 w-10 text-brand mb-6" />
                     <p className="text-lg md:text-xl text-slate-800 font-medium mb-4 italic leading-relaxed">
                        "Finally, a platform that understands the unique needs of a modern ministry."
                     </p>
                     <div className="font-bold text-slate-950">Pastor Samuel K.</div>
                     <div className="text-slate-400 text-sm">Grace Community Network</div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Variation 5: Minimalist Half-and-Half Typographic Split */}
      <section className="bg-slate-50 overflow-hidden border-y border-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
           <div className="bg-brand/5 p-12 md:p-24 flex flex-col justify-center reveal">
             <div className="inline-flex items-center text-brand text-xs font-bold tracking-widest uppercase mb-10">
               <Zap className="h-4 w-4 mr-2" /> Forward Thinking
             </div>
             <blockquote className="text-4xl md:text-5xl font-black text-slate-950 leading-[1.1] tracking-tight mb-12">
               "We believe in the power of <span className="text-brand">connection</span> to transform lives."
             </blockquote>
             <p className="text-slate-500 text-xl font-light leading-relaxed max-w-lg mb-4">
                ChurchNavigator.com is built on the intersection of faith and the future. 
             </p>
             <p className="text-slate-500 text-xl font-light leading-relaxed max-w-lg">
                We empower churches to tell their story to a global audience with clarity and impact.
             </p>
           </div>
           
           <div className="bg-white p-12 md:p-24 flex flex-col justify-center items-start reveal delay-1">
             <h3 className="text-3xl font-bold text-slate-950 mb-8">Ready to grow your community?</h3>
             <ul className="space-y-6 mb-12 text-slate-600">
               <li className="flex items-center gap-4 text-xl">
                 <CheckCircle className="text-brand h-6 w-6" /> Increased organic search visibility
               </li>
               <li className="flex items-center gap-4 text-xl">
                 <CheckCircle className="text-brand h-6 w-6" /> Premium ministry profile branding
               </li>
               <li className="flex items-center gap-4 text-xl">
                 <CheckCircle className="text-brand h-6 w-6" /> Direct connection to spiritual seekers
               </li>
             </ul>
             <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
               <Button 
                  size="lg" 
                  className="bg-brand hover:bg-brand-hover text-white rounded-2xl px-12 h-16 text-lg font-bold shadow-2xl shadow-brand/20"
                  onClick={() => navigate('/add-listing')}
                >
                  Join The Movement
                </Button>
                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="text-slate-900 px-12 h-16 text-lg font-bold hover:bg-slate-50"
                  onClick={() => navigate('/explore')}
                >
                  Explore Features
                </Button>
             </div>
           </div>
        </div>
      </section>

      {/* Scroll to Top Button (Alternative: Progress Ring) */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-10 right-10 z-[100] w-14 h-14 flex items-center justify-center group"
          aria-label="Scroll to top"
        >
          {/* Progress Circle SVG */}
          <svg className="absolute w-full h-full transform -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="26"
              stroke="currentColor"
              strokeWidth="2"
              fill="transparent"
              className="text-slate-200"
            />
            <circle
              cx="28"
              cy="28"
              r="26"
              stroke="currentColor"
              strokeWidth="2"
              fill="transparent"
              strokeDasharray={163.36}
              strokeDashoffset={163.36 - (163.36 * scrollProgress) / 100}
              className="text-brand transition-all duration-100 ease-out"
            />
          </svg>
          
          <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative z-10">
            <ArrowUp className="h-5 w-5" />
          </div>
        </button>
      )}

      <Footer />
    </div>
  );
};

export default About2;
