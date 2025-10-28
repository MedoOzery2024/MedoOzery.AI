'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, Image as ImageIcon, Sparkles, Loader2, HelpCircle, CheckCircle, XCircle } from 'lucide-react';
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

type QuestionType = 'static' | 'interactive';

export function QuestionGenerator() {
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [questionType, setQuestionType] = useState<QuestionType>('static');
  const [generatedOutput, setGeneratedOutput] = useState<GenerateQuestionsOutput>({});
  const [userAnswers, setUserAnswers] = useState<{[key: number]: number}>({});
  const [showResults, setShowResults] = useState(false);
  
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
    setGeneratedOutput({});
    setUserAnswers({});
    setShowResults(false);
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
            questionType: questionType,
        };

        const result = await generateQuestions(input);
        setGeneratedOutput(result);
        if((result.staticQuestions?.length ?? 0) === 0 && (result.interactiveQuestions?.length ?? 0) === 0){
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

  const handleAnswerChange = (questionIndex: number, answerIndex: number) => {
      setUserAnswers(prev => ({...prev, [questionIndex]: answerIndex}));
  }

  const calculateScore = () => {
      let score = 0;
      generatedOutput.interactiveQuestions?.forEach((q, index) => {
          if(userAnswers[index] === q.correctAnswerIndex) {
              score++;
          }
      });
      return score;
  }
  
  const score = calculateScore();
  const allQuestionsAnswered = generatedOutput.interactiveQuestions && Object.keys(userAnswers).length === generatedOutput.interactiveQuestions.length;


  return (
    <Card className="w-full h-full flex flex-col bg-transparent border-none shadow-none">
      <CardContent className="flex-grow flex flex-col gap-4 p-0">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label className="text-sm font-medium text-center text-muted-foreground w-full block">{language === 'ar' ? 'نوع الأسئلة' : 'Question Type'}</Label>
                <RadioGroup value={questionType} onValueChange={(v) => setQuestionType(v as any)} className="flex justify-center gap-4">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="static" id="q-type-static" />
                        <Label htmlFor="q-type-static">{language === 'ar' ? 'عرض مع الشرح' : 'Static'}</Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="interactive" id="q-type-interactive" />
                        <Label htmlFor="q-type-interactive">{language === 'ar' ? 'اختبار تفاعلي' : 'Interactive'}</Label>
                    </div>
                </RadioGroup>
            </div>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <ScrollArea className="flex-grow h-[32rem] w-full bg-background/50 rounded-lg border border-white/10 p-4 mt-4">
          <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            {Object.keys(generatedOutput).length === 0 && !isLoading && (
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
            
            {/* Static Questions Display */}
            {generatedOutput.staticQuestions && generatedOutput.staticQuestions.length > 0 && (
                <Accordion type="single" collapsible className="w-full space-y-3">
                    {generatedOutput.staticQuestions.map((q, index) => (
                        <AccordionItem value={`item-${index}`} key={index} className="border-none">
                            <div className="bg-muted/20 border border-white/10 rounded-lg shadow-sm transition-all duration-300">
                                <AccordionTrigger className="text-base font-semibold px-4 py-3 hover:no-underline text-right">
                                   {`${index + 1}. ${q.question}`}
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-3 pt-2 pb-4 px-4 text-right">
                                        <p><span className="font-bold text-primary">{language === 'ar' ? 'الإجابة الصحيحة:' : 'Correct Answer:'}</span> {q.answer}</p>
                                        <p className="text-sm text-muted-foreground"><span className="font-bold text-primary/80">{language === 'ar' ? 'الشرح:' : 'Explanation:'}</span> {q.explanation}</p>
                                    </div>
                                </AccordionContent>
                            </div>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}

            {/* Interactive Questions Display */}
            {generatedOutput.interactiveQuestions && generatedOutput.interactiveQuestions.length > 0 && !showResults && (
                <div className="space-y-6">
                    {generatedOutput.interactiveQuestions.map((q, qIndex) => (
                        <div key={qIndex} className="bg-muted/20 border border-white/10 rounded-lg p-4">
                            <p className="font-semibold mb-3">{`${qIndex + 1}. ${q.question}`}</p>
                            <RadioGroup onValueChange={(value) => handleAnswerChange(qIndex, parseInt(value))} value={userAnswers[qIndex]?.toString()}>
                                {q.options.map((option, oIndex) => (
                                    <div key={oIndex} className="flex items-center space-x-2 rtl:space-x-reverse">
                                        <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
                                        <Label htmlFor={`q${qIndex}-o${oIndex}`}>{option}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    ))}
                    <Button onClick={() => setShowResults(true)} disabled={!allQuestionsAnswered} className="w-full">
                        {language === 'ar' ? 'عرض النتيجة' : 'Show Results'}
                    </Button>
                </div>
            )}
            
            {/* Interactive Questions Results */}
            {generatedOutput.interactiveQuestions && showResults && (
                <div className="space-y-6">
                    <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary/50">
                        <h3 className="text-xl font-bold text-primary">{language === 'ar' ? 'نتيجتك' : 'Your Result'}</h3>
                        <p className="text-2xl font-bold">{score} / {generatedOutput.interactiveQuestions.length}</p>
                    </div>
                    {generatedOutput.interactiveQuestions.map((q, qIndex) => {
                        const userAnswer = userAnswers[qIndex];
                        const isCorrect = userAnswer === q.correctAnswerIndex;
                        return (
                            <div key={qIndex} className={`border rounded-lg p-4 ${isCorrect ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                                <p className="font-semibold mb-3">{`${qIndex + 1}. ${q.question}`}</p>
                                <div className="space-y-2">
                                {q.options.map((option, oIndex) => {
                                    const isUserChoice = userAnswer === oIndex;
                                    const isCorrectChoice = q.correctAnswerIndex === oIndex;
                                    return (
                                        <div key={oIndex} className={`flex items-center gap-2 p-2 rounded-md ${isCorrectChoice ? 'bg-green-500/20' : ''} ${isUserChoice && !isCorrectChoice ? 'bg-red-500/20' : ''}`}>
                                            {isCorrectChoice && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />}
                                            {isUserChoice && !isCorrectChoice && <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                                            {!isCorrectChoice && !isUserChoice && <div className="w-5 h-5 flex-shrink-0"></div>}
                                            <span className={`${isCorrectChoice ? 'font-bold' : ''}`}>{option}</span>
                                        </div>
                                    )
                                })}
                                </div>
                                <p className="text-sm mt-3 pt-3 border-t border-white/10 text-muted-foreground"><span className="font-bold text-primary/80">{language === 'ar' ? 'الشرح:' : 'Explanation:'}</span> {q.explanation}</p>
                            </div>
                        )
                    })}
                     <Button onClick={handleGenerate} className="w-full">
                        {language === 'ar' ? 'البدء من جديد' : 'Start Over'}
                    </Button>
                </div>
            )}

          </div>
        </ScrollArea>
        
      </CardContent>
    </Card>
  );
}
