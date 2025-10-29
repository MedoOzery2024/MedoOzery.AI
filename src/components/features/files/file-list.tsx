'use client';

import React from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  doc,
} from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Trash2, File as FileIcon, Download, Loader2, FolderOpen } from 'lucide-react';
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
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Skeleton } from '@/components/ui/skeleton';

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

const FileListSkeleton = () => (
    <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-white/10">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </div>
        ))}
    </div>
);


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
    // Construct the storage reference from the full download URL
    const storageRef = ref(storage, file.storageLocation);

    try {
      // First, delete the file from Storage
      await deleteObject(storageRef);
      // Then, delete the document from Firestore
      deleteDocumentNonBlocking(fileDocRef);

      toast({
        title: 'تم الحذف بنجاح',
        description: `تم حذف ملف "${file.fileName}" نهائياً.`,
      });
    } catch (e: any) {
      console.error('Error deleting file:', e);
       if (e.code === 'storage/object-not-found') {
        // If file doesn't exist in storage, just delete the firestore doc
        deleteDocumentNonBlocking(fileDocRef);
        toast({
            variant: 'default',
            title: 'تم حذف البيانات',
            description: `تم حذف بيانات الملف "${file.fileName}"، لكن الملف لم يكن موجوداً في وحدة التخزين.`,
        });
      } else {
        toast({
            variant: 'destructive',
            title: 'حدث خطأ',
            description: e.message || 'لا يمكن حذف الملف.',
        });
      }
    }
  };

  if (isLoading) {
    return <FileListSkeleton />;
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
              <div key={file.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-white/10 hover:border-primary/50 transition-colors duration-300">
                <div className="flex items-center gap-3 overflow-hidden">
                    <FileIcon className="h-6 w-6 text-primary flex-shrink-0" />
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-medium truncate">{file.fileName}</span>
                        <span className="text-xs text-muted-foreground">
                            {formatBytes(file.fileSize)} - {new Date(file.uploadDate).toLocaleDateString('ar-EG')}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <a href={file.storageLocation} target="_blank" rel="noopener noreferrer" download={file.fileName}>
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
            <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">لم يتم رفع أي ملفات بعد.</p>
            <p className="text-xs text-muted-foreground/70">ابدأ برفع ملفك الأول.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
