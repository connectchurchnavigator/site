import React, { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Input } from './ui/input';
import { countries, popularCountries } from '../lib/countries';

export function PhoneInputPremium({ value = '', onChange, className, placeholder = "Phone number" }) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Parse initial value to find country
  const initialCountry = useMemo(() => {
    if (!value || !value.startsWith('+')) return countries.find(c => c.code === 'IN') || countries[0];
    
    // Sort countries by dial code length descending to match longest first (e.g. +1-268 vs +1)
    const sortedCountries = [...countries].sort((a, b) => b.dial.length - a.dial.length);
    for (const country of sortedCountries) {
      if (value.startsWith(country.dial)) {
        return country;
      }
    }
    return countries.find(c => c.code === 'IN') || countries[0];
  }, [value]);

  const [selectedCountry, setSelectedCountry] = useState(initialCountry);

  // Sync internal state if initialCountry changes due to parent prop change
  useEffect(() => {
    setSelectedCountry(initialCountry);
  }, [initialCountry]);

  // Extract number without code
  const numberValue = value.startsWith(selectedCountry.dial) 
    ? value.slice(selectedCountry.dial.length) 
    : value.replace(/^\+/, ''); // Fallback for mismatched codes

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setOpen(false);
    // Notify parent with new combination
    onChange(country.dial + numberValue);
  };

  const handleNumberChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    onChange(selectedCountry.dial + rawValue);
  };

  const filteredCountries = useMemo(() => {
    if (!searchValue) return countries;
    return countries.filter(c => 
      c.name.toLowerCase().includes(searchValue.toLowerCase()) || 
      c.dial.includes(searchValue) ||
      c.code.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [searchValue]);

  const popularOnes = useMemo(() => 
    countries.filter(c => popularCountries.includes(c.code)), 
  []);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-0 group h-11">
        <Popover open={open} onOpenChange={setOpen} modal={false}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-full pl-4 pr-3 rounded-l-xl rounded-r-none border-r-0 border-gray-100 bg-gray-50/50 hover:bg-white hover:border-[#6c1cff] group-focus-within:border-[#6c1cff] transition-all flex items-center gap-1.5 font-medium text-gray-600"
            >
              <img 
                src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`} 
                alt="" 
                className="w-5 h-3.5 object-cover rounded-[2px]"
              />
              <span className="text-[13px] font-semibold text-gray-700">{selectedCountry.dial}</span>
              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-40 ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0 rounded-2xl shadow-2xl border-gray-100 overflow-hidden" align="start">
            <Command className="border-none">
              <div className="flex items-center border-b px-3 bg-gray-50/20">
                <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                <CommandInput 
                    placeholder="Search country..." 
                    className="h-10 border-none focus:ring-0 bg-transparent text-[13px]"
                    onValueChange={setSearchValue}
                />
              </div>
              <CommandList 
                className="py-1"
                onWheel={(e) => e.stopPropagation()}
              >
                <CommandEmpty className="py-6 text-center text-[12px] text-gray-400 font-medium">No results.</CommandEmpty>
                
                {!searchValue && (
                    <CommandGroup heading="Popular" className="px-2 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                        {popularOnes.map((country) => (
                        <CommandItem
                            key={country.code}
                            value={country.name}
                            onSelect={() => handleCountrySelect(country)}
                            className="rounded-xl px-2 py-2 mb-1 cursor-pointer hover:bg-[#6c1cff]/5 group aria-selected:bg-[#6c1cff]/5"
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 flex items-center justify-center bg-gray-50/80 rounded-lg border border-gray-100/50 overflow-hidden">
                                        <img 
                                          src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`} 
                                          alt="" 
                                          className="w-5 h-3.5 object-cover rounded-[1px]"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-bold text-gray-700">{country.name}</span>
                                        <span className="text-[11px] text-gray-400 font-medium">{country.dial}</span>
                                    </div>
                                </div>
                                <Check
                                    className={cn(
                                        "h-4 w-4 text-[#6c1cff]",
                                        selectedCountry.code === country.code ? "opacity-100" : "opacity-0"
                                    )}
                                />
                            </div>
                        </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                <CommandGroup heading="All Countries" className="px-2 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                  {filteredCountries.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={country.name}
                      onSelect={() => handleCountrySelect(country)}
                      className="rounded-xl px-2 py-2 mb-1 cursor-pointer hover:bg-[#6c1cff]/5 group aria-selected:bg-[#6c1cff]/5"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex items-center justify-center bg-gray-50/80 rounded-lg border border-gray-100/50 overflow-hidden">
                                <img 
                                  src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`} 
                                  alt="" 
                                  className="w-5 h-3.5 object-cover rounded-[1px]"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-gray-700">{country.name}</span>
                                <span className="text-[11px] text-gray-400 font-medium">{country.dial}</span>
                            </div>
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4 text-[#6c1cff]",
                            selectedCountry.code === country.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Input
          value={numberValue}
          onChange={handleNumberChange}
          placeholder={placeholder}
          className="h-full rounded-r-xl rounded-l-none border-gray-100 bg-gray-50/50 hover:bg-white focus:bg-white focus:border-[#6c1cff] focus:ring-0 text-[14px] font-medium transition-all placeholder:text-gray-300"
        />
      </div>
    </div>
  );
}
