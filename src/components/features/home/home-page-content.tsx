'use client';

import { useUser } from '@/firebase/auth/use-user';
import { useAuth } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { ClockDisplay } from '@/components/features/clock/clock-display';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { AiChat } from '@/components/features/ai/ai-chat';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Bot, FileText, Mic, Image as ImageIcon, HelpCircle } from 'lucide-react';
import { VoiceTranscription } from '@/components/features/voice/voice-transcription';
import { ImageToPdfConverter } from '@/components/features/pdf/image-to-pdf-converter';
import { QuestionGenerator } from '@/components/features/ai/question-generator';

export function HomePageContent() {
  const { user, isLoading: isUserLoading } = useUser();
  const auth = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!user && !isUserLoading && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  if (!isClient || isUserLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>جارٍ التحميل...</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-start justify-start p-4 sm:p-6 md:p-8 bg-background text-foreground overflow-hidden">
        <div className="absolute top-0 right-0 bottom-0 left-0 bg-black/90 z-[-2]"></div>
        <div className="absolute top-0 right-0 bottom-0 left-0 bg-[radial-gradient(circle_800px_at_100%_200px,#4f46e520,transparent)] z-[-1]"></div>

      <header className="w-full flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 border-2 border-primary/50 rounded-lg flex items-center justify-center">
            <FileText className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Medo.Ai</h1>
        </div>
      </header>

      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 w-full">
          <ClockDisplay />
        </div>
        <div className="lg:col-span-2 w-full space-y-6">
          {user ? (
            <Accordion type="single" collapsible defaultValue="item-2" className="w-full space-y-6">
              <AccordionItem value="item-2" className="border-none">
                <div className="bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl shadow-lg transition-all duration-300 hover:border-primary/50">
                  <AccordionTrigger className="text-xl font-semibold px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Bot className="h-6 w-6 text-primary" />
                      <span>مساعد الذكاء الاصطناعي</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2 pb-6 px-6">
                      <AiChat />
                    </div>
                  </AccordionContent>
                </div>
              </AccordionItem>
               <AccordionItem value="item-5" className="border-none">
                <div className="bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl shadow-lg transition-all duration-300 hover:border-primary/50">
                  <AccordionTrigger className="text-xl font-semibold px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-6 w-6 text-primary" />
                      <span>مولد الأسئلة</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2 pb-6 px-6">
                      <QuestionGenerator />
                    </div>
                  </AccordionContent>
                </div>
              </AccordionItem>
              <AccordionItem value="item-3" className="border-none">
                <div className="bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl shadow-lg transition-all duration-300 hover:border-primary/50">
                  <AccordionTrigger className="text-xl font-semibold px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Mic className="h-6 w-6 text-primary" />
                      <span>النسخ الصوتي</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2 pb-6 px-6">
                      <VoiceTranscription />
                    </div>
                  </AccordionContent>
                </div>
              </AccordionItem>
              <AccordionItem value="item-4" className="border-none">
                <div className="bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl shadow-lg transition-all duration-300 hover:border-primary/50">
                  <AccordionTrigger className="text-xl font-semibold px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="h-6 w-6 text-primary" />
                      <span>تحويل الصور إلى PDF</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2 pb-6 px-6">
                      <ImageToPdfConverter userId={user.uid} />
                    </div>
                  </AccordionContent>
                </div>
              </AccordionItem>
            </Accordion>
          ) : (
             <div className="text-center p-8 bg-card/80 rounded-xl border border-white/10">
              <p className="mb-4 text-muted-foreground">
                الرجاء تسجيل الدخول لعرض الميزات.
              </p>
              <Button onClick={() => auth && initiateAnonymousSignIn(auth)}>
                تسجيل دخول مجهول
              </Button>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center mt-12 w-full">
        <p className="text-sm font-body text-muted-foreground" dir="rtl">
          مطور الموقع: محمود محمد محمود أبو الفتوح أحمد العزيري
        </p>
      </footer>
    </main>
  );
}
