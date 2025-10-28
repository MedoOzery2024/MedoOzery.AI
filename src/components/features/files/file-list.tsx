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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2, File as FileIcon } from 'lucide-react';
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
      // Delete file from Cloud Storage
      await deleteObject(storageRef);
      // Delete document from Firestore
      await deleteDoc(fileDocRef);

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
      <Card>
        <CardHeader>
          <CardTitle>قائمة الملفات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-10 bg-muted rounded-md animate-pulse w-full"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse w-full"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="text-destructive">
        خطأ في تحميل الملفات: {error.message}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>قائمة الملفات المرفوعة</CardTitle>
      </CardHeader>
      <CardContent>
        {files && files.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الملف</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    النوع
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    الحجم
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    تاريخ الرفع
                  </TableHead>
                  <TableHead className="text-right">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                      <a
                        href={file.storageLocation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {file.fileName}
                      </a>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {file.fileType}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatBytes(file.fileSize)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {new Date(file.uploadDate).toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-5 w-5 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              هل أنت متأكد تماماً؟
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف
                              الملف بشكل دائم من خوادمنا.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(file)}>
                              تأكيد الحذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">لم يتم رفع أي ملفات بعد.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
