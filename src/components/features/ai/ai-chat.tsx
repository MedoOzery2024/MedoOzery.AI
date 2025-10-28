'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Send, Bot, User, FileText, Image as ImageIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { chat, type ChatInput } from '@/ai/flows/chat';


interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

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


export function AiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'explain' | 'solve' | 'generate'>('explain');
  const [questionDifficulty, setQuestionDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedFile) return;

    const userMessageText = input;
    const userMessage: Message = { id: Date.now().toString(), text: userMessageText, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');
    const currentFile = selectedFile;
    setSelectedFile(null);

    try {
        let fileDataUri: string | undefined = undefined;
        if (currentFile) {
            fileDataUri = await fileToDataUri(currentFile);
        }

        const chatInput: ChatInput = {
            task: activeTab,
            message: userMessageText,
            fileDataUri: fileDataUri,
            ...(activeTab === 'generate' && { difficulty: questionDifficulty }),
        };

        const result = await chat(chatInput);

        const botResponse: Message = { id: (Date.now() + 1).toString(), text: result.response, sender: 'bot' };
        setMessages(prev => [...prev, botResponse]);

    } catch(e: any) {
        console.error(e);
        const errorResponse: Message = { id: (Date.now() + 1).toString(), text: 'عذراً، حدث خطأ أثناء معالجة طلبك.', sender: 'bot' };
        setMessages(prev => [...prev, errorResponse]);
        toast({
            variant: 'destructive',
            title: 'حدث خطأ',
            description: e.message || 'فشل الاتصال بمساعد الذكاء الاصطناعي.',
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setSelectedFile(file);
        setInput(prev => prev ? `${prev} | ${file.name}` : file.name);
      } else {
        toast({
            variant: 'destructive',
            title: 'نوع ملف غير صالح',
            description: 'الرجاء اختيار ملف صورة أو PDF فقط.',
        });
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };


  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot />
          مساعد الذكاء الاصطناعي
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="explain">شرح المحتوى</TabsTrigger>
                <TabsTrigger value="solve">حل سؤال</TabsTrigger>
                <TabsTrigger value="generate">عمل أسئلة</TabsTrigger>
            </TabsList>
            <TabsContent value="generate" className="pt-2">
                 <Label className="mb-2 block text-sm font-medium text-center">اختر مستوى صعوبة الأسئلة:</Label>
                <RadioGroup defaultValue="medium" value={questionDifficulty} onValueChange={(value) => setQuestionDifficulty(value as any)} className="flex justify-center gap-4">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="easy" id="r1" />
                        <Label htmlFor="r1">سهل</Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="medium" id="r2" />
                        <Label htmlFor="r2">متوسط</Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="hard" id="r3" />
                        <Label htmlFor="r3">صعب</Label>
                    </div>
                </RadioGroup>
            </TabsContent>
        </Tabs>

        <ScrollArea className="flex-grow h-96 w-full rounded-md border p-4">
          <div className="space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                 {msg.sender === 'bot' && (
                    <Avatar className="h-8 w-8">
                        <AvatarFallback><Bot /></AvatarFallback>
                    </Avatar>
                 )}
                <div className={`rounded-lg px-4 py-2 max-w-[80%] ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
                 {msg.sender === 'user' && (
                    <Avatar className="h-8 w-8">
                        <AvatarFallback><User /></AvatarFallback>
                    </Avatar>
                 )}
              </div>
            ))}
             {isLoading && (
                <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback><Bot /></AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg px-4 py-2 bg-muted">
                        <div className="flex items-center gap-2 text-sm">
                            <div className="h-2 w-2 bg-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="h-2 w-2 bg-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="h-2 w-2 bg-foreground rounded-full animate-bounce"></div>
                        </div>
                    </div>
                </div>
             )}
          </div>
        </ScrollArea>
        
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="اسأل أو صف الملف..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isLoading && handleSendMessage()}
            disabled={isLoading}
            className="flex-grow"
          />
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
          <Button variant="outline" size="icon" onClick={triggerFileUpload} disabled={isLoading}>
            <Upload className="h-5 w-5" />
          </Button>
          <Button onClick={handleSendMessage} disabled={isLoading}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
        {selectedFile && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md">
            {selectedFile.type.startsWith('image/') ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            <span>{selectedFile.name}</span>
            <button onClick={() => { setSelectedFile(null); setInput(input.split(' | ')[0]); }} className="mr-auto text-destructive hover:text-destructive/80">&times;</button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
