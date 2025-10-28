'use client';

import React, { useState, useRef } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { ImageUp, FileSignature, Loader2, X, File, Download } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import Image from 'next/image';

interface ImageToPdfConverterProps {
  userId: string;
}

export function ImageToPdfConverter({ userId }: ImageToPdfConverterProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [pdfFileName, setPdfFileName] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      if(imageFiles.length !== files.length) {
          toast({
              variant: 'destructive',
              title: 'ملفات غير صالحة',
              description: 'يرجى تحديد ملفات صور فقط.',
          });
      }
      setSelectedImages(prev => [...prev, ...imageFiles]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleConvertAndUpload = async () => {
    if (selectedImages.length === 0 || !pdfFileName.trim() || !firestore || !userId) {
        toast({
            variant: 'destructive',
            title: 'معلومات ناقصة',
            description: 'الرجاء اختيار صورة واحدة على الأقل وإدخال اسم لملف الـ PDF.',
        });
      return;
    }

    setIsConverting(true);
    setProgress(0);
    toast({ title: 'بدء التحويل', description: 'جارٍ تحويل الصور إلى ملف PDF...' });

    try {
        const doc = new jsPDF();
        
        for(let i = 0; i < selectedImages.length; i++) {
            const image = selectedImages[i];
            const reader = new FileReader();

            await new Promise<void>((resolve) => {
                reader.onload = (e) => {
                    const imgData = e.target?.result as string;
                    const img = new window.Image();
                    img.src = imgData;
                    img.onload = () => {
                        const pdfWidth = doc.internal.pageSize.getWidth();
                        const pdfHeight = doc.internal.pageSize.getHeight();
                        const ratio = Math.min(pdfWidth / img.width, pdfHeight / img.height);
                        const imgWidth = img.width * ratio;
                        const imgHeight = img.height * ratio;
                        const x = (pdfWidth - imgWidth) / 2;
                        const y = (pdfHeight - imgHeight) / 2;

                        if (i > 0) doc.addPage();
                        doc.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
                        setProgress(Math.round(((i + 1) / selectedImages.length) * 50));
                        resolve();
                    };
                };
                reader.readAsDataURL(image);
            });
        }

        const pdfDataUri = doc.output('datauristring');
        
        // --- Download ---
        const finalFileName = `${pdfFileName.trim()}.pdf`;
        saveAs(pdfDataUri, finalFileName);
        toast({ title: 'اكتمل التحميل', description: `تم تنزيل ملف "${finalFileName}" إلى جهازك.` });

        // --- Upload to Firebase ---
        setProgress(75);
        toast({ title: 'بدء الرفع', description: 'جارٍ رفع الملف إلى الموقع...' });
        const storage = getStorage();
        const storagePath = `user-uploads/${userId}/pdf/${finalFileName}`;
        const storageRef = ref(storage, storagePath);

        const uploadTask = await uploadString(storageRef, pdfDataUri, 'data_url');
        const downloadURL = await getDownloadURL(uploadTask.ref);
        
        const fileData = {
            fileName: finalFileName,
            fileType: 'application/pdf',
            fileSize: uploadTask.metadata.size || 0,
            uploadDate: new Date().toISOString(),
            storageLocation: downloadURL,
            userId,
        };

        const collectionRef = collection(firestore, `users/${userId}/uploadedFiles`);
        
        addDoc(collectionRef, fileData)
          .then(() => {
            toast({
                title: 'نجح الرفع!',
                description: `تم حفظ ملف "${finalFileName}" في حسابك.`,
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
          });

    } catch (error: any) {
        console.error("Conversion or Upload Error:", error);
        toast({
            variant: 'destructive',
            title: 'حدث خطأ',
            description: error.message || 'فشل تحويل الصور أو رفع الملف.',
        });
    } finally {
        setIsConverting(false);
        setProgress(0);
        setSelectedImages([]);
        setPdfFileName('');
    }
  };

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardContent className="p-0 space-y-4">
        <div 
          onClick={triggerFileSelect} 
          className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/20 transition-colors">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*" disabled={isConverting}/>
          
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <ImageUp className="w-8 h-8 mb-4 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">اختر مجموعة صور</span></p>
              <p className="text-xs text-muted-foreground">سيتم تحويلها إلى ملف PDF واحد</p>
          </div>
        </div>

        {selectedImages.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {selectedImages.map((file, index) => (
                    <div key={index} className="relative group aspect-square">
                        <Image src={URL.createObjectURL(file)} alt={`preview ${index}`} fill className="object-cover rounded-md" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => removeImage(index)} disabled={isConverting}>
                                <X className="h-4 w-4"/>
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {selectedImages.length > 0 && (
            <div className="flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-muted-foreground"/>
                <Input 
                    type="text"
                    placeholder="أدخل اسم ملف الـ PDF هنا..."
                    value={pdfFileName}
                    onChange={(e) => setPdfFileName(e.target.value)}
                    disabled={isConverting}
                    className="flex-grow bg-background/80 border-2 border-white/10 focus:border-primary"
                />
            </div>
        )}

        {isConverting && <Progress value={progress} className="w-full h-2" />}

        {selectedImages.length > 0 && (
            <Button onClick={handleConvertAndUpload} disabled={isConverting || !pdfFileName.trim()}>
                {isConverting ? (
                    <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        {progress < 50 ? 'جارٍ التحويل...' : 'جارٍ الرفع...'}
                    </>
                ) : (
                    <>
                        <Download className="ml-2 h-4 w-4" />
                        تحويل، حفظ، وتنزيل
                    </>
                )}
            </Button>
        )}
      </CardContent>
    </Card>
  );
}
