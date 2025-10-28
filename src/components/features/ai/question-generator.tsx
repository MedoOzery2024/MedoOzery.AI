'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, Image as ImageIcon, Sparkles, Loader2, HelpCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { generateQuestions, type GenerateQuestionsInput, type GenerateQuestionsOutput } from '@/ai/flows/generate-questions';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Helper function to read file as Data URI
const fileToDataUri = (file: File): Promise<string> => {
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

export function QuestionGenerator() {
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [generatedQuestions, setGeneratedQuestions] = useState<GenerateQuestionsOutput['questions']>([]);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!context.trim() && !selectedFile) {
        toast({
            variant: 'destructive',
            title: language === 'ar' ? 'محتوى مطلوب' : 'Content Required',
            description: language === 'ar' ? 'الرجاء إدخال نص أو رفع ملف لتوليد الأسئلة.' : 'Please enter text or upload a file to generate questions.',
        });
        return;
    }

    setIsLoading(true);
    setGeneratedQuestions([]);
    const currentFile = selectedFile;
    
    try {
        let fileDataUri: string | undefined = undefined;
        if (currentFile) {
            fileDataUri = await fileToDataUri(currentFile);
        }

        const input: GenerateQuestionsInput = {
            context: context,
            fileDataUri: fileDataUri,
            questionCount: questionCount,
            difficulty: difficulty,
            language: language,
        };

        const result = await generateQuestions(input);
        setGeneratedQuestions(result.questions);
        if(result.questions.length === 0){
             toast({
                title: language === 'ar' ? 'لم يتم توليد أسئلة' : 'No Questions Generated',
                description: language === 'ar' ? 'لم يتمكن الذكاء الاصطناعي من توليد أسئلة من المحتوى المقدم.' : 'The AI could not generate questions from the provided content.',
            });
        }

    } catch(e: any) {
        console.error(e);
        toast({
            variant: 'destructive',
            title: language === 'ar' ? 'حدث خطأ' : 'An Error Occurred',
            description: e.message || (language === 'ar' ? 'فشل الاتصال بمساعد الذكاء الاصطناعي.' : 'Failed to connect to the AI assistant.'),
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
            variant: 'destructive',
            title: language === 'ar' ? 'الملف كبير جدًا' : 'File Too Large',
            description: language === 'ar' ? 'الرجاء اختيار ملف أصغر من 4 ميجابايت.' : 'Please choose a file smaller than 4MB.',
        });
        return;
      }
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        toast({
            variant: 'destructive',
            title: language === 'ar' ? 'نوع ملف غير صالح' : 'Invalid File Type',
            description: language === 'ar' ? 'الرجاء اختيار ملف صورة أو PDF فقط.' : 'Please select an image or PDF file only.',
        });
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };


  return (
    <Card className="w-full h-full flex flex-col bg-transparent border-none shadow-none">
      <CardContent className="flex-grow flex flex-col gap-4 p-0">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label className="text-sm font-medium text-center text-muted-foreground w-full block">{language === 'ar' ? 'صعوبة الأسئلة' : 'Question Difficulty'}</Label>
                <RadioGroup value={difficulty} onValueChange={(v) => setDifficulty(v as any)} className="flex justify-center gap-4">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="easy" id="q-easy" />
                        <Label htmlFor="q-easy">{language === 'ar' ? 'سهل' : 'Easy'}</Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="medium" id="q-medium" />
                        <Label htmlFor="q-medium">{language === 'ar' ? 'متوسط' : 'Medium'}</Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="hard" id="q-hard" />
                        <Label htmlFor="q-hard">{language === 'ar' ? 'صعب' : 'Hard'}</Label>
                    </div>
                </RadioGroup>
            </div>
             <div className="space-y-2">
                <Label className="text-sm font-medium text-center text-muted-foreground w-full block">{language === 'ar' ? 'لغة الأسئلة' : 'Question Language'}</Label>
                <RadioGroup value={language} onValueChange={(v) => setLanguage(v as 'ar' | 'en')} className="flex justify-center gap-4">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="ar" id="lang-ar-q" />
                        <Label htmlFor="lang-ar-q">العربية</Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="en" id="lang-en-q" />
                        <Label htmlFor="lang-en-q">English</Label>
                    </div>
                </RadioGroup>
            </div>
        </div>

        <div className="space-y-2">
            <Label htmlFor="question-count" className="text-sm font-medium text-center text-muted-foreground w-full block">{language === 'ar' ? 'عدد الأسئلة' : 'Number of Questions'}</Label>
            <Input 
                id="question-count"
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.max(1, Number(e.target.value)))}
                min="1"
                className="w-24 mx-auto bg-background/80 border-2 border-white/10 focus:border-primary text-center"
            />
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="context-text" className="text-muted-foreground">{language === 'ar' ? 'أدخل النص هنا أو ارفع ملفًا بالأسفل' : 'Enter text here or upload a file below'}</Label>
            <Textarea
                id="context-text"
                placeholder={language === 'ar' ? 'المحتوى الذي سيتم توليد الأسئلة منه...' : 'The content from which questions will be generated...'}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="h-32 bg-background/50"
                disabled={isLoading}
            />
        </div>

        <div className="flex items-center gap-4">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
            <Button variant="outline" className="w-full" onClick={triggerFileUpload} disabled={isLoading}>
                <Upload className="ml-2 h-4 w-4" />
                {language === 'ar' ? 'رفع ملف (صورة أو PDF)' : 'Upload File (Image or PDF)'}
            </Button>
        </div>

        {selectedFile && (
            <Badge variant="secondary" className="flex items-center justify-between p-2 text-sm">
                <div className="flex items-center gap-2">
                    {selectedFile.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                    <span>{selectedFile.name}</span>
                </div>
                <button onClick={() => setSelectedFile(null)} className="mr-auto text-destructive hover:text-destructive/80">&times;</button>
          </Badge>
        )}

        <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <HelpCircle className="ml-2" />}
            {isLoading ? (language === 'ar' ? 'جاري توليد الأسئلة...' : 'Generating...') : (language === 'ar' ? 'توليد الأسئلة' : 'Generate Questions')}
        </Button>

        <ScrollArea className="flex-grow h-[24rem] w-full bg-background/50 rounded-lg border border-white/10 p-4 mt-4">
          <div className="space-y-4">
            {generatedQuestions.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-16">
                <Sparkles className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold text-foreground">{language === 'ar' ? 'مولد الأسئلة الذكي' : 'Smart Question Generator'}</h3>
                <p className="text-sm">{language === 'ar' ? 'سيتم عرض أسئلتك هنا بعد إنشائها.' : 'Your questions will be displayed here after generation.'}</p>
              </div>
            )}
             {isLoading && (
                <div className="flex items-center justify-center pt-16">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
             )}
            {generatedQuestions.length > 0 && (
                <Accordion type="single" collapsible className="w-full space-y-3">
                    {generatedQuestions.map((q, index) => (
                        <AccordionItem value={`item-${index}`} key={index} className="border-none">
                            <div className="bg-muted/20 border border-white/10 rounded-lg shadow-sm transition-all duration-300">
                                <AccordionTrigger className="text-base font-semibold px-4 py-3 hover:no-underline text-right" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                   {`${index + 1}. ${q.question}`}
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-3 pt-2 pb-4 px-4 text-right" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                        <p><span className="font-bold text-primary">{language === 'ar' ? 'الإجابة الصحيحة:' : 'Correct Answer:'}</span> {q.answer}</p>
                                        <p className="text-sm text-muted-foreground"><span className="font-bold text-primary/80">{language === 'ar' ? 'الشرح:' : 'Explanation:'}</span> {q.explanation}</p>
                                    </div>
                                </AccordionContent>
                            </div>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
          </div>
        </ScrollArea>
        
      </CardContent>
    </Card>
  );
}
