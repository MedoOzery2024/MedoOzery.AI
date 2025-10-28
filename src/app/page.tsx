'use client';

import { useAuth, useUser } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { ClockDisplay } from '@/components/features/clock/clock-display';
import { FileUploader } from '@/components/features/files/file-uploader';
import { FileList } from '@/components/features/files/file-list';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { AiChat } from '@/components/features/ai/ai-chat';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  useEffect(() => {
    if (!user && !isUserLoading) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  if (isUserLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>جارٍ التحميل...</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-start p-4 bg-background text-foreground overflow-hidden pt-12">
      <div className="absolute inset-0 z-0">
        <div className="absolute bottom-0 left-[-20%] right-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-primary/20 to-accent/20 opacity-50 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[20%] top-[-10%] h-[300px] w-[300px] rounded-full bg-gradient-to-tl from-accent/20 to-primary/20 opacity-40 blur-[100px]"></div>
      </div>
      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center space-y-12">
        <ClockDisplay />

        {user ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
            <div className="space-y-8">
              <FileUploader userId={user.uid} />
              <FileList userId={user.uid} />
            </div>
            <AiChat />
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-4">
              الرجاء تسجيل الدخول لعرض الملفات والتحميل.
            </p>
            <Button onClick={() => initiateAnonymousSignIn(auth)}>
              تسجيل دخول مجهول
            </Button>
          </div>
        )}

        <footer className="text-center mt-12">
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
