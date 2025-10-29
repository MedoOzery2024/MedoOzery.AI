'use client';

import React, { useState, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, File, X, Loader2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDropzone } from 'react-dropzone';

interface FileUploaderProps {
  userId: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
}

export function FileUploader({ userId }: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const firestore = useFirestore();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !firestore || !userId) return;

    setUploading(true);
    setUploadProgress(files.map(f => ({ fileName: f.name, progress: 0 })));

    const uploadPromises = files.map((file, index) => {
      return new Promise<void>((resolve, reject) => {
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
            setUploadProgress(prev => {
              const newProgress = [...prev];
              if (newProgress[index]) {
                newProgress[index] = { ...newProgress[index], progress: prog };
              }
              return newProgress;
            });
          },
          (error) => {
            console.error(error);
            toast({
              variant: 'destructive',
              title: `فشل رفع: ${file.name}`,
              description: error.message,
            });
            reject(error);
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
              const collectionRef = collection(firestore, `users/${userId}/uploadedFiles`);
              const newDocRef = doc(collectionRef);
              
              const fileData = {
                id: newDocRef.id,
                fileName: file.name,
                fileType: file.type || 'application/octet-stream',
                fileSize: file.size,
                uploadDate: new Date().toISOString(),
                storageLocation: downloadURL,
                userId,
              };

              setDoc(newDocRef, fileData)
                .then(() => {
                  resolve();
                })
                .catch((error) => {
                   console.error("Firestore Error:", error);
                   toast({
                     variant: "destructive",
                     title: `خطأ في حفظ: ${file.name}`,
                     description: "لم نتمكن من حفظ معلومات الملف. قد تكون هناك مشكلة في الصلاحيات.",
                   });
                   errorEmitter.emit(
                     'permission-error',
                     new FirestorePermissionError({
                       path: newDocRef.path,
                       operation: 'create',
                       requestResourceData: fileData,
                     })
                   );
                   reject(error);
                });
            }).catch(reject);
          }
        );
      });
    });

    const results = await Promise.allSettled(uploadPromises);
    
    const successfulUploads = results.filter(r => r.status === 'fulfilled').length;
    if (successfulUploads > 0) {
        toast({
            title: 'اكتمل الرفع!',
            description: `تم رفع ${successfulUploads} من ${files.length} ملف بنجاح.`,
        });
    }

    setUploading(false);
    setFiles([]);
    setUploadProgress([]);
  };

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg">رفع ملفات جديدة</CardTitle>
        <CardDescription>اسحب وأفلت الملفات هنا أو انقر للاختيار.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div 
          {...getRootProps()}
          className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/20 transition-colors
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-white/10'}
          ${uploading ? 'cursor-not-allowed opacity-50' : ''}`}>
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center justify-center text-center">
              <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-sm font-semibold text-primary">أفلت الملفات هنا...</p>
              ) : (
                <>
                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">انقر للاختيار</span> أو اسحب الملفات</p>
                    <p className="text-xs text-muted-foreground">يمكن رفع أي نوع من الملفات</p>
                </>
              )}
          </div>
        </div>

        {files.length > 0 && !uploading && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">الملفات المحددة:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <File className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm truncate" title={file.name}>{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">({(file.size / (1024*1024)).toFixed(2)} MB)</span>
                    </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFile(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploading && (
            <div className="space-y-3">
                {uploadProgress.map((item, index) => (
                    <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center">
                           <span className="text-sm font-medium truncate">{item.fileName}</span>
                           <span className="text-xs text-muted-foreground">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="w-full h-2" />
                    </div>
                ))}
            </div>
        )}


        {files.length > 0 && (
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setFiles([])} className="text-destructive hover:text-destructive" disabled={uploading}>
                إلغاء الكل
            </Button>
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
            >
              {uploading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <UploadCloud className="ml-2 h-4 w-4" />}
              {uploading ? `جارٍ الرفع...` : `رفع ${files.length} ملف`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
