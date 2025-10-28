'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Square, Loader2, Save, FileDown, BrainCircuit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function VoiceTranscription() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [summarizedText, setSummarizedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [audioFileName, setAudioFileName] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Check for microphone permission on component mount
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        setHasPermission(true);
        // We need to stop the track immediately, we only wanted to check for permission
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(err => {
        setHasPermission(false);
        console.error("Microphone permission denied:", err);
      });
  }, []);

  const handleStartRecording = async () => {
    if (isRecording) return;
    if (!hasPermission) {
        toast({
            variant: 'destructive',
            title: 'Permission Denied',
            description: 'Microphone access is required for recording. Please enable it in your browser settings.',
        });
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            // Here we would normally send the audioBlob to the transcription service
            setIsTranscribing(true);
            setTranscribedText("... (محاكاة) يتم الآن تحويل الصوت إلى نص ...");
            // Simulate transcription delay
            setTimeout(() => {
                setTranscribedText("مرحباً بكم في خدمة النسخ الصوتي. هذه هي نتيجة تحويل التسجيل الصوتي إلى نص مكتوب. يمكنك الآن تلخيص هذا النص أو حفظه.");
                setIsTranscribing(false);
            }, 2000);
            
            stream.getTracks().forEach(track => track.stop()); // Stop the microphone access
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        toast({ title: 'Recording Started', description: 'The microphone is now active.' });
    } catch (error) {
        console.error("Error starting recording:", error);
        toast({
            variant: 'destructive',
            title: 'Recording Error',
            description: 'Could not start recording. Please check your microphone.',
        });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: 'Recording Stopped', description: 'Processing audio...' });
    }
  };

  const handleSummarize = () => {
      if (!transcribedText || isSummarizing) return;
      setIsSummarizing(true);
      setSummarizedText("... (محاكاة) جارٍ تلخيص النص ...");
      // Simulate summarization delay
      setTimeout(() => {
          setSummarizedText("هذا هو ملخص النص المستخرج من التسجيل الصوتي.");
          setIsSummarizing(false);
      }, 1500);
  };

  const handleSaveRecording = () => {
      if(audioChunksRef.current.length === 0 || !audioFileName.trim()) {
          toast({
              variant: 'destructive',
              title: 'خطأ في الحفظ',
              description: 'لا يوجد تسجيل صوتي أو لم يتم إدخال اسم للملف.',
          });
          return;
      }
      toast({
          title: 'تم الحفظ (محاكاة)',
          description: `تم حفظ الملف الصوتي باسم "${audioFileName}".`,
      });
  };

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardContent className="p-0 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isRecording ? (
                <Button onClick={handleStartRecording} disabled={!hasPermission || isTranscribing} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                    <Mic className="ml-2" />
                    بدء التسجيل
                </Button>
            ) : (
                <Button onClick={handleStopRecording} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white">
                    <Square className="ml-2" />
                    إيقاف التسجيل
                </Button>
            )}
             {isRecording && <Badge variant="destructive" className="animate-pulse">يسجل الآن...</Badge>}
        </div>
        {!hasPermission && (
             <p className="text-center text-sm text-yellow-500">
                تحذير: الوصول إلى الميكروفون معطل. يرجى تفعيل الإذن في متصفحك.
            </p>
        )}

        <div className="space-y-4">
            <Label htmlFor="transcribed-text">النص المستخرج</Label>
            <div className="relative">
                <Textarea
                    id="transcribed-text"
                    placeholder="سيظهر النص الذي تم تحويله من الصوت هنا..."
                    value={transcribedText}
                    readOnly
                    className="h-40 bg-background/50"
                />
                {isTranscribing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
            </div>
        </div>

        <Button onClick={handleSummarize} disabled={!transcribedText || isTranscribing || isSummarizing} className="w-full">
            {isSummarizing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="ml-2" />}
            تلخيص النص
        </Button>
        
        <div className="space-y-4">
            <Label htmlFor="summarized-text">الملخص</Label>
             <div className="relative">
                <Textarea
                    id="summarized-text"
                    placeholder="سيظهر النص الملخص هنا..."
                    value={summarizedText}
                    readOnly
                    className="h-28 bg-background/50"
                />
                {isSummarizing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
            </div>
        </div>

        <div className="space-y-4 rounded-lg border border-white/10 p-4">
            <h4 className="font-semibold text-center">حفظ وتصدير</h4>
            <div className="flex flex-col sm:flex-row gap-4">
                <Input 
                    type="text" 
                    placeholder="أدخل اسم الملف الصوتي..." 
                    value={audioFileName}
                    onChange={(e) => setAudioFileName(e.target.value)}
                    className="flex-grow bg-background/50"
                />
                <Button onClick={handleSaveRecording} disabled={audioChunksRef.current.length === 0} className="w-full sm:w-auto">
                    <Save className="ml-2" />
                    حفظ التسجيل
                </Button>
            </div>
             <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                <p className="text-sm text-muted-foreground w-full text-center mb-2">تصدير النص كـ:</p>
                <Button variant="outline" size="sm" disabled={!transcribedText}>
                    <FileDown className="ml-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" disabled={!transcribedText}>
                    <FileDown className="ml-1" /> Word
                </Button>
                <Button variant="outline" size="sm" disabled={!transcribedText}>
                    <FileDown className="ml-1" /> Text
                </Button>
            </div>
        </div>

      </CardContent>
    </Card>
  );
}

// Re-add Label component as it might be used here.
import { Label } from '@/components/ui/label';
