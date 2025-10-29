'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { ImageUp, FileSignature, Loader2, X, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import Image from 'next/image';

export function ImageToPdfConverter() {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [pdfFileName, setPdfFileName] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
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

  const handleConvertAndDownload = async () => {
    if (selectedImages.length === 0 || !pdfFileName.trim()) {
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
                        setProgress(Math.round(((i + 1) / selectedImages.length) * 100));
                        resolve();
                    };
                };
                reader.readAsDataURL(image);
            });
        }

        const pdfDataUri = doc.output('datauristring');
        const finalFileName = `${pdfFileName.trim()}.pdf`;
        saveAs(pdfDataUri, finalFileName);
        
        toast({ title: 'اكتمل التحويل', description: `تم تنزيل ملف "${finalFileName}" إلى جهازك بنجاح.` });

    } catch (error: any) {
        console.error("Conversion Error:", error);
        toast({
            variant: 'destructive',
            title: 'حدث خطأ',
            description: error.message || 'فشل تحويل الصور إلى PDF.',
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
            <Button onClick={handleConvertAndDownload} disabled={isConverting || !pdfFileName.trim()}>
                {isConverting ? (
                    <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        {'جارٍ التحويل...'}
                    </>
                ) : (
                    <>
                        <Download className="ml-2 h-4 w-4" />
                        تحويل وتنزيل
                    </>
                )}
            </Button>
        )}
      </CardContent>
    </Card>
  );
}
