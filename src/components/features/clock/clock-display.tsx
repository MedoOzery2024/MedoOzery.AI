"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';

function LoadingSkeleton() {
    return (
        <Card className="w-full max-w-md mx-auto animate-pulse bg-card/80 backdrop-blur-sm">
            <CardHeader>
                <div className="h-10 bg-muted rounded-md w-2/3 mx-auto"></div>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4 px-4 pb-4 md:px-6 md:pb-6">
                <div className="h-20 bg-muted rounded-xl w-full"></div>
                <Separator className="my-4" />
                <div className="w-full text-center space-y-3">
                    <div className="h-8 bg-muted rounded-md w-1/3 mx-auto"></div>
                    <div className="h-7 bg-muted rounded-md w-2/3 mx-auto"></div>
                    <div className="h-7 bg-muted rounded-md w-2/3 mx-auto"></div>
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
    <Card className="w-full max-w-md mx-auto bg-card/80 backdrop-blur-sm shadow-2xl border-primary/10 transition-all duration-300 hover:shadow-primary/20">
      <CardHeader>
        <CardTitle className="text-center text-4xl font-headline text-primary tracking-wider">
          Medo.Ai
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4 px-4 pb-4 md:px-6 md:pb-6">
        <div className="text-5xl sm:text-6xl md:text-7xl font-bold font-mono text-primary-foreground bg-primary/90 p-4 rounded-xl shadow-inner w-full text-center">
          {digitalTime}
        </div>
        <Separator className="my-4" />
        <div className="w-full text-center space-y-2 text-lg md:text-xl text-foreground/90">
          <p className="font-bold text-2xl text-primary">{currentDay}</p>
          <p>{gregorianDate}</p>
          <p dir="rtl">{hijriDate}</p>
        </div>
      </CardContent>
    </Card>
  );
}
