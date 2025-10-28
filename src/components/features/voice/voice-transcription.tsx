'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Square, Loader2, Save, FileDown, BrainCircuit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { transcribe, summarizeTranscribedText } from '@/ai/flows/transcribe';
import { jsPDF } from "jspdf";
import 'jspdf-autotable'; // Ensure this is imported for auto-table functionality
import { saveAs } from 'file-saver';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, doc, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


// Extend jsPDF with autoTable - this is a bit of a hack for module augmentation
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export function VoiceTranscription() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [summarizedText, setSummarizedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        setHasPermission(true);
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(err => {
        setHasPermission(false);
        console.error("Microphone permission denied:", err);
      });
  }, []);

  const fileToDataUri = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to read file as Data URI'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleStartRecording = async () => {
    if (isRecording || hasPermission === false) {
      if(hasPermission === false) {
          toast({
              variant: 'destructive',
              title: 'Permission Denied',
              description: 'Microphone access is required. Please enable it in your browser settings.',
          });
      }
      return;
    }

    setTranscribedText('');
    setSummarizedText('');
    setAudioBlob(null);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setAudioBlob(audioBlob);
            setIsTranscribing(true);

            try {
              const audioDataUri = await fileToDataUri(audioBlob);
              const result = await transcribe({ audioDataUri });
              setTranscribedText(result.text);
            } catch (e: any) {
              console.error(e);
              toast({
                  variant: 'destructive',
                  title: 'Transcription Error',
                  description: 'Failed to transcribe audio. Please try again.',
              });
              setTranscribedText('فشل النسخ الصوتي.');
            } finally {
              setIsTranscribing(false);
            }
            
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        toast({ title: 'بدء التسجيل', description: 'الميكروفون نشط الآن.' });
    } catch (error) {
        console.error("Error starting recording:", error);
        toast({
            variant: 'destructive',
            title: 'خطأ في التسجيل',
            description: 'لا يمكن بدء التسجيل. يرجى التحقق من الميكروفون.',
        });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: 'توقف التسجيل', description: 'تتم معالجة الصوت...' });
    }
  };

  const handleSummarize = async () => {
      if (!transcribedText || isSummarizing) return;
      setIsSummarizing(true);
      setSummarizedText('');
      try {
        const result = await summarizeTranscribedText({ text: transcribedText });
        setSummarizedText(result.summary);
      } catch(e: any) {
        console.error(e);
        toast({
            variant: 'destructive',
            title: 'خطأ في التلخيص',
            description: 'فشل تلخيص النص.',
        });
      } finally {
        setIsSummarizing(false);
      }
  };

  const handleSaveRecording = async () => {
      if(!audioBlob || !audioFileName.trim() || !user || !firestore) {
          toast({
              variant: 'destructive',
              title: 'خطأ في الحفظ',
              description: 'لا يوجد تسجيل صوتي أو لم يتم إدخال اسم للملف.',
          });
          return;
      }
      
      const storage = getStorage();
      const storagePath = `user-uploads/${user.uid}/audio/${audioFileName}.webm`;
      const storageRef = ref(storage, storagePath);
      
      try {
        await uploadBytes(storageRef, audioBlob);
        const downloadURL = await getDownloadURL(storageRef);

        const collectionRef = collection(firestore, `users/${user.uid}/uploadedFiles`);
        const fileData = {
          fileName: `${audioFileName}.webm`,
          fileType: 'audio/webm',
          fileSize: audioBlob.size,
          uploadDate: new Date().toISOString(),
          storageLocation: downloadURL,
          userId: user.uid,
        };
        await addDoc(collectionRef, fileData);

        toast({
            title: 'تم الحفظ بنجاح',
            description: `تم حفظ الملف الصوتي باسم "${audioFileName}.webm".`,
        });
        setAudioFileName('');

      } catch (error: any) {
         errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
              path: `users/${user.uid}/uploadedFiles`,
              operation: 'create',
              requestResourceData: { fileName: audioFileName },
            })
          );
      }
  };
  
  const handleExport = (format: 'pdf' | 'txt') => {
    const content = `النص الأصلي:\n${transcribedText}\n\nالملخص:\n${summarizedText}`;
    if (format === 'txt') {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, 'transcription.txt');
    } else if (format === 'pdf') {
        const doc = new jsPDF() as jsPDFWithAutoTable;
        // You might need a font that supports Arabic characters
        doc.text(content, 10, 10);
        doc.save('transcription.pdf');
    }
  }


  if (hasPermission === null) {
      return (
          <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="ml-2">جاري التحقق من إذن الميكروفون...</p>
          </div>
      )
  }

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardContent className="p-0 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isRecording ? (
                <Button onClick={handleStartRecording} disabled={hasPermission === false || isTranscribing} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
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
        {hasPermission === false && (
             <p className="text-center text-sm text-yellow-500">
                تحذير: الوصول إلى الميكروفون معطل. يرجى تفعيل الإذن في متصفحك.
            </p>
        )}

        <div className="space-y-2">
            <Label htmlFor="transcribed-text">النص المستخرج</Label>
            <div className="relative">
                <Textarea
                    id="transcribed-text"
                    placeholder="سيظهر النص الذي تم تحويله من الصوت هنا..."
                    value={transcribedText}
                    onChange={(e) => setTranscribedText(e.target.value)}
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
        
        <div className="space-y-2">
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
                    disabled={!audioBlob}
                />
                <Button onClick={handleSaveRecording} disabled={!audioBlob || !audioFileName.trim() } className="w-full sm:w-auto">
                    <Save className="ml-2" />
                    حفظ التسجيل
                </Button>
            </div>
             <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                <p className="text-sm text-muted-foreground w-full text-center mb-2">تصدير النص كـ:</p>
                <Button variant="outline" size="sm" disabled={!transcribedText} onClick={() => handleExport('pdf')}>
                    <FileDown className="ml-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" disabled={!transcribedText} onClick={() => handleExport('txt')}>
                    <FileDown className="ml-1" /> Text
                </Button>
            </div>
        </div>

      </CardContent>
    </Card>
  );
}
