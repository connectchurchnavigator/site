import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, ChevronsUpDown, Loader2, MapPin } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "./ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import axios from 'axios';

export function CitySelect({ value, onChange, placeholder = "Select City...", className }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef(null);

  const fetchCities = useCallback(async (searchQuery) => {
    if (searchQuery.length < 2) {
      setCities([]);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL || ''}/api/cities/search?q=${searchQuery}`);
      setCities(response.data);
    } catch (error) {
      console.error("City search failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    if (query) {
      debounceTimer.current = setTimeout(() => {
        fetchCities(query);
      }, 300);
    } else {
      setCities([]);
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, fetchCities]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-14 px-4 bg-white border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-all focus:ring-2 focus:ring-brand/20", className)}
        >
          {value ? (
            <div className="flex items-center gap-2 truncate">
               <MapPin className="h-4 w-4 text-brand shrink-0" />
               <span className="truncate">{value}</span>
            </div>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[300] shadow-2xl border-slate-100 rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <Command shouldFilter={false} className="bg-white">
          <CommandInput 
            placeholder="Type city name..." 
            value={query}
            onValueChange={setQuery}
            className="h-12 border-none focus:ring-0"
          />
          <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-xs text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
                Searching for cities...
              </div>
            ) : (
              <>
                <CommandEmpty className="p-8 text-center text-sm text-slate-400">
                   No cities found. Try a different spelling.
                </CommandEmpty>
                <CommandGroup>
                  {cities.map((city) => (
                    <CommandItem
                      key={city.display}
                      value={city.display}
                      onSelect={() => {
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
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
