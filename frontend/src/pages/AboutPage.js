import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Church, Users, Search, TrendingUp, MapPin, Heart, Calendar, BookOpen } from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-brand/5 to-brand/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="about-title">
            About Us
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            ChurchNavigator.com is a dedicated online platform designed to help people easily discover 
            Churches, Pastors, and Christian Events in your local area and beyond.
          </p>
        </div>
      </section>

      {/* Who We Are */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold mb-8">Who We Are</h2>
        <div className="prose prose-lg max-w-none">
          <p className="text-slate-600 leading-relaxed mb-4">
            Our goal is simple: Make it easier for people to find a spiritual home and easier for 
            Churches to reach the people who need them by our platform where information is organized 
            in a simple way so that it is make easy to find what you're looking for in just a few clicks.
          </p>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-12 text-center">What We Do</h2>
          <p className="text-center text-slate-600 mb-12 max-w-3xl mx-auto">
            At ChurchNavigator.com, we gather and organize information from Christian Ministries 
            to create a clear, searchable directory that anyone can use.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-card">
              <Church className="h-12 w-12 text-brand mb-4" />
              <h3 className="text-xl font-semibold mb-3">Church Profiles</h3>
              <p className="text-slate-600">
                Comprehensive church profiles with ministry details, photos, and contact information.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-card">
              <Users className="h-12 w-12 text-brand mb-4" />
              <h3 className="text-xl font-semibold mb-3">Pastor Listings</h3>
              <p className="text-slate-600">
                Connect with pastors and church leadership in your community.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-card">
              <MapPin className="h-12 w-12 text-brand mb-4" />
              <h3 className="text-xl font-semibold mb-3">Location Services</h3>
              <p className="text-slate-600">
                Find churches with accurate locations, service times, and directions.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-card">
              <Search className="h-12 w-12 text-brand mb-4" />
              <h3 className="text-xl font-semibold mb-3">Smart Search</h3>
              <p className="text-slate-600">
                Easy-to-use search based on your preferences and location.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold mb-12 text-center">Why ChurchNavigator.com?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand/10 rounded-2xl mb-4">
              <Search className="h-8 w-8 text-brand" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Simplified Search</h3>
            <p className="text-slate-600 text-sm">
              We simplify the process of finding a church that fits your needs.
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand/10 rounded-2xl mb-4">
              <TrendingUp className="h-8 w-8 text-brand" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Increased Visibility</h3>
            <p className="text-slate-600 text-sm">
              We help ministries increase their visibility and reach more people.
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand/10 rounded-2xl mb-4">
              <Calendar className="h-8 w-8 text-brand" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Easy Discovery</h3>
            <p className="text-slate-600 text-sm">
              We make Christian events easier to discover and attend.
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand/10 rounded-2xl mb-4">
              <Heart className="h-8 w-8 text-brand" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Bridge the Gap</h3>
            <p className="text-slate-600 text-sm">
              We connect people with the local ministries that serve them.
            </p>
          </div>
        </div>
      </section>

      {/* Partnership */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <BookOpen className="h-16 w-16 text-brand mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-6">Partnering With Churches & Pastors</h2>
          <p className="text-slate-600 leading-relaxed">
            We are committed to working closely with churches, pastors, and ministries of all sizes. 
            Our team helps gather information, update listings, add photos, and ensure that searchers 
            get the most relevant and useful results.
          </p>
          <p className="text-slate-600 leading-relaxed mt-4">
            Whether you lead a church or are simply looking for one, ChurchNavigator.com is here to guide you.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;