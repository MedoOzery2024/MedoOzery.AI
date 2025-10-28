'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2, File as FileIcon, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface UploadedFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  storageLocation: string;
}

interface FileListProps {
  userId: string;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function FileList({ userId }: FileListProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const filesQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(
      collection(firestore, `users/${userId}/uploadedFiles`),
      orderBy('uploadDate', 'desc')
    );
  }, [firestore, userId]);

  const {
    data: files,
    isLoading,
    error,
  } = useCollection<UploadedFile>(filesQuery);

  const handleDelete = async (file: UploadedFile) => {
    if (!firestore || !userId) return;

    const storage = getStorage();
    const fileDocRef = doc(firestore, `users/${userId}/uploadedFiles`, file.id);
    const storageRef = ref(storage, file.storageLocation);

    try {
      await deleteObject(storageRef);
      deleteDocumentNonBlocking(fileDocRef);

      toast({
        title: 'تم الحذف بنجاح',
        description: `تم حذف ملف "${file.fileName}" نهائياً.`,
      });
    } catch (e: any) {
      console.error('Error deleting file:', e);
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: e.message || 'لا يمكن حذف الملف.',
      });
    }
  };

  if (isLoading) {
    return (
       <div className="space-y-3">
        <div className="flex items-center space-x-4 animate-pulse">
            <div className="h-12 w-12 bg-muted rounded-lg"></div>
            <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
        </div>
        <div className="flex items-center space-x-4 animate-pulse">
            <div className="h-12 w-12 bg-muted rounded-lg"></div>
            <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive p-4 bg-destructive/10 rounded-lg">
        خطأ في تحميل الملفات: {error.message}
      </div>
    );
  }

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg">قائمة الملفات</CardTitle>
        <CardDescription>هنا تظهر جميع ملفاتك التي تم رفعها.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {files && files.length > 0 ? (
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-white/10">
                <div className="flex items-center gap-3">
                    <FileIcon className="h-6 w-6 text-primary" />
                    <div className="flex flex-col">
                        <span className="font-medium">{file.fileName}</span>
                        <span className="text-xs text-muted-foreground">
                            {formatBytes(file.fileSize)} - {new Date(file.uploadDate).toLocaleDateString('ar-EG')}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <a href={file.storageLocation} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon">
                            <Download className="h-5 w-5" />
                        </Button>
                    </a>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
                            <AlertDialogDescription>
                              هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف
                              الملف بشكل دائم من خوادمنا.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(file)} className="bg-destructive hover:bg-destructive/80">
                              تأكيد الحذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-white/10 rounded-lg">
            <FileIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">لم يتم رفع أي ملفات بعد.</p>
            <p className="text-xs text-muted-foreground/70">ابدأ برفع ملفك الأول.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
