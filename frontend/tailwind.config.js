/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
        extend: {
                fontFamily: {
                        sans: ['Poppins', 'sans-serif'],
                        serif: ['Playfair Display', 'serif']
                },
                borderRadius: {
                        lg: '1rem',
                        md: '0.75rem',
                        sm: '0.5rem',
                        xl: '1.25rem',
                        '2xl': '1.5rem',
                        '3xl': '2rem'
                },
                colors: {
                        brand: {
                                DEFAULT: '#6c1cff',
                                hover: '#5b17d6',
                                soft: '#F3E8FF',
                                dark: '#4C1D95'
                        },
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        }
                },
                boxShadow: {
                        'soft': '0 4px 20px -2px rgba(108, 28, 255, 0.1)',
                        'card': '0 1px 3px rgba(0,0,0,0.05), 0 10px 30px -10px rgba(108, 28, 255, 0.05)',
                        'hover': '0 20px 40px -10px rgba(108, 28, 255, 0.15)',
                        'purple': '0 10px 40px -10px rgba(108, 28, 255, 0.2)'
                },
                keyframes: {
                        'accordion-down': {
                                from: {
                                        height: '0'
                                },
                                to: {
                                        height: 'var(--radix-accordion-content-height)'
                                }
                        },
                        'accordion-up': {
                                from: {
                                        height: 'var(--radix-accordion-content-height)'
                                },
                                to: {
                                        height: '0'
                                }
                        },
                        'fade-in': {
                                '0%': { opacity: '0', transform: 'translateY(10px)' },
                                '100%': { opacity: '1', transform: 'translateY(0)' }
                        },
                        'slide-in': {
                                '0%': { transform: 'translateX(-100%)' },
                                '100%': { transform: 'translateX(0)' }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'fade-in': 'fade-in 0.5s ease-out',
                        'slide-in': 'slide-in 0.3s ease-out'
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};