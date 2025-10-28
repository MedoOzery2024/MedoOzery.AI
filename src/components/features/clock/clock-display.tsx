"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";

function LoadingSkeleton() {
    return (
        <Card className="w-full max-w-md mx-auto animate-pulse bg-card/80 backdrop-blur-sm border border-white/10">
            <CardContent className="flex flex-col items-center space-y-6 p-6">
                <div className="h-40 bg-muted/50 rounded-xl w-full"></div>
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
  const currentDay = date.toLocaleDateString('ar-SA', dayOptions);
  
  return (
    <Card className="w-full max-w-md mx-auto bg-card/80 backdrop-blur-sm shadow-2xl border border-white/10 transition-all duration-300 hover:border-primary/50">
      <CardContent className="p-4">
        <div className="text-primary-foreground bg-primary p-4 sm:p-6 rounded-xl shadow-lg w-full text-center">
            <div className="text-5xl sm:text-6xl md:text-7xl font-bold font-mono tracking-wider">
                {digitalTime}
            </div>
            <div className="mt-4 space-y-1 text-base md:text-lg text-primary-foreground/90">
                <p className="font-bold text-xl">{currentDay}</p>
                <p>{gregorianDate}</p>
                <p dir="rtl">{hijriDate}</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
