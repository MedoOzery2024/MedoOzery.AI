'use client';

import React, { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, File, X } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface FileUploaderProps {
  userId: string;
}

export function FileUploader({ userId }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  }

  const handleUpload = async () => {
    if (!file || !firestore || !userId) return;

    setUploading(true);
    setProgress(0);

    const storage = getStorage();
    const storagePath = `user-uploads/${userId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const prog = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(prog);
      },
      (error) => {
        console.error(error);
        setUploading(false);
        toast({
          variant: 'destructive',
          title: 'فشل الرفع',
          description: error.message,
        });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
          const collectionRef = collection(
            firestore,
            `users/${userId}/uploadedFiles`
          );
          const fileData = {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            uploadDate: new Date().toISOString(),
            storageLocation: downloadURL, // Store URL from Firebase Storage
            userId,
          };

          addDoc(collectionRef, fileData)
            .then(() => {
              toast({
                title: 'نجح الرفع!',
                description: `تم رفع ملف "${file.name}" بنجاح.`,
              });
            })
            .catch((error) => {
              console.error("Firestore Error:", error);
              toast({
                variant: "destructive",
                title: "خطأ في قاعدة البيانات",
                description: "لم نتمكن من حفظ معلومات الملف. قد تكون هناك مشكلة في الصلاحيات.",
              });
              errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                  path: collectionRef.path,
                  operation: 'create',
                  requestResourceData: fileData,
                })
              );
            })
            .finally(() => {
              setUploading(false);
              setFile(null);
              setProgress(0);
              if (fileInputRef.current) {
                  fileInputRef.current.value = "";
              }
            });
        });
      }
    );
  };

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg">رفع ملف جديد</CardTitle>
        <CardDescription>اختر ملفًا من جهازك لرفعه.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div 
          onClick={!file ? triggerFileSelect : undefined} 
          className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/20 transition-colors
          ${uploading ? 'cursor-not-allowed' : ''}`}>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={uploading}/>
          
          {file ? (
            <div className="p-4 text-center">
              <File className="mx-auto h-8 w-8 text-primary"/>
              <p className="mt-2 text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{ (file.size / (1024*1024)).toFixed(2) } MB</p>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">انقر للاختيار</span> أو اسحب الملف</p>
                <p className="text-xs text-muted-foreground">PDF, DOC, PPT, TXT, الصور (JPG, PNG, ...)</p>
            </div>
          )}
        </div>

        {uploading && <Progress value={progress} className="w-full h-2" />}

        {file && !uploading && (
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="text-destructive hover:text-destructive">
                <X className="w-4 h-4 mr-2" />
                إلغاء
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full sm:w-auto"
            >
              <UploadCloud className="ml-2 h-4 w-4" />
              {uploading ? `جارٍ الرفع...` : 'تأكيد ورفع الملف'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
