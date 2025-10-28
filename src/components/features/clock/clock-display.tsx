"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";

function LoadingSkeleton() {
    return (
        <Card className="w-full max-w-md mx-auto animate-pulse bg-card/80 backdrop-blur-sm border border-white/10">
            <CardContent className="flex flex-col items-center space-y-6 p-6">
                <div className="h-24 bg-muted/50 rounded-xl w-full"></div>
                <div className="w-full text-center space-y-4">
                    <div className="h-8 bg-muted/50 rounded-md w-1/3 mx-auto"></div>
                    <div className="h-7 bg-muted/50 rounded-md w-2/3 mx-auto"></div>
                    <div className="h-7 bg-muted/50 rounded-md w-2/3 mx-auto"></div>
                </div>
            </CardContent>
        </Card>
    );
}


export function ClockDisplay() {
  const [date, setDate] = useState<Date | null>(null);

  useEffect(() => {
    setDate(new Date()); 
    
    const timerId = setInterval(() => {
      setDate(new Date());
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  if (!date) {
    return <LoadingSkeleton />;
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };
  const digitalTime = date.toLocaleTimeString('en-US', timeOptions);

  const gregorianDateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const gregorianDate = date.toLocaleDateString('en-GB', gregorianDateOptions);

  const hijriDateOptions: Intl.DateTimeFormatOptions = {
    calendar: 'islamic-umalqura',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  const hijriDate = new Intl.DateTimeFormat('ar-SA', hijriDateOptions).format(date);

  const dayOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
  };
  const currentDay = date.toLocaleDateString('en-US', dayOptions);
  
  return (
    <Card className="w-full max-w-md mx-auto bg-card/80 backdrop-blur-sm shadow-2xl border border-white/10 transition-all duration-300 hover:border-primary/50">
      <CardContent className="flex flex-col items-center space-y-5 p-6">
        <div className="text-6xl sm:text-7xl md:text-8xl font-bold font-mono text-primary-foreground bg-primary p-4 rounded-xl shadow-lg w-full text-center tracking-wider">
          {digitalTime}
        </div>
        <div className="w-full text-center space-y-2 text-lg md:text-xl text-foreground">
          <p className="font-bold text-2xl text-primary">{currentDay}</p>
          <p className="text-foreground/80">{gregorianDate}</p>
          <p dir="rtl" className="text-foreground/80">{hijriDate}</p>
        </div>
      </CardContent>
    </Card>
  );
}
