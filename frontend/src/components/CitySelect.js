import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, Loader2, MapPin, Search, X } from "lucide-react";
import { cn } from "../lib/utils";
import { Input } from "./ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from "./ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import axios from 'axios';

export function CitySelect({ value, onChange, placeholder = "Search City...", className, variant = "border-bottom" }) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef(null);

  // Sync internal input value with external prop value
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const fetchCities = useCallback(async (searchQuery) => {
    if (searchQuery.length < 2) {
      setCities([]);
      return;
    }
    setLoading(true);
    try {
      const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
      // Smart path handling: check if baseUrl already includes /api
      const apiPath = baseUrl.endsWith('/api') ? '/cities/search' : '/api/cities/search';
      const response = await axios.get(`${baseUrl}${apiPath}?q=${searchQuery}`);
      
      if (Array.isArray(response.data)) {
        setCities(response.data);
        if (response.data.length > 0) setOpen(true);
        else setOpen(false);
      } else {
        console.warn("City search API returned non-array data:", response.data);
        setCities([]);
        setOpen(false);
      }
    } catch (error) {
      console.error("City search failed:", error);
      setCities([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    
    // Clear existing city if user is typing a new one but hasn't selected yet
    // Only clear if the new text doesn't match the selected value exactly
    if (val !== value) {
        // We don't call onChange here to avoid clearing filters immediately, 
        // unless you want real-time filtering by text.
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    if (val.length >= 2) {
      debounceTimer.current = setTimeout(() => {
        fetchCities(val);
      }, 300);
    } else {
      setCities([]);
      setOpen(false);
    }
  };

  const inputStyles = variant === "outline" 
    ? "bg-white border-slate-200 rounded-xl border h-11 px-4 pl-10" 
    : "border-0 border-b border-slate-200 bg-transparent rounded-none h-14 pl-10";

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative group flex items-center">
        <MapPin className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors z-10",
            inputValue ? "text-brand" : "text-slate-400"
        )} />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (cities.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          className={cn(
            "pr-10 text-sm font-medium text-slate-700 focus-visible:ring-0 focus-visible:border-brand transition-all placeholder:text-slate-400 w-full",
            inputStyles
          )}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-brand" />
          </div>
        )}
        {!loading && inputValue && (
          <button 
            type="button"
            onClick={() => {
                setInputValue("");
                onChange("", null);
                setOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none" />
        </PopoverTrigger>
        <PopoverContent 
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-[var(--radix-popover-trigger-width)] p-0 z-[500] shadow-2xl border-slate-100 rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
          align="start"
          sideOffset={5}
        >
          <Command shouldFilter={false} className="bg-white">
            <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-brand" />
                  Connecting to cities database...
                </div>
              ) : cities.length === 0 && inputValue.length >= 2 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <p>No cities found for "{inputValue}"</p>
                  <p className="mt-2 opacity-50">Checking: {process.env.REACT_APP_BACKEND_URL || 'Local API'}</p>
                </div>
              ) : null}
              <CommandGroup>
                {cities.map((city) => (
                  <CommandItem
                    key={city.display}
                    value={city.display}
                    onSelect={() => {
                      setInputValue(city.name);
                      onChange(city.name, city);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 cursor-pointer p-3 hover:bg-slate-50 transition-colors rounded-xl mx-1 my-0.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand/5 flex items-center justify-center text-brand shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                       <span className="text-sm font-semibold text-slate-900 truncate">{city.name}</span>
                       <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold truncate opacity-60">{city.country}</span>
                    </div>
                    {value === city.name && (
                      <Check className="ml-auto h-4 w-4 text-brand" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
