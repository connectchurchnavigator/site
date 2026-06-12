import React, { useState, useEffect, useCallback, useRef } from 'react';
import './HeroSlider.css';

const HeroSlider = ({
  slides = [],
  height = 340,
  autoplay = true,
  interval = 5000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const sliderRef = useRef(null);

  const validSlides = slides.filter(slide => slide && slide.content_component);
  const totalSlides = validSlides.length;

  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  useEffect(() => {
    if (!autoplay || isPaused || totalSlides <= 1) return;

    timerRef.current = setInterval(() => {
      goToNext();
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoplay, isPaused, interval, goToNext, totalSlides]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!sliderRef.current) return;
      const isFocused = sliderRef.current.contains(document.activeElement);
      if (!isFocused) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  if (totalSlides === 0) {
    return <div className="hero-slider-empty" style={{ height: `${height}px` }}></div>;
  }

  if (totalSlides === 1) {
    const slide = validSlides[0];
    return (
      <div 
        className="hero-slider-single" 
        style={{ 
          height: `${height}px`,
          backgroundImage: slide.bg_image ? `url(${slide.bg_image})` : 'none',
          backgroundColor: slide.bg_color || '#1a1a1a'
        }}
      >
        {slide.content_component}
      </div>
    );
  }

  return (
    <div 
      ref={sliderRef}
      className="hero-slider-container"
      style={{ height: `${height}px` }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      tabIndex="0"
    >
      {validSlides.map((slide, index) => (
        <div
          key={slide.key || index}
          className={`hero-slide ${index === currentIndex ? 'active' : ''}`}
          style={{
            backgroundImage: slide.bg_image ? `url(${slide.bg_image})` : 'none',
            backgroundColor: slide.bg_color || '#1a1a1a',
            opacity: index === currentIndex ? 1 : 0,
            zIndex: index === currentIndex ? 1 : 0
          }}
        >
          {slide.content_component}
        </div>
      ))}

      <button 
        className="hero-slider-arrow hero-slider-arrow-left"
        onClick={goToPrev}
        aria-label="Previous slide"
      >
        <i className="ti-chevron-left"></i>
      </button>

      <button 
        className="hero-slider-arrow hero-slider-arrow-right"
        onClick={goToNext}
        aria-label="Next slide"
      >
        <i className="ti-chevron-right"></i>
      </button>

      <div className="hero-slider-dots">
        {validSlides.map((_, index) => (
          <button
            key={index}
            className={`hero-slider-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <div className="hero-slider-counter">
        {currentIndex + 1} / {totalSlides}
      </div>
    </div>
  );
};

export default HeroSlider;