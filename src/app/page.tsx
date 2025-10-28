import { ClockDisplay } from '@/components/features/clock/clock-display';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute bottom-0 left-[-20%] right-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-primary/20 to-accent/20 opacity-50 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[20%] top-[-10%] h-[300px] w-[300px] rounded-full bg-gradient-to-tl from-accent/20 to-primary/20 opacity-40 blur-[100px]"></div>
      </div>
      <div className="relative z-10 flex flex-col items-center space-y-12">
        <ClockDisplay />
        <footer className="text-center">
          <p className="text-lg font-body text-muted-foreground" dir="rtl">
            مطور الموقع:
          </p>
          <p className="text-2xl font-headline text-primary" dir="rtl">
            محمود محمد محمود أبو الفتوح أحمد العزيري
          </p>
        </footer>
      </div>
    </main>
  );
}
