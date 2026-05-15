import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const LegalPage = () => {
  const location = useLocation();
  const path = location.pathname;

  const getContent = () => {
    switch (path) {
      case '/privacy':
        return {
          title: 'Privacy Policy',
          lastUpdated: 'May 15, 2026',
          content: (
            <>
              <p className="mb-4 text-slate-600">Your privacy is important to us. It is Church Navigator's policy to respect your privacy regarding any information we may collect from you across our website, https://churchnavigator.com, and other sites we own and operate.</p>
              <h3 className="text-xl font-semibold mb-2">1. Information we collect</h3>
              <p className="mb-4 text-slate-600">We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.</p>
              <h3 className="text-xl font-semibold mb-2">2. Use of Information</h3>
              <p className="mb-4 text-slate-600">We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we’ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.</p>
              <h3 className="text-xl font-semibold mb-2">3. Data Sharing</h3>
              <p className="mb-4 text-slate-600">We don’t share any personally identifying information publicly or with third-parties, except when required to by law.</p>
              <h3 className="text-xl font-semibold mb-2">4. Your Rights</h3>
              <p className="mb-4 text-slate-600">You are free to refuse our request for your personal information, with the understanding that we may be unable to provide you with some of your desired services.</p>
            </>
          )
        };
      case '/terms':
      case '/t&c':
        return {
          title: 'Terms and Conditions',
          lastUpdated: 'May 15, 2026',
          content: (
            <>
              <p className="mb-4 text-slate-600">By accessing the website at https://churchnavigator.com, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p>
              <h3 className="text-xl font-semibold mb-2">1. Use License</h3>
              <p className="mb-4 text-slate-600">Permission is granted to temporarily download one copy of the materials (information or software) on Church Navigator's website for personal, non-commercial transitory viewing only.</p>
              <h3 className="text-xl font-semibold mb-2">2. Disclaimer</h3>
              <p className="mb-4 text-slate-600">The materials on Church Navigator's website are provided on an 'as is' basis. Church Navigator makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
              <h3 className="text-xl font-semibold mb-2">3. Limitations</h3>
              <p className="mb-4 text-slate-600">In no event shall Church Navigator or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Church Navigator's website.</p>
            </>
          )
        };
      case '/cookie-policy':
      case '/cookies':
        return {
          title: 'Cookie Policy',
          lastUpdated: 'May 15, 2026',
          content: (
            <>
              <p className="mb-4 text-slate-600">This is the Cookie Policy for Church Navigator, accessible from https://churchnavigator.com</p>
              <h3 className="text-xl font-semibold mb-2">What Are Cookies</h3>
              <p className="mb-4 text-slate-600">As is common practice with almost all professional websites this site uses cookies, which are tiny files that are downloaded to your computer, to improve your experience.</p>
              <h3 className="text-xl font-semibold mb-2">How We Use Cookies</h3>
              <p className="mb-4 text-slate-600">We use cookies for a variety of reasons detailed below. Unfortunately in most cases there are no industry standard options for disabling cookies without completely disabling the functionality and features they add to this site.</p>
              <h3 className="text-xl font-semibold mb-2">Disabling Cookies</h3>
              <p className="mb-4 text-slate-600">You can prevent the setting of cookies by adjusting the settings on your browser (see your browser Help for how to do this). Be aware that disabling cookies will affect the functionality of this and many other websites that you visit.</p>
            </>
          )
        };
      default:
        return {
          title: 'Legal Information',
          lastUpdated: '',
          content: <p>Please select a legal page from the footer.</p>
        };
    }
  };

  const { title, lastUpdated, content } = getContent();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100">
            <h1 className="text-4xl font-bold mb-2 text-slate-900">{title}</h1>
            {lastUpdated && (
              <p className="text-sm text-slate-400 mb-8">Last Updated: {lastUpdated}</p>
            )}
            
            <div className="prose prose-slate max-w-none">
              {content}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LegalPage;
