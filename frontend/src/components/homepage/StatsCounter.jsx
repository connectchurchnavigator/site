import React, { useEffect, useState, useRef } from 'react';

const StatsCounter = ({ stats }) => {
  const [counts, setCounts] = useState({
    churches: 0,
    events: 0,
    cities: 0,
    believers: 0
  });
  const [hasAnimated, setHasAnimated] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          animateCounters();
          setHasAnimated(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated, stats]);

  const animateCounters = () => {
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;

    const targets = {
      churches: stats.churches > 1000 ? 29000 : stats.churches,
      events: stats.events,
      cities: stats.cities,
      believers: stats.believers_connected
    };

    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setCounts({
        churches: Math.floor(targets.churches * progress),
        events: Math.floor(targets.events * progress),
        cities: Math.floor(targets.cities * progress),
        believers: Math.floor(targets.believers * progress)
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        setCounts(targets);
      }
    }, stepDuration);
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return num.toLocaleString();
    }
    return num;
  };

  return (
    <section ref={sectionRef} className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl md:text-5xl font-bold mb-2">
              {formatNumber(counts.churches)}{counts.churches >= 29000 ? '+' : ''}
            </div>
            <div className="text-purple-200 text-lg">Churches</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-bold mb-2">
              {formatNumber(counts.events)}
            </div>
            <div className="text-purple-200 text-lg">Events</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-bold mb-2">
              {formatNumber(counts.cities)}
            </div>
            <div className="text-purple-200 text-lg">Cities</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-bold mb-2">
              {formatNumber(counts.believers)}
            </div>
            <div className="text-purple-200 text-lg">Believers Connected</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsCounter;