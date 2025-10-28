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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud } from 'lucide-react';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

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

          try {
            await addDoc(collectionRef, fileData);

            toast({
              title: 'نجح الرفع!',
              description: `تم رفع ملف "${file.name}" بنجاح.`,
            });
          } catch (error) {
             errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                  path: collectionRef.path,
                  operation: 'create',
                  requestResourceData: fileData,
                })
              );
          } finally {
            setUploading(false);
            setFile(null);
            setProgress(0);
          }
        });
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>رفع ملف جديد</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Input type="file" onChange={handleFileChange} className="flex-grow" disabled={uploading}/>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full sm:w-auto"
          >
            <UploadCloud className="ml-2 h-4 w-4" />
            {uploading ? `جارٍ الرفع... ${progress}%` : 'رفع الملف'}
          </Button>
        </div>
        {uploading && <Progress value={progress} className="w-full" />}
      </CardContent>
    </Card>
  );
}
